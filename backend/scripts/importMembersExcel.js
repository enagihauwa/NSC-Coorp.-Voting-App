const XLSX = require('xlsx');
const { pool } = require('../config/database');
const path = require('path');

const excelPath = 'c:\\Users\\USER\\Desktop\\NSC Coorp. Voting App\\backend\\List of NSC Cooperative  Staff as at 14th of July, 2026.xlsx';

async function main() {
  const client = await pool.connect();
  try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Parse as 2D array first to scan for the header row
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (rows.length === 0) {
      throw new Error('No data found in the Excel sheet.');
    }

    console.log(`Analyzing ${rows.length} rows in the spreadsheet for header structures...`);

    // Auto-detect the header row index
    let headerRowIndex = 0;
    let detectedKeys = [];
    
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;
      
      const matchCount = row.filter(cell => {
        if (cell === null || cell === undefined) return false;
        const s = String(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
        return ['staff', 'name', 'dept', 'location', 'phone', 'email', 'station', 'gsm', 'member', 'fullname'].some(c => s.includes(c));
      }).length;
      
      if (matchCount >= 2) {
        headerRowIndex = i;
        detectedKeys = row.map(cell => cell !== null && cell !== undefined ? String(cell).trim() : '');
        break;
      }
    }

    if (detectedKeys.length === 0) {
      // Fallback to row 0 if no match found
      console.log('Warning: Auto-detection of header row did not find a strong match. Falling back to the first row.');
      headerRowIndex = 0;
      detectedKeys = (rows[0] || []).map(cell => cell !== null && cell !== undefined ? String(cell).trim() : '');
    }

    console.log(`Detected header row at index ${headerRowIndex}.`);
    console.log('Raw headers found:', detectedKeys.filter(Boolean));

    // Map the remaining rows to objects based on the detected keys
    const rawData = [];
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const obj = {};
      let hasData = false;
      detectedKeys.forEach((key, colIndex) => {
        if (key) {
          const val = row[colIndex];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            obj[key] = val;
            hasData = true;
          }
        }
      });
      if (hasData) {
        rawData.push(obj);
      }
    }

    console.log(`Successfully mapped ${rawData.length} data rows.`);

    // Dynamic helper to match column names case/space-insensitively
    const findKey = (candidates) => {
      return detectedKeys.find(k => {
        if (!k) return false;
        const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        return candidates.some(c => clean.includes(c) || c.includes(clean));
      });
    };

    // Column matching rules
    const staffNumberKey = findKey(['staffid', 'staffnumber', 'staffno', 'employeeid', 'idnumber']);
    const fullnameKey = findKey(['fullname', 'name', 'staffname', 'employeename', 'firstandlastname']);
    const departmentKey = findKey(['department', 'dept', 'unit', 'division']);
    const locationKey = findKey(['location', 'station', 'branch', 'office']);
    const phoneKey = findKey(['phone', 'gsm', 'mobile', 'tel', 'phonecell']);
    const emailKey = findKey(['email', 'mail', 'emailaddress']);

    console.log('\n--- Column Mapping Detected ---');
    console.log(`- Staff Number Column:   ${staffNumberKey ? `"${staffNumberKey}"` : 'NOT DETECTED (Fallback to NSC001, NSC002...)'}`);
    console.log(`- Full Name Column:      ${fullnameKey ? `"${fullnameKey}"` : 'NOT DETECTED (REQUIRED)'}`);
    console.log(`- Department Column:     ${departmentKey ? `"${departmentKey}"` : 'NOT DETECTED (Fallback to General)'}`);
    console.log(`- Location Column:       ${locationKey ? `"${locationKey}"` : 'NOT DETECTED (Fallback to Headquarters - Lagos)'}`);
    console.log(`- Phone Column:          ${phoneKey ? `"${phoneKey}"` : 'NOT DETECTED (Fallback to null)'}`);
    console.log(`- Email Column:          ${emailKey ? `"${emailKey}"` : 'NOT DETECTED (Fallback to null)'}`);
    console.log('--------------------------------\n');

    if (!fullnameKey) {
      throw new Error('Could not identify a "Full Name" or "Name" column in your Excel headers. Please check your spreadsheet.');
    }

    await client.query('BEGIN');

    console.log('Clearing existing votes and members from database...');
    await client.query('DELETE FROM votes');
    await client.query('DELETE FROM members');
    await client.query('ALTER SEQUENCE members_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE votes_id_seq RESTART WITH 1');

    console.log('Importing new members...');
    let successCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      
      const fullname = fullnameKey && row[fullnameKey] ? String(row[fullnameKey]).trim() : '';
      if (!fullname) {
        skippedCount++;
        continue;
      }

      // Format staff number, generate sequential fallback if missing
      const staff_number = staffNumberKey && row[staffNumberKey] 
        ? String(row[staffNumberKey]).trim() 
        : `NSC${String(i + 1).padStart(3, '0')}`;

      const department = departmentKey && row[departmentKey] 
        ? String(row[departmentKey]).trim() 
        : 'General';

      const location = locationKey && row[locationKey] 
        ? String(row[locationKey]).trim() 
        : 'Headquarters - Lagos';

      const phone = phoneKey && row[phoneKey] 
        ? String(row[phoneKey]).trim() 
        : null;

      const email = emailKey && row[emailKey] 
        ? String(row[emailKey]).trim() 
        : null;

      await client.query(
        `INSERT INTO members (staff_number, fullname, department, location, phone, email, status, has_voted) 
         VALUES ($1, $2, $3, $4, $5, $6, 'active', FALSE)
         ON CONFLICT (staff_number) DO UPDATE SET 
           fullname = EXCLUDED.fullname,
           department = EXCLUDED.department,
           location = EXCLUDED.location,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email`,
        [staff_number, fullname, department, location, phone, email]
      );
      successCount++;
    }

    await client.query('COMMIT');
    console.log(`\nImport completed successfully!`);
    console.log(`- Members loaded: ${successCount}`);
    console.log(`- Rows skipped (no name): ${skippedCount}`);
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\nImport failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

main();
