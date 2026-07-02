const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const ROLES = {
  SUPERADMIN: 'superadmin',
  ELECTION_OFFICER: 'election_officer',
  AUDITOR: 'auditor',
  ADMIN: 'admin',
};

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query('SELECT id, username, role FROM admin_users WHERE id = $1', [decoded.id]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. Admin not found.',
      });
    }

    req.admin = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token.',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Authentication error.',
    });
  }
};

const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.',
        required_roles: roles,
      });
    }

    next();
  };
};

module.exports = { auth, checkRole, ROLES };
