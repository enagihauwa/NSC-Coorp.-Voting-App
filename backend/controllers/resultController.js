const { query } = require('../config/database');

const getResults = async (req, res) => {
  try {
    const positionsResult = await query('SELECT id, name FROM positions ORDER BY id');

    if (positionsResult.rows.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const results = [];

    for (const position of positionsResult.rows) {
      const votesResult = await query(
        `SELECT c.id, c.fullname, c.photo, COUNT(v.id) as vote_count
         FROM candidates c
         LEFT JOIN votes v ON c.id = v.candidate_id AND v.position_id = $1
         WHERE c.position_id = $1
         GROUP BY c.id, c.fullname, c.photo
         ORDER BY vote_count DESC`,
        [position.id]
      );

      const totalVotesForPosition = votesResult.rows.reduce(
        (sum, row) => sum + parseInt(row.vote_count, 10),
        0
      );

      const candidates = votesResult.rows.map((row) => ({
        id: row.id,
        fullname: row.fullname,
        photo: row.photo,
        vote_count: parseInt(row.vote_count, 10),
        percentage: totalVotesForPosition > 0
          ? parseFloat(((parseInt(row.vote_count, 10) / totalVotesForPosition) * 100).toFixed(2))
          : 0,
      }));

      const winner = candidates.length > 0 && candidates[0].vote_count > 0 ? candidates[0] : null;
      const runnerUp = candidates.length > 1 && candidates[1].vote_count > 0 ? candidates[1] : null;

      const voteDifference = winner && runnerUp
        ? winner.vote_count - runnerUp.vote_count
        : winner
          ? winner.vote_count
          : 0;

      results.push({
        position_id: position.id,
        position_name: position.name,
        total_votes: totalVotesForPosition,
        candidates,
        winner,
        vote_difference: voteDifference,
      });
    }

    return res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Get results error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

const getLocationResults = async (req, res) => {
  try {
    const locationsResult = await query(
      'SELECT DISTINCT location FROM members WHERE location IS NOT NULL AND location != $1 ORDER BY location',
      ['']
    );

    const locations = [];

    for (const loc of locationsResult.rows) {
      const locationName = loc.location;

      const totalVotesResult = await query(
        'SELECT COUNT(*) as count FROM votes WHERE location = $1',
        [locationName]
      );
      const totalVotes = parseInt(totalVotesResult.rows[0].count, 10);

      const positionsResult = await query('SELECT id, name FROM positions ORDER BY id');
      const positionBreakdown = [];

      for (const position of positionsResult.rows) {
        const candidatesResult = await query(
          `SELECT c.fullname, COUNT(v.id) as vote_count
           FROM candidates c
           LEFT JOIN votes v ON c.id = v.candidate_id AND v.position_id = $1 AND v.location = $2
           WHERE c.position_id = $1
           GROUP BY c.id, c.fullname
           ORDER BY vote_count DESC`,
          [position.id, locationName]
        );

        const positionTotal = candidatesResult.reduce(
          (sum, row) => sum + parseInt(row.vote_count, 10),
          0
        );

        positionBreakdown.push({
          position_name: position.name,
          total_votes: positionTotal,
          candidates: candidatesResult.map((r) => ({
            fullname: r.fullname,
            vote_count: parseInt(r.vote_count, 10),
          })),
        });
      }

      locations.push({
        location: locationName,
        total_votes: totalVotes,
        positions: positionBreakdown,
      });
    }

    return res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    console.error('Get location results error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

const getSummary = async (req, res) => {
  try {
    const totalMembersResult = await query('SELECT COUNT(*) as count FROM members WHERE status = $1', ['active']);
    const totalVotesResult = await query('SELECT COUNT(DISTINCT member_id) as count FROM votes');
    const totalPositionsResult = await query('SELECT COUNT(*) as count FROM positions');
    const totalCandidatesResult = await query('SELECT COUNT(*) as count FROM candidates WHERE status = $1', ['active']);

    const totalMembers = parseInt(totalMembersResult.rows[0].count, 10);
    const totalVoters = parseInt(totalVotesResult.rows[0].count, 10);
    const totalPositions = parseInt(totalPositionsResult.rows[0].count, 10);
    const totalCandidates = parseInt(totalCandidatesResult.rows[0].count, 10);

    const turnout = totalMembers > 0
      ? parseFloat(((totalVoters / totalMembers) * 100).toFixed(2))
      : 0;

    const votedWithLocation = await query(
      `SELECT v.location, COUNT(DISTINCT v.member_id) as count
       FROM votes v
       GROUP BY v.location
       ORDER BY count DESC`
    );

    return res.json({
      success: true,
      data: {
        total_members: totalMembers,
        total_voters,
        pending_voters: totalMembers - totalVoters,
        total_positions: totalPositions,
        total_candidates: totalCandidates,
        turnout_percentage: turnout,
        location_breakdown: votedWithLocation.rows.map((r) => ({
          location: r.location || 'Unknown',
          voters: parseInt(r.count, 10),
        })),
        election_completed: totalVoters >= totalMembers,
      },
    });
  } catch (error) {
    console.error('Get summary error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

module.exports = { getResults, getLocationResults, getSummary };
