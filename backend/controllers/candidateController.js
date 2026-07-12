const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

const getAll = async (req, res) => {
  try {
    const positionId = req.query.position_id || '';
    const status = req.query.status || '';
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;

    let whereClause = [];
    let params = [];
    let paramIndex = 1;

    if (positionId) {
      whereClause.push(`c.position_id = $${paramIndex}`);
      params.push(parseInt(positionId, 10));
      paramIndex++;
    }

    if (status) {
      whereClause.push(`c.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereStr = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM (
        SELECT DISTINCT ON (c.fullname, c.position_id) c.id
        FROM candidates c ${whereStr}
      ) sub`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit);
    params.push(offset);

    const result = await query(
      `SELECT DISTINCT ON (c.fullname, c.position_id) c.*, p.name as position_name 
       FROM candidates c 
       JOIN positions p ON c.position_id = p.id 
       ${whereStr} 
       ORDER BY c.fullname, c.position_id, c.id
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
    console.error('Get candidates error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT c.*, p.name as position_name 
       FROM candidates c 
       JOIN positions p ON c.position_id = p.id 
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found.',
      });
    }

    const voteCount = await query(
      "SELECT COUNT(*) as count FROM votes WHERE candidate_id = $1 AND status = 'verified'",
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...result.rows[0],
        total_votes: parseInt(voteCount.rows[0].count, 10),
      },
    });
  } catch (error) {
    console.error('Get candidate error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

const create = async (req, res) => {
  try {
    const { fullname, position_id, manifesto, department, location } = req.body;
    const photo = req.file ? req.file.filename : null;

    const posResult = await query('SELECT id FROM positions WHERE id = $1', [position_id]);
    if (posResult.rows.length === 0) {
      if (photo) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        error: 'Position not found.',
      });
    }

    const result = await query(
      `INSERT INTO candidates (position_id, fullname, photo, manifesto, department, location) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [position_id, fullname, photo, manifesto || null, department || null, location || null]
    );

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address) 
       VALUES ($1, $2, $3, $4)`,
      [req.admin.id, 'CANDIDATE_CREATE', `Created candidate "${fullname}" for position_id ${position_id}`, req.ip]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Create candidate error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, position_id, manifesto, department, location } = req.body;

    const existing = await query('SELECT * FROM candidates WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        error: 'Candidate not found.',
      });
    }

    const candidate = existing.rows[0];

    if (position_id) {
      const posResult = await query('SELECT id FROM positions WHERE id = $1', [position_id]);
      if (posResult.rows.length === 0) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          error: 'Position not found.',
        });
      }
    }

    const newPhoto = req.file ? req.file.filename : candidate.photo;

    if (req.file && candidate.photo) {
      const oldPhotoPath = path.join(process.env.UPLOAD_PATH || 'uploads', candidate.photo);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    const result = await query(
      `UPDATE candidates 
       SET fullname = $1, position_id = $2, photo = $3, manifesto = $4, 
           department = $5, location = $6
       WHERE id = $7 RETURNING *`,
      [
        fullname || candidate.fullname,
        position_id || candidate.position_id,
        newPhoto,
        manifesto !== undefined ? manifesto : candidate.manifesto,
        department !== undefined ? department : candidate.department,
        location !== undefined ? location : candidate.location,
        id,
      ]
    );

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address) 
       VALUES ($1, $2, $3, $4)`,
      [req.admin.id, 'CANDIDATE_UPDATE', `Updated candidate ID ${id}`, req.ip]
    );

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Update candidate error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

const deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT * FROM candidates WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found.',
      });
    }

    const voteCheck = await query('SELECT COUNT(*) as count FROM votes WHERE candidate_id = $1', [id]);
    const voteCount = parseInt(voteCheck.rows[0].count, 10);

    if (voteCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete candidate. They have ${voteCount} vote(s) recorded.`,
      });
    }

    if (existing.rows[0].photo) {
      const photoPath = path.join(process.env.UPLOAD_PATH || 'uploads', existing.rows[0].photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    await query('DELETE FROM candidates WHERE id = $1', [id]);

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address) 
       VALUES ($1, $2, $3, $4)`,
      [req.admin.id, 'CANDIDATE_DELETE', `Deleted candidate ID ${id} ("${existing.rows[0].fullname}")`, req.ip]
    );

    return res.json({
      success: true,
      data: { message: 'Candidate deleted successfully.' },
    });
  } catch (error) {
    console.error('Delete candidate error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT * FROM candidates WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found.',
      });
    }

    const newStatus = existing.rows[0].status === 'active' ? 'inactive' : 'active';

    const result = await query(
      'UPDATE candidates SET status = $1 WHERE id = $2 RETURNING *',
      [newStatus, id]
    );

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address) 
       VALUES ($1, $2, $3, $4)`,
      [req.admin.id, 'CANDIDATE_TOGGLE_STATUS', `Toggled candidate ID ${id} status to "${newStatus}"`, req.ip]
    );

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Toggle candidate status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

module.exports = { getAll, getById, create, update, delete: deleteCandidate, toggleStatus };
