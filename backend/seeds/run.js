const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const positions = [
  'President',
  'Vice President',
  'General Secretary',
  'Treasurer',
  'Financial Secretary',
  'Assistant General Secretary',
  'Public Relations Officer',
];

const members = [
  { staff_number: 'NSC001', fullname: 'Adebayo Ogunlesi', department: 'Administration', location: 'Headquarters - Lagos', phone: '08010000001', email: 'adebayo.ogunlesi@nsc.gov.ng' },
  { staff_number: 'NSC002', fullname: 'Chiamaka Nwosu', department: 'Finance & Accounts', location: 'Headquarters - Lagos', phone: '08010000002', email: 'chiamaka.nwosu@nsc.gov.ng' },
  { staff_number: 'NSC003', fullname: 'Emeka Okonkwo', department: 'Marine & Operations', location: 'Apapa Area Command', phone: '08010000003', email: 'emeka.okonkwo@nsc.gov.ng' },
  { staff_number: 'NSC004', fullname: 'Folake Adeyemi', department: 'Human Resources', location: 'Headquarters - Lagos', phone: '08010000004', email: 'folake.adeyemi@nsc.gov.ng' },
  { staff_number: 'NSC005', fullname: 'Gbenga Adewale', department: 'Legal Services', location: 'Tin Can Island Command', phone: '08010000005', email: 'gbenga.adewale@nsc.gov.ng' },
  { staff_number: 'NSC006', fullname: 'Hauwa Ibrahim', department: 'Information Technology', location: 'Headquarters - Lagos', phone: '08010000006', email: 'hauwa.ibrahim@nsc.gov.ng' },
  { staff_number: 'NSC007', fullname: 'Ifeanyi Eze', department: 'Corporate Affairs', location: 'Eastern Ports Command', phone: '08010000007', email: 'ifeanyi.eze@nsc.gov.ng' },
  { staff_number: 'NSC008', fullname: 'Jennifer Okoro', department: 'Finance & Accounts', location: 'Western Ports Command', phone: '08010000008', email: 'jennifer.okoro@nsc.gov.ng' },
  { staff_number: 'NSC009', fullname: 'Kolawole Bamidele', department: 'Internal Audit', location: 'Headquarters - Lagos', phone: '08010000009', email: 'kolawole.bamidele@nsc.gov.ng' },
  { staff_number: 'NSC010', fullname: 'Lola Adebayo', department: 'Administration', location: 'Apapa Area Command', phone: '08010000010', email: 'lola.adebayo@nsc.gov.ng' },
  { staff_number: 'NSC011', fullname: 'Musa Abdullahi', department: 'Marine & Operations', location: 'Kano Inland Office', phone: '08010000011', email: 'musa.abdullahi@nsc.gov.ng' },
  { staff_number: 'NSC012', fullname: 'Ngozi Okeke', department: 'Human Resources', location: 'Headquarters - Lagos', phone: '08010000012', email: 'ngozi.okeke@nsc.gov.ng' },
  { staff_number: 'NSC013', fullname: 'Olumide Fasanya', department: 'Procurement', location: 'Tin Can Island Command', phone: '08010000013', email: 'olumide.fasanya@nsc.gov.ng' },
  { staff_number: 'NSC014', fullname: 'Patience Okafor', department: 'Legal Services', location: 'Liaison Office - Abuja', phone: '08010000014', email: 'patience.okafor@nsc.gov.ng' },
  { staff_number: 'NSC015', fullname: 'Rasheed Adeleke', department: 'Information Technology', location: 'Headquarters - Lagos', phone: '08010000015', email: 'rasheed.adeleke@nsc.gov.ng' },
  { staff_number: 'NSC016', fullname: 'Sade Ogunleye', department: 'Corporate Affairs', location: 'Eastern Ports Command', phone: '08010000016', email: 'sade.ogunleye@nsc.gov.ng' },
  { staff_number: 'NSC017', fullname: 'Tunde Balogun', department: 'Research & Statistics', location: 'Headquarters - Lagos', phone: '08010000017', email: 'tunde.balogun@nsc.gov.ng' },
  { staff_number: 'NSC018', fullname: 'Uchenna Obi', department: 'Finance & Accounts', location: 'Western Ports Command', phone: '08010000018', email: 'uchenna.obi@nsc.gov.ng' },
  { staff_number: 'NSC019', fullname: 'Victoria Adeleke', department: 'Administration', location: 'Liaison Office - Port Harcourt', phone: '08010000019', email: 'victoria.adeleke@nsc.gov.ng' },
  { staff_number: 'NSC020', fullname: 'Wale Ogunbiyi', department: 'Marine & Operations', location: 'Apapa Area Command', phone: '08010000020', email: 'wale.ogunbiyi@nsc.gov.ng' },
  { staff_number: 'NSC021', fullname: 'Yemi Alade', department: 'Human Resources', location: 'Headquarters - Lagos', phone: '08010000021', email: 'yemi.alade@nsc.gov.ng' },
  { staff_number: 'NSC022', fullname: 'Zainab Abdul', department: 'Internal Audit', location: 'Kano Inland Office', phone: '08010000022', email: 'zainab.abdul@nsc.gov.ng' },
  { staff_number: 'NSC023', fullname: 'Adaobi Chukwuma', department: 'Legal Services', location: 'Liaison Office - Abuja', phone: '08010000023', email: 'adaobi.chukwuma@nsc.gov.ng' },
  { staff_number: 'NSC024', fullname: 'Babatunde Fashola', department: 'Corporate Affairs', location: 'Headquarters - Lagos', phone: '08010000024', email: 'babatunde.fashola@nsc.gov.ng' },
  { staff_number: 'NSC025', fullname: 'Chioma Okafor', department: 'Information Technology', location: 'Tin Can Island Command', phone: '08010000025', email: 'chioma.okafor@nsc.gov.ng' },
  { staff_number: 'NSC026', fullname: 'Daniel Eze', department: 'Finance & Accounts', location: 'Eastern Ports Command', phone: '08010000026', email: 'daniel.eze@nsc.gov.ng' },
  { staff_number: 'NSC027', fullname: 'Esther Udoh', department: 'Administration', location: 'Western Ports Command', phone: '08010000027', email: 'esther.udoh@nsc.gov.ng' },
  { staff_number: 'NSC028', fullname: 'Femi Ogunlade', department: 'Procurement', location: 'Headquarters - Lagos', phone: '08010000028', email: 'femi.ogunlade@nsc.gov.ng' },
  { staff_number: 'NSC029', fullname: 'Grace Johnson', department: 'Marine & Operations', location: 'Apapa Area Command', phone: '08010000029', email: 'grace.johnson@nsc.gov.ng' },
  { staff_number: 'NSC030', fullname: 'Henry Uche', department: 'Research & Statistics', location: 'Liaison Office - Port Harcourt', phone: '08010000030', email: 'henry.uche@nsc.gov.ng' },
];

const candidates = [
  { position: 'President', fullname: 'Dr. Ngozi Okonjo-Iweala', manifesto: 'To lead with integrity, transparency, and a vision for a prosperous cooperative society where every member thrives.' },
  { position: 'President', fullname: 'Alhaji Aliko Dangote', manifesto: 'Bringing private sector discipline and business acumen to steer the cooperative towards sustainable growth.' },
  { position: 'Vice President', fullname: 'Prof. Yemi Osinbajo', manifesto: 'Supporting the President with sound legal and administrative expertise for effective governance.' },
  { position: 'Vice President', fullname: 'Senator Bola Tinubu', manifesto: 'Leveraging extensive leadership experience to strengthen the cooperative\'s impact at all levels.' },
  { position: 'General Secretary', fullname: 'Mrs. Folorunso Alakija', manifesto: 'Ensuring accurate records, transparent communication, and accountability across all cooperative activities.' },
  { position: 'General Secretary', fullname: 'Mr. Tony Elumelu', manifesto: 'Applying best practices in corporate governance to elevate the cooperative\'s administrative standards.' },
  { position: 'Treasurer', fullname: 'Mr. Wale Edun', manifesto: 'Prudent financial management, robust internal controls, and maximum returns on member investments.' },
  { position: 'Treasurer', fullname: 'Mrs. Ibukun Awosika', manifesto: 'Transparent treasury operations and sound fiscal policies to safeguard members\' funds.' },
  { position: 'Financial Secretary', fullname: 'Mr. Jim Ovia', manifesto: 'Strategic financial planning and innovative savings programs to enhance members\' financial well-being.' },
  { position: 'Financial Secretary', fullname: 'Dr. Ola Orekunrin', manifesto: 'Modernizing financial operations with technology for better service delivery and accountability.' },
  { position: 'Assistant General Secretary', fullname: 'Chief Olusegun Obasanjo', manifesto: 'Supporting the General Secretary in executing policies and ensuring smooth administrative operations.' },
  { position: 'Assistant General Secretary', fullname: 'Prof. Pat Utomi', manifesto: 'Strengthening the cooperative\'s administrative framework through proven management expertise.' },
  { position: 'Public Relations Officer', fullname: 'Ms. Chimamanda Adichie', manifesto: 'Elevating the cooperative\'s public image through strategic communication and member engagement.' },
  { position: 'Public Relations Officer', fullname: 'Mr. Dele Momodu', manifesto: 'Building strong media relationships and amplifying the cooperative\'s achievements to the public.' },
  { position: 'Public Relations Officer', fullname: 'Mrs. Mo Abudu', manifesto: 'Leveraging media expertise to showcase the cooperative\'s impact and attract new members.' },
];

async function runSeeds() {
  const client = await pool.connect();

  try {
    console.log('Seeding database...');
    const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!seedAdminPassword) {
      if (isProduction) {
        throw new Error('SEED_ADMIN_PASSWORD is required in production.');
      }
      throw new Error('SEED_ADMIN_PASSWORD is required to seed admin credentials.');
    }

    await client.query('BEGIN');

    // Seed positions
    for (const name of positions) {
      await client.query(
        'INSERT INTO positions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [name]
      );
    }
    console.log(`Positions seeded (${positions.length}).`);

    // Seed admin user
    const adminHash = await bcrypt.hash(seedAdminPassword, 10);
    await client.query(
      `INSERT INTO admin_users (username, password_hash, role) 
       VALUES ($1, $2, 'admin') ON CONFLICT (username) DO NOTHING`,
      ['admin', adminHash]
    );
    const passwordResetColumnResult = await client.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'admin_users' AND column_name = 'must_change_password'`
    );
    if (passwordResetColumnResult.rows.length > 0) {
      await client.query(
        `UPDATE admin_users
         SET must_change_password = TRUE
         WHERE username = 'admin'`
      );
    }
    console.log('Admin seeded (username: admin, password from SEED_ADMIN_PASSWORD).');

    // Seed members
    let memberCount = 0;
    for (const m of members) {
      const result = await client.query(
        `INSERT INTO members (staff_number, fullname, department, location, phone, email) 
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (staff_number) DO NOTHING`,
        [m.staff_number, m.fullname, m.department, m.location, m.phone, m.email]
      );
      if (result.rowCount > 0) memberCount++;
    }
    console.log(`Members seeded (${memberCount}).`);

    const positionRows = await client.query(
      'SELECT id, name FROM positions WHERE name = ANY($1::text[])',
      [positions]
    );
    const positionIdByName = Object.fromEntries(
      positionRows.rows.map((row) => [row.name, row.id])
    );
    const missingPositions = positions.filter((name) => !positionIdByName[name]);
    if (missingPositions.length > 0) {
      throw new Error(`Missing positions after seed: ${missingPositions.join(', ')}`);
    }

    // Seed candidates
    let candidateCount = 0;
    for (const c of candidates) {
      const positionId = positionIdByName[c.position];
      if (!positionId) {
        throw new Error(`Unknown position for candidate ${c.fullname}: ${c.position}`);
      }
      const result = await client.query(
        `INSERT INTO candidates (position_id, fullname, manifesto, status) 
         VALUES ($1, $2, $3, 'active') ON CONFLICT DO NOTHING`,
        [positionId, c.fullname, c.manifesto]
      );
      if (result.rowCount > 0) candidateCount++;
    }
    console.log(`Candidates seeded (${candidateCount}).`);

    await client.query('COMMIT');

    // Election settings (outside transaction for simplicity)
    const settings = [
      ['election_title', 'NSC Cooperative Society Election 2026'],
      ['election_open', 'true'],
      ['election_end_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()],
      ['announce_winners', 'false'],
    ];
    for (const [key, value] of settings) {
      await client.query(
        `INSERT INTO election_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`,
        [key, value]
      );
    }
    console.log('Election settings seeded (election open, ends in 7 days).');

    console.log('\n--- Seeding Summary ---');
    console.log(`  Positions: ${positions.length}`);
    console.log(`  Members:   ${memberCount}`);
    console.log(`  Candidates: ${candidateCount}`);
    console.log('  Admin:     admin / [SEED_ADMIN_PASSWORD]');
    console.log('--- Seeding completed successfully ---');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

runSeeds();
