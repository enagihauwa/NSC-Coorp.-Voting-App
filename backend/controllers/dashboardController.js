const { query } = require('../config/database');

const getDashboard = async (req, res) => {
  try {
    const totalMembersResult = await query('SELECT COUNT(*) as count FROM members');
    const totalActiveResult = await query('SELECT COUNT(*) as count FROM members WHERE status = $1', ['active']);
    const votedResult = await query('SELECT COUNT(*) as count FROM members WHERE has_voted = TRUE');
    const pendingResult = await query('SELECT COUNT(*) as count FROM members WHERE status = $1 AND has_voted = FALSE', ['active']);

    const totalMembers = parseInt(totalMembersResult.rows[0].count, 10);
    const totalActive = parseInt(totalActiveResult.rows[0].count, 10);
    const totalVoted = parseInt(votedResult.rows[0].count, 10);
    const totalPending = parseInt(pendingResult.rows[0].count, 10);

    const turnout = totalActive > 0
      ? parseFloat(((totalVoted / totalActive) * 100).toFixed(2))
      : 0;

    const recentVotesResult = await query(
      `SELECT v.id, m.fullname as member_name, m.staff_number, p.name as position_name, 
              c.fullname as candidate_name, v.created_at, v.status, v.rejection_reason
       FROM votes v
       JOIN members m ON v.member_id = m.id
       JOIN positions p ON v.position_id = p.id
       JOIN candidates c ON v.candidate_id = c.id
       ORDER BY v.created_at DESC
       LIMIT 10`
    );

    const totalPositionsResult = await query('SELECT COUNT(*) as count FROM positions');
    const totalPositions = parseInt(totalPositionsResult.rows[0].count, 10);

    const positionsWithVotesResult = await query(
      `SELECT p.id, p.name, COUNT(v.id) as vote_count
       FROM positions p
       LEFT JOIN votes v ON p.id = v.position_id
       GROUP BY p.id, p.name
       ORDER BY p.id`
    );

    const electionProgress = totalPositions > 0
      ? parseFloat(((positionsWithVotesResult.rows.filter(r => parseInt(r.vote_count, 10) > 0).length / totalPositions) * 100).toFixed(2))
      : 0;

    const locationStatsResult = await query(
      `SELECT m.location, COUNT(DISTINCT m.id) as total, COUNT(DISTINCT CASE WHEN m.has_voted THEN m.id END) as voted
       FROM members m
       WHERE m.location IS NOT NULL AND m.location != ''
       GROUP BY m.location
       ORDER BY total DESC`
    );

    return res.json({
      success: true,
      data: {
        members: {
          total: totalMembers,
          active: totalActive,
          voted: totalVoted,
          pending: totalPending,
        },
        turnout_percentage: turnout,
        election_progress: electionProgress,
        recent_votes: recentVotesResult.rows,
        positions: positionsWithVotesResult.rows,
        location_stats: locationStatsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

module.exports = { getDashboard };
