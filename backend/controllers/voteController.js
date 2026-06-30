const { query, pool } = require('../config/database');
const path = require('path');
const fs = require('fs');

const submit = async (req, res) => {
  const client = await pool.connect();

  try {
    const { votes, photo } = req.body;

    if (!votes || !Array.isArray(votes) || votes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Votes array is required and must not be empty.',
      });
    }

    const memberId = votes[0].member_id;

    const memberResult = await client.query(
      'SELECT * FROM members WHERE id = $1',
      [memberId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Member not found.',
      });
    }

    const member = memberResult.rows[0];

    if (member.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Your account is not active. Cannot submit votes.',
      });
    }

    if (member.has_voted) {
      return res.status(403).json({
        success: false,
        error: 'You have already voted. Duplicate votes are not allowed.',
      });
    }

    const positionsResult = await client.query('SELECT id, name FROM positions');
    const totalPositions = positionsResult.rows.length;

    if (totalPositions === 0) {
      return res.status(400).json({
        success: false,
        error: 'No positions are available for voting.',
      });
    }

    const submittedPositionIds = votes.map((v) => v.position_id);
    const uniquePositions = [...new Set(submittedPositionIds)];

    if (uniquePositions.length !== votes.length) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate position votes detected. Each position can only have one vote.',
      });
    }

    if (uniquePositions.length !== totalPositions) {
      return res.status(400).json({
        success: false,
        error: `You must vote for all ${totalPositions} positions. You submitted votes for ${uniquePositions.length} positions.`,
      });
    }

    for (const vote of votes) {
      const { position_id, candidate_id } = vote;

      const candidateResult = await client.query(
        'SELECT id, position_id, status FROM candidates WHERE id = $1',
        [candidate_id]
      );

      if (candidateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Candidate with ID ${candidate_id} not found.`,
        });
      }

      const candidate = candidateResult.rows[0];

      if (candidate.position_id !== position_id) {
        return res.status(400).json({
          success: false,
          error: `Candidate ID ${candidate_id} does not belong to position ID ${position_id}.`,
        });
      }

      if (candidate.status !== 'active') {
        return res.status(400).json({
          success: false,
          error: `Candidate ID ${candidate_id} is not active.`,
        });
      }
    }

    let photoFilename = null;
    if (photo) {
      const uploadDir = process.env.UPLOAD_PATH || path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const matches = photo.match(/^data:image\/(\w+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        photoFilename = `voter_${memberId}_${Date.now()}.${ext}`;
        const buffer = Buffer.from(matches[2], 'base64');
        fs.writeFileSync(path.join(uploadDir, photoFilename), buffer);
      }
    }

    await client.query('BEGIN');

    for (const vote of votes) {
      await client.query(
        `INSERT INTO votes (member_id, position_id, candidate_id, location, voter_photo, status) 
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [memberId, vote.position_id, vote.candidate_id, member.location || null, photoFilename]
      );
    }

    await client.query(
      'UPDATE members SET has_voted = TRUE WHERE id = $1',
      [memberId]
    );

    await client.query('COMMIT');

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [null, 'VOTE_SUBMIT', `Member #${memberId} (${member.staff_number}) cast ${votes.length} vote(s)`, req.ip]
    );

    return res.status(201).json({
      success: true,
      data: {
        message: 'Votes submitted successfully.',
        member_id: memberId,
        votes_cast: votes.length,
        photo: photoFilename,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Submit vote error:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'You have already voted for one or more positions.',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  } finally {
    client.release();
  }
};

const getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;
    const location = req.query.location || '';
    const positionId = req.query.position_id || '';
    const fromDate = req.query.from_date || '';
    const toDate = req.query.to_date || '';

    let whereClause = [];
    let params = [];
    let paramIndex = 1;

    if (location) {
      whereClause.push(`v.location = $${paramIndex}`);
      params.push(location);
      paramIndex++;
    }

    if (positionId) {
      whereClause.push(`v.position_id = $${paramIndex}`);
      params.push(parseInt(positionId, 10));
      paramIndex++;
    }

    if (fromDate) {
      whereClause.push(`v.created_at >= $${paramIndex}`);
      params.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      whereClause.push(`v.created_at <= $${paramIndex}`);
      params.push(toDate);
      paramIndex++;
    }

    const whereStr = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM votes v ${whereStr}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit);
    params.push(offset);

    const result = await query(
      `SELECT v.*, m.fullname as member_name, m.staff_number, 
              p.name as position_name, c.fullname as candidate_name
       FROM votes v
       JOIN members m ON v.member_id = m.id
       JOIN positions p ON v.position_id = p.id
       JOIN candidates c ON v.candidate_id = c.id
       ${whereStr}
       ORDER BY v.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get votes error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

const verifyAll = async (req, res) => {
  try {
    const { memberId } = req.params;

    const result = await query(
      `UPDATE votes SET status = 'verified' WHERE member_id = $1 AND status = 'pending' RETURNING *`,
      [memberId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No pending votes found for this voter.' });
    }

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [req.admin.id, 'VOTE_VERIFY', `Member #${memberId}: ${result.rows.length} vote(s) verified by admin #${req.admin.id}`, req.ip]
    );

    return res.json({ success: true, data: { member_id: parseInt(memberId, 10), verified: result.rows.length } });
  } catch (error) {
    console.error('Verify all votes error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const rejectAll = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required.' });
    }

    const result = await query(
      `UPDATE votes SET status = 'rejected', rejection_reason = $1 WHERE member_id = $2 AND status = 'pending' RETURNING *`,
      [reason.trim(), memberId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No pending votes found for this voter.' });
    }

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [req.admin.id, 'VOTE_REJECT', `Member #${memberId}: ${result.rows.length} vote(s) rejected by admin #${req.admin.id}. Reason: ${reason.trim()}`, req.ip]
    );

    return res.json({ success: true, data: { member_id: parseInt(memberId, 10), rejected: result.rows.length } });
  } catch (error) {
    console.error('Reject all votes error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const getVerified = async (req, res) => {
  try {
    const verifiedResult = await query(
      `SELECT p.id as position_id, p.name as position_name,
              c.fullname as candidate_name, c.photo as candidate_photo,
              COUNT(v.id) as vote_count
       FROM votes v
       JOIN positions p ON v.position_id = p.id
       JOIN candidates c ON v.candidate_id = c.id
       WHERE v.status = 'verified'
       GROUP BY p.id, p.name, c.id, c.fullname, c.photo
       ORDER BY p.id, vote_count DESC`
    );

    const rejectedCountResult = await query(
      `SELECT COUNT(*) as count FROM votes WHERE status = 'rejected'`
    );

    const positions = {};
    verifiedResult.rows.forEach((row) => {
      if (!positions[row.position_id]) {
        positions[row.position_id] = {
          position_id: row.position_id,
          position_name: row.position_name,
          total_votes: 0,
          candidates: [],
        };
      }
      positions[row.position_id].candidates.push({
        fullname: row.candidate_name,
        photo: row.candidate_photo,
        vote_count: parseInt(row.vote_count, 10),
      });
      positions[row.position_id].total_votes += parseInt(row.vote_count, 10);
    });

    return res.json({
      success: true,
      data: {
        positions: Object.values(positions),
        rejected: parseInt(rejectedCountResult.rows[0].count, 10),
      },
    });
  } catch (error) {
    console.error('Get verified votes error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const getByMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    const memberResult = await query('SELECT * FROM members WHERE id = $1', [memberId]);
    if (memberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Member not found.',
      });
    }

    const result = await query(
      `SELECT v.*, p.name as position_name, c.fullname as candidate_name, c.photo as candidate_photo
       FROM votes v
       JOIN positions p ON v.position_id = p.id
       JOIN candidates c ON v.candidate_id = c.id
       WHERE v.member_id = $1
       ORDER BY p.name`,
      [memberId]
    );

    return res.json({
      success: true,
      data: {
        member: memberResult.rows[0],
        votes: result.rows,
      },
    });
  } catch (error) {
    console.error('Get member votes error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

module.exports = { submit, getAll, getByMember, verifyAll, rejectAll, getVerified };
