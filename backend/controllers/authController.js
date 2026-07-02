const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await query('SELECT * FROM admin_users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password.',
      });
    }

    const admin = result.rows[0];

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password.',
      });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address) 
       VALUES ($1, $2, $3, $4)`,
      [admin.id, 'LOGIN', `Admin "${admin.username}" logged in`, req.ip]
    );

    return res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          role: admin.role,
          must_change_password: Boolean(admin.must_change_password),
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

const getProfile = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        id: req.admin.id,
        username: req.admin.username,
        role: req.admin.role,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

module.exports = { login, getProfile };
