const { query, pool } = require('../config/database');
const fs = require('fs');
const { emitRunoffUpdated, emitResultsUpdated } = require('../socket/events');
const { saveVoterPhoto, VoterPhotoError } = require('../utils/voterPhoto');

// --- helpers -------------------------------------------------------------

// Flip any 'open' runoff whose window has elapsed to 'closed'. Runoffs are only
// votable while open AND before end_time, so this keeps stored state honest.
const closeExpiredRunoffs = async (runner = query) => {
  await runner(
    `UPDATE runoffs SET status = 'closed' WHERE status = 'open' AND end_time < NOW()`
  );
};

const parseCounts = (rows) =>
  rows.map((r) => ({
    id: r.id,
    fullname: r.fullname,
    photo: r.photo,
    department: r.department,
    location: r.location,
    vote_count: parseInt(r.vote_count, 10),
  }));

// Given candidates sorted by vote_count DESC, work out the winner / tie status.
// A tie only matters when the top score is > 0 and shared by 2+ candidates.
const analyzeTally = (candidates) => {
  if (candidates.length === 0) return { winner: null, tied_candidates: [], still_tied: false };
  const max = candidates[0].vote_count;
  const top = candidates.filter((c) => c.vote_count === max);
  if (max > 0 && top.length >= 2) {
    return { winner: null, tied_candidates: top, still_tied: true };
  }
  return { winner: max > 0 ? candidates[0] : null, tied_candidates: [], still_tied: false };
};

// Verified tally for the main election (round 1) of a position.
const mainElectionTally = async (positionId, runner = query) => {
  const res = await runner(
    `SELECT c.id, c.fullname, c.photo, c.department, c.location, COUNT(v.id) AS vote_count
     FROM candidates c
     LEFT JOIN votes v ON v.candidate_id = c.id AND v.position_id = $1 AND v.status = 'verified'
     WHERE c.position_id = $1
     GROUP BY c.id, c.fullname, c.photo, c.department, c.location
     ORDER BY vote_count DESC, c.id ASC`,
    [positionId]
  );
  return parseCounts(res.rows);
};

// Verified tally for a specific runoff round.
const runoffTally = async (runoffId, runner = query) => {
  const res = await runner(
    `SELECT c.id, c.fullname, c.photo, c.department, c.location, COUNT(rv.id) AS vote_count
     FROM runoff_candidates rc
     JOIN candidates c ON c.id = rc.candidate_id
     LEFT JOIN runoff_votes rv ON rv.candidate_id = c.id AND rv.runoff_id = $1 AND rv.status = 'verified'
     WHERE rc.runoff_id = $1
     GROUP BY c.id, c.fullname, c.photo, c.department, c.location
     ORDER BY vote_count DESC, c.id ASC`,
    [runoffId]
  );
  return parseCounts(res.rows);
};

// --- admin: tie detection ------------------------------------------------

const getTieCandidates = async (req, res) => {
  try {
    await closeExpiredRunoffs();

    const positions = await query('SELECT id, name FROM positions ORDER BY id');
    const ties = [];

    for (const position of positions.rows) {
      const latest = await query(
        `SELECT id, round_number, status FROM runoffs
         WHERE position_id = $1 ORDER BY round_number DESC LIMIT 1`,
        [position.id]
      );

      const latestRow = latest.rows[0];
      // A runoff is already open for this position — nothing to start.
      if (latestRow && latestRow.status === 'open') continue;

      const candidates = latestRow
        ? await runoffTally(latestRow.id)
        : await mainElectionTally(position.id);
      const { still_tied, tied_candidates } = analyzeTally(candidates);

      if (still_tied) {
        ties.push({
          position_id: position.id,
          position_name: position.name,
          latest_round: latestRow ? latestRow.round_number : 1,
          next_round_number: (latestRow ? latestRow.round_number : 1) + 1,
          tied_candidates,
        });
      }
    }

    return res.json({ success: true, data: ties });
  } catch (error) {
    console.error('Get tie candidates error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

// --- admin: create runoff ------------------------------------------------

const createRunoff = async (req, res) => {
  const client = await pool.connect();
  let started = false;
  try {
    const { position_id, candidate_ids, end_time } = req.body;

    if (!Array.isArray(candidate_ids) || candidate_ids.length < 2) {
      return res.status(400).json({ success: false, error: 'A runoff needs at least two candidates.' });
    }

    const uniqueIds = [...new Set(candidate_ids.map((id) => parseInt(id, 10)))];
    if (uniqueIds.length !== candidate_ids.length) {
      return res.status(400).json({ success: false, error: 'Duplicate candidates are not allowed.' });
    }

    const endDate = new Date(end_time);
    if (Number.isNaN(endDate.getTime()) || endDate.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: 'End time must be a valid future date.' });
    }

    const posRes = await client.query('SELECT id, name FROM positions WHERE id = $1', [position_id]);
    if (posRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Position not found.' });
    }

    // All candidates must be active and belong to this position.
    const candRes = await client.query(
      `SELECT id FROM candidates WHERE id = ANY($1::int[]) AND position_id = $2 AND status = 'active'`,
      [uniqueIds, position_id]
    );
    if (candRes.rows.length !== uniqueIds.length) {
      return res.status(400).json({
        success: false,
        error: 'All candidates must be active and belong to the selected position.',
      });
    }

    await client.query('BEGIN');
    started = true;

    const roundRes = await client.query(
      `SELECT COALESCE(MAX(round_number), 1) + 1 AS next FROM runoffs WHERE position_id = $1`,
      [position_id]
    );
    const roundNumber = roundRes.rows[0].next;

    const runoffRes = await client.query(
      `INSERT INTO runoffs (position_id, round_number, status, end_time, created_by)
       VALUES ($1, $2, 'open', $3, $4) RETURNING *`,
      [position_id, roundNumber, endDate.toISOString(), req.admin.id]
    );
    const runoff = runoffRes.rows[0];

    for (const candidateId of uniqueIds) {
      await client.query(
        `INSERT INTO runoff_candidates (runoff_id, candidate_id) VALUES ($1, $2)`,
        [runoff.id, candidateId]
      );
    }

    await client.query('COMMIT');
    started = false;

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address) VALUES ($1, $2, $3, $4)`,
      [
        req.admin.id,
        'RUNOFF_CREATE',
        `Runoff round ${roundNumber} opened for position #${position_id} (${posRes.rows[0].name}) with ${uniqueIds.length} candidates. Ends ${endDate.toISOString()}`,
        req.ip,
      ]
    );

    emitRunoffUpdated({ runoff_id: runoff.id, position_id, status: 'open', source: 'create' });
    emitResultsUpdated({ source: 'runoff:create' });

    return res.status(201).json({ success: true, data: runoff });
  } catch (error) {
    if (started) await client.query('ROLLBACK');
    // Partial unique index: only one open runoff per position.
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: 'A runoff is already open for this position.' });
    }
    console.error('Create runoff error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  } finally {
    client.release();
  }
};

// --- public: active runoffs ---------------------------------------------

const loadRunoffCandidates = async (runoffId) => {
  const res = await query(
    `SELECT c.id, c.fullname, c.photo, c.department, c.location
     FROM runoff_candidates rc JOIN candidates c ON c.id = rc.candidate_id
     WHERE rc.runoff_id = $1 ORDER BY c.id ASC`,
    [runoffId]
  );
  return res.rows;
};

const getActiveRunoffs = async (req, res) => {
  try {
    await closeExpiredRunoffs();

    const runoffs = await query(
      `SELECT r.id, r.position_id, r.round_number, r.start_time, r.end_time, p.name AS position_name
       FROM runoffs r JOIN positions p ON p.id = r.position_id
       WHERE r.status = 'open' ORDER BY r.position_id`
    );

    const data = [];
    for (const r of runoffs.rows) {
      data.push({ ...r, candidates: await loadRunoffCandidates(r.id) });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Get active runoffs error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const getRunoffById = async (req, res) => {
  try {
    await closeExpiredRunoffs();
    const { runoffId } = req.params;

    const runoffRes = await query(
      `SELECT r.*, p.name AS position_name FROM runoffs r
       JOIN positions p ON p.id = r.position_id WHERE r.id = $1`,
      [runoffId]
    );
    if (runoffRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Runoff not found.' });
    }

    const runoff = runoffRes.rows[0];
    const isOpen = runoff.status === 'open' && new Date(runoff.end_time).getTime() > Date.now();

    return res.json({
      success: true,
      data: { ...runoff, is_open: isOpen, candidates: await loadRunoffCandidates(runoff.id) },
    });
  } catch (error) {
    console.error('Get runoff error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

// --- public: submit a runoff vote ---------------------------------------

const submitRunoffVote = async (req, res) => {
  const client = await pool.connect();
  let started = false;
  let photoFilePath = null;
  try {
    const { runoffId } = req.params;
    const { member_id, candidate_id, photo } = req.body;

    await closeExpiredRunoffs(client.query.bind(client));

    const runoffRes = await client.query('SELECT * FROM runoffs WHERE id = $1', [runoffId]);
    if (runoffRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Runoff not found.' });
    }
    const runoff = runoffRes.rows[0];
    const isOpen = runoff.status === 'open' && new Date(runoff.end_time).getTime() > Date.now();
    if (!isOpen) {
      return res.status(403).json({ success: false, error: 'This runoff is closed. Vote submission is not allowed.' });
    }

    const memberRes = await client.query('SELECT * FROM members WHERE id = $1', [member_id]);
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found.' });
    }
    const member = memberRes.rows[0];
    if (member.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Your account is not active. Cannot submit votes.' });
    }

    const already = await client.query(
      'SELECT id FROM runoff_votes WHERE runoff_id = $1 AND member_id = $2',
      [runoffId, member_id]
    );
    if (already.rows.length > 0) {
      return res.status(403).json({ success: false, error: 'You have already voted in this runoff.' });
    }

    const candRes = await client.query(
      'SELECT id FROM runoff_candidates WHERE runoff_id = $1 AND candidate_id = $2',
      [runoffId, candidate_id]
    );
    if (candRes.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Selected candidate is not part of this runoff.' });
    }

    let photoFilename = null;
    if (photo) {
      let saved;
      try {
        saved = saveVoterPhoto(photo, member_id, 'runoff');
      } catch (err) {
        if (err instanceof VoterPhotoError) {
          return res.status(400).json({ success: false, error: err.message });
        }
        throw err;
      }
      photoFilename = saved.filename;
      photoFilePath = saved.filePath;
    }

    await client.query('BEGIN');
    started = true;

    await client.query(
      `INSERT INTO runoff_votes (runoff_id, member_id, candidate_id, location, voter_photo, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [runoffId, member_id, candidate_id, member.location || null, photoFilename]
    );

    await client.query('COMMIT');
    started = false;

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address) VALUES ($1, $2, $3, $4)`,
      [null, 'RUNOFF_VOTE_SUBMIT', `Member #${member_id} (${member.staff_number}) cast a runoff vote (runoff #${runoffId})`, req.ip]
    );

    emitRunoffUpdated({ runoff_id: parseInt(runoffId, 10), member_id, status: 'pending', source: 'vote' });

    return res.status(201).json({ success: true, data: { message: 'Runoff vote submitted successfully.', runoff_id: parseInt(runoffId, 10) } });
  } catch (error) {
    if (started) await client.query('ROLLBACK');
    if (photoFilePath && fs.existsSync(photoFilePath)) fs.unlinkSync(photoFilePath);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: 'You have already voted in this runoff.' });
    }
    console.error('Submit runoff vote error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  } finally {
    client.release();
  }
};

// --- admin: verification queue ------------------------------------------

const getRunoffVotes = async (req, res) => {
  try {
    const { runoffId } = req.params;
    const result = await query(
      `SELECT rv.id, rv.member_id, rv.candidate_id, rv.location, rv.voter_photo, rv.status,
              rv.rejection_reason, rv.created_at,
              m.fullname AS member_name, m.staff_number,
              c.fullname AS candidate_name, c.department AS candidate_department, c.location AS candidate_location
       FROM runoff_votes rv
       JOIN members m ON m.id = rv.member_id
       JOIN candidates c ON c.id = rv.candidate_id
       WHERE rv.runoff_id = $1
       ORDER BY rv.created_at DESC`,
      [runoffId]
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get runoff votes error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const verifyRunoffVote = async (req, res) => {
  try {
    const { runoffId, memberId } = req.params;
    const result = await query(
      `UPDATE runoff_votes SET status = 'verified'
       WHERE runoff_id = $1 AND member_id = $2 AND status = 'pending' RETURNING *`,
      [runoffId, memberId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No pending runoff vote found for this voter.' });
    }

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address) VALUES ($1, $2, $3, $4)`,
      [req.admin.id, 'RUNOFF_VOTE_VERIFY', `Runoff #${runoffId}: member #${memberId} vote verified by admin #${req.admin.id}`, req.ip]
    );

    emitRunoffUpdated({ runoff_id: parseInt(runoffId, 10), member_id: parseInt(memberId, 10), status: 'verified' });
    emitResultsUpdated({ source: 'runoff:verify' });

    return res.json({ success: true, data: { runoff_id: parseInt(runoffId, 10), member_id: parseInt(memberId, 10) } });
  } catch (error) {
    console.error('Verify runoff vote error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const rejectRunoffVote = async (req, res) => {
  try {
    const { runoffId, memberId } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required.' });
    }

    const result = await query(
      `UPDATE runoff_votes SET status = 'rejected', rejection_reason = $1
       WHERE runoff_id = $2 AND member_id = $3 AND status = 'pending' RETURNING *`,
      [reason.trim(), runoffId, memberId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No pending runoff vote found for this voter.' });
    }

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address) VALUES ($1, $2, $3, $4)`,
      [req.admin.id, 'RUNOFF_VOTE_REJECT', `Runoff #${runoffId}: member #${memberId} vote rejected by admin #${req.admin.id}. Reason: ${reason.trim()}`, req.ip]
    );

    emitRunoffUpdated({ runoff_id: parseInt(runoffId, 10), member_id: parseInt(memberId, 10), status: 'rejected' });
    emitResultsUpdated({ source: 'runoff:reject' });

    return res.json({ success: true, data: { runoff_id: parseInt(runoffId, 10), member_id: parseInt(memberId, 10) } });
  } catch (error) {
    console.error('Reject runoff vote error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const closeRunoff = async (req, res) => {
  try {
    const { runoffId } = req.params;
    const result = await query(
      `UPDATE runoffs SET status = 'closed' WHERE id = $1 AND status = 'open' RETURNING *`,
      [runoffId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No open runoff found with that ID.' });
    }

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address) VALUES ($1, $2, $3, $4)`,
      [req.admin.id, 'RUNOFF_CLOSE', `Runoff #${runoffId} closed by admin #${req.admin.id}`, req.ip]
    );

    emitRunoffUpdated({ runoff_id: parseInt(runoffId, 10), status: 'closed', source: 'close' });
    emitResultsUpdated({ source: 'runoff:close' });

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Close runoff error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

// --- public + admin: stacked round history ------------------------------

const getPositionRounds = async (req, res) => {
  try {
    await closeExpiredRunoffs();

    const positions = await query('SELECT id, name FROM positions ORDER BY id');
    const data = [];

    for (const position of positions.rows) {
      const rounds = [];

      // Round 1: main election.
      const mainCandidates = await mainElectionTally(position.id);
      const mainAnalysis = analyzeTally(mainCandidates);
      rounds.push({
        round_number: 1,
        label: 'Initial Election',
        runoff_id: null,
        is_open: false,
        end_time: null,
        candidates: mainCandidates,
        total_votes: mainCandidates.reduce((s, c) => s + c.vote_count, 0),
        winner: mainAnalysis.winner,
        still_tied: mainAnalysis.still_tied,
      });

      // Runoff rounds in order.
      const runoffs = await query(
        `SELECT id, round_number, status, end_time FROM runoffs
         WHERE position_id = $1 ORDER BY round_number ASC`,
        [position.id]
      );

      for (const r of runoffs.rows) {
        const candidates = await runoffTally(r.id);
        const analysis = analyzeTally(candidates);
        const isOpen = r.status === 'open' && new Date(r.end_time).getTime() > Date.now();
        rounds.push({
          round_number: r.round_number,
          label: `Runoff ${r.round_number - 1}`,
          runoff_id: r.id,
          is_open: isOpen,
          end_time: r.end_time,
          candidates,
          total_votes: candidates.reduce((s, c) => s + c.vote_count, 0),
          winner: analysis.winner,
          still_tied: analysis.still_tied,
        });
      }

      data.push({ position_id: position.id, position_name: position.name, rounds });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Get position rounds error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

module.exports = {
  getTieCandidates,
  createRunoff,
  getActiveRunoffs,
  getRunoffById,
  submitRunoffVote,
  getRunoffVotes,
  verifyRunoffVote,
  rejectRunoffVote,
  closeRunoff,
  getPositionRounds,
};
