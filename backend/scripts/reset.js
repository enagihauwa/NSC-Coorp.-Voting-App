const { pool } = require('../config/database');

async function reset() {
  const client = await pool.connect();
  try {
    console.log('Resetting database...');

    await client.query('BEGIN');

    // Drop all data in dependency order
    await client.query('DELETE FROM runoff_votes');
    await client.query('DELETE FROM runoff_candidates');
    await client.query('DELETE FROM runoffs');
    await client.query('DELETE FROM votes');
    await client.query('DELETE FROM audit_logs');
    await client.query('DELETE FROM candidates');
    await client.query('DELETE FROM members');
    await client.query('DELETE FROM election_settings');
    await client.query('DELETE FROM admin_users');
    await client.query('DELETE FROM positions');

    // Reset sequences
    await client.query("ALTER SEQUENCE candidates_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE members_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE positions_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE votes_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE admin_users_id_seq RESTART WITH 1");

    await client.query('COMMIT');
    console.log('Database reset complete. Run migrations then seeds.');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reset failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

reset();
