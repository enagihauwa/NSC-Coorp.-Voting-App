const { query, pool } = require('../config/database');
const csv = require('csv-parse/sync');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const location = req.query.location || '';
    const hasVoted = req.query.has_voted;

    let whereClause = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereClause.push(`(m.staff_number ILIKE $${paramIndex} OR m.fullname ILIKE $${paramIndex} OR m.location ILIKE $${paramIndex} OR m.department ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause.push(`m.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (location) {
      whereClause.push(`m.location = $${paramIndex}`);
      params.push(location);
      paramIndex++;
    }

    if (hasVoted !== undefined && hasVoted !== '') {
      whereClause.push(`m.has_voted = $${paramIndex}`);
      params.push(hasVoted === 'true' || hasVoted === '1');
      paramIndex++;
    }

    const whereStr = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) FROM members m ${whereStr}`, params);

    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit);
    params.push(offset);

    const result = await query(
      `SELECT m.* FROM members m ${whereStr} ORDER BY m.staff_number ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
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
    console.error('Get members error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

const getByStaffNumber = async (req, res) => {
  try {
    const { staffNumber } = req.params;
    const { fullname } = req.query;

    if (!fullname) {
      return res.status(400).json({
        success: false,
        error: 'Full name is required for verification.',
      });
    }

    const result = await query('SELECT * FROM members WHERE staff_number = $1', [staffNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Member not found. Please check your staff number.',
      });
    }

    const member = result.rows[0];

    if (member.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Member account is not active. Please contact the administrator.',
      });
    }

    const normalizedDbName = String(member.fullname).replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizedInputName = String(fullname).replace(/\s+/g, ' ').trim().toLowerCase();
    if (normalizedDbName !== normalizedInputName) {
      return res.status(401).json({
        success: false,
        error: 'Full name does not match our records. Please try again.',
      });
    }

    if (member.has_voted) {
      return res.status(403).json({
        success: false,
        error: 'You have already voted. Duplicate votes are not allowed.',
      });
    }

    return res.json({
      success: true,
      data: {
        id: member.id,
        staff_number: member.staff_number,
        fullname: member.fullname,
        department: member.department,
        location: member.location,
        has_voted: member.has_voted,
      },
    });
  } catch (error) {
    console.error('Get member by staff number error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

const importMembers = async (req, res) => {
  const client = await pool.connect();

  try {
    let membersData = [];

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const filePath = req.file.path;

      if (ext === '.csv') {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const records = csv.parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        membersData = records;
      } else if (ext === '.xlsx' || ext === '.xls') {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const records = XLSX.utils.sheet_to_json(sheet);
        membersData = records;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Unsupported file format. Use CSV or Excel files.',
        });
      }

      fs.unlinkSync(filePath);
    } else if (req.body && req.body.members) {
      membersData = req.body.members;
    } else {
      return res.status(400).json({
        success: false,
        error: 'No data provided. Upload a file or send members array.',
      });
    }

    if (!membersData || membersData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No members found in the uploaded file or data.',
      });
    }

    await client.query('BEGIN');

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < membersData.length; i++) {
      const row = membersData[i];
      const staffNumber = row.staff_number || row.staffNumber || row.STAFF_NUMBER || row['Staff Number'] || row['Staff Number'] || '';
      const fullname = row.fullname || row.full_name || row.fullName || row.FULLNAME || row.Fullname || row['Full Name'] || row.Fullname || '';
      const department = row.department || row.DEPARTMENT || row.Department || '';
      const location = row.location || row.LOCATION || row.Location || '';
      const phone = row.phone || row.PHONE || row.Phone || row.phone_number || row.PhoneNumber || '';
      const email = row.email || row.EMAIL || row.Email || '';

      if (!staffNumber || !fullname) {
        errors.push({ row: i + 1, message: 'Missing staff_number or fullname', data: row });
        skipped++;
        continue;
      }

      try {
        const result = await client.query(
          `INSERT INTO members (staff_number, fullname, department, location, phone, email)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (staff_number) 
           DO UPDATE SET fullname = EXCLUDED.fullname, department = EXCLUDED.department,
                         location = EXCLUDED.location, phone = EXCLUDED.phone, email = EXCLUDED.email
           RETURNING id`,
          [String(staffNumber).trim(), String(fullname).trim(), String(department).trim(),
           String(location).trim(), String(phone).trim(), String(email).trim()]
        );

        if (result.rows[0]) {
          imported++;
        }
      } catch (err) {
        errors.push({ row: i + 1, message: err.message, data: row });
        skipped++;
      }
    }

    await client.query('COMMIT');

    await query(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address) 
       VALUES ($1, $2, $3, $4)`,
      [req.admin.id, 'MEMBER_IMPORT', `Imported ${imported} members, ${skipped} skipped, ${errors.length} errors`, req.ip]
    );

    return res.json({
      success: true,
      data: {
        imported,
        skipped,
        total_processed: membersData.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Import members error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  } finally {
    client.release();
  }
};

const getStats = async (req, res) => {
  try {
    const totalResult = await query('SELECT COUNT(*) FROM members');
    const activeResult = await query('SELECT COUNT(*) FROM members WHERE status = $1', ['active']);
    const votedResult = await query('SELECT COUNT(*) FROM members WHERE has_voted = TRUE');
    const pendingResult = await query('SELECT COUNT(*) FROM members WHERE status = $1 AND has_voted = FALSE', ['active']);

    const locationResult = await query(
      'SELECT location, COUNT(*) as count FROM members GROUP BY location ORDER BY count DESC'
    );

    return res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].count, 10),
        active: parseInt(activeResult.rows[0].count, 10),
        voted: parseInt(votedResult.rows[0].count, 10),
        pending: parseInt(pendingResult.rows[0].count, 10),
        locations: locationResult.rows,
      },
    });
  } catch (error) {
    console.error('Get member stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
};

module.exports = { getAll, getByStaffNumber, importMembers, getStats };
