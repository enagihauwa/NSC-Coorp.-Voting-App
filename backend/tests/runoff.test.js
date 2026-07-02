const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const dbModulePath = require.resolve(path.join(projectRoot, 'config', 'database.js'));
const controllerPath = require.resolve(path.join(projectRoot, 'controllers', 'runoffController.js'));

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});

const withMockedDatabase = async (mockDb, run) => {
  const previous = require.cache[dbModulePath];
  require.cache[dbModulePath] = { id: dbModulePath, filename: dbModulePath, loaded: true, exports: mockDb };
  try {
    delete require.cache[controllerPath];
    await run();
  } finally {
    if (previous) require.cache[dbModulePath] = previous;
    else delete require.cache[dbModulePath];
    delete require.cache[controllerPath];
  }
};

// A client whose query() answers based on the SQL text, driving submitRunoffVote.
const makeClient = (handlers) => ({
  async query(sql) {
    for (const [needle, response] of handlers) {
      if (sql.includes(needle)) return typeof response === 'function' ? response() : response;
    }
    return { rows: [] };
  },
  release() {},
});

const futureIso = () => new Date(Date.now() + 3600000).toISOString();
const pastIso = () => new Date(Date.now() - 3600000).toISOString();

test('runoff vote is blocked when the runoff is closed/expired', async () => {
  const client = makeClient([
    ['UPDATE runoffs SET status', { rows: [] }],
    ['SELECT * FROM runoffs WHERE id = $1', { rows: [{ id: 5, status: 'closed', end_time: pastIso() }] }],
  ]);

  await withMockedDatabase(
    { pool: { connect: async () => client }, query: async () => ({ rows: [] }) },
    async () => {
      const { submitRunoffVote } = require(controllerPath);
      const req = { params: { runoffId: '5' }, body: { member_id: 3, candidate_id: 9 }, ip: '127.0.0.1' };
      const res = makeRes();
      await submitRunoffVote(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.body.error, /closed/i);
    }
  );
});

test('runoff vote is blocked when the member already voted in this runoff', async () => {
  const client = makeClient([
    ['UPDATE runoffs SET status', { rows: [] }],
    ['SELECT * FROM runoffs WHERE id = $1', { rows: [{ id: 5, status: 'open', end_time: futureIso() }] }],
    ['SELECT * FROM members WHERE id = $1', { rows: [{ id: 3, status: 'active', location: 'HQ', staff_number: 'S1' }] }],
    ['FROM runoff_votes WHERE runoff_id = $1 AND member_id = $2', { rows: [{ id: 99 }] }],
  ]);

  await withMockedDatabase(
    { pool: { connect: async () => client }, query: async () => ({ rows: [] }) },
    async () => {
      const { submitRunoffVote } = require(controllerPath);
      const req = { params: { runoffId: '5' }, body: { member_id: 3, candidate_id: 9 }, ip: '127.0.0.1' };
      const res = makeRes();
      await submitRunoffVote(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.body.error, /already voted/i);
    }
  );
});

test('runoff vote is rejected when candidate is not part of the runoff', async () => {
  const client = makeClient([
    ['UPDATE runoffs SET status', { rows: [] }],
    ['SELECT * FROM runoffs WHERE id = $1', { rows: [{ id: 5, status: 'open', end_time: futureIso() }] }],
    ['SELECT * FROM members WHERE id = $1', { rows: [{ id: 3, status: 'active', location: 'HQ', staff_number: 'S1' }] }],
    ['FROM runoff_votes WHERE runoff_id = $1 AND member_id = $2', { rows: [] }],
    ['FROM runoff_candidates WHERE runoff_id = $1 AND candidate_id = $2', { rows: [] }],
  ]);

  await withMockedDatabase(
    { pool: { connect: async () => client }, query: async () => ({ rows: [] }) },
    async () => {
      const { submitRunoffVote } = require(controllerPath);
      const req = { params: { runoffId: '5' }, body: { member_id: 3, candidate_id: 9 }, ip: '127.0.0.1' };
      const res = makeRes();
      await submitRunoffVote(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /not part of this runoff/i);
    }
  );
});

test('creating a runoff requires at least two candidates', async () => {
  const client = { async query() { return { rows: [] }; }, release() {} };

  await withMockedDatabase(
    { pool: { connect: async () => client }, query: async () => ({ rows: [] }) },
    async () => {
      const { createRunoff } = require(controllerPath);
      const req = { admin: { id: 1 }, body: { position_id: 1, candidate_ids: [7], end_time: futureIso() }, ip: '127.0.0.1' };
      const res = makeRes();
      await createRunoff(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /at least two candidates/i);
    }
  );
});

test('creating a runoff rejects a past end time', async () => {
  const client = { async query() { return { rows: [] }; }, release() {} };

  await withMockedDatabase(
    { pool: { connect: async () => client }, query: async () => ({ rows: [] }) },
    async () => {
      const { createRunoff } = require(controllerPath);
      const req = { admin: { id: 1 }, body: { position_id: 1, candidate_ids: [7, 8], end_time: pastIso() }, ip: '127.0.0.1' };
      const res = makeRes();
      await createRunoff(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /future date/i);
    }
  );
});
