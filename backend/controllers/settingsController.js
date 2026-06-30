const { query } = require('../config/database');

const getSettings = async (req, res) => {
  try {
    const result = await query('SELECT * FROM election_settings ORDER BY key');

    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }

    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({
        success: false,
        error: 'Value is required.',
      });
    }

    const result = await query(
      `INSERT INTO election_settings (key, value, updated_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, String(value)]
    );

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address) 
       VALUES ($1, $2, $3, $4)`,
      [req.admin.id, 'SETTINGS_UPDATE', `Updated setting "${key}" to "${String(value)}"`, req.ip]
    );

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update setting error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;
    const action = req.query.action || '';
    const adminId = req.query.admin_id || '';

    let whereClause = [];
    let params = [];
    let paramIndex = 1;

    if (action) {
      whereClause.push(`a.action ILIKE $${paramIndex}`);
      params.push(`%${action}%`);
      paramIndex++;
    }

    if (adminId) {
      whereClause.push(`a.admin_id = $${paramIndex}`);
      params.push(parseInt(adminId, 10));
      paramIndex++;
    }

    const whereStr = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM audit_logs a ${whereStr}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit);
    params.push(offset);

    const result = await query(
      `SELECT a.*, u.username as admin_name
       FROM audit_logs a
       LEFT JOIN admin_users u ON a.admin_id = u.id
       ${whereStr}
       ORDER BY a.created_at DESC
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
    console.error('Get activity logs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

module.exports = { getSettings, updateSetting, getActivityLogs };
