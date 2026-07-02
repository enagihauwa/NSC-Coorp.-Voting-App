const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const dbModulePath = require.resolve(path.join(projectRoot, 'config', 'database.js'));

const makeRes = () => {
  const result = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return result;
};

const withMockedDatabase = async (mockDb, run) => {
  const previousDbCache = require.cache[dbModulePath];
  require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: mockDb,
  };

  try {
    await run();
  } finally {
    if (previousDbCache) {
      require.cache[dbModulePath] = previousDbCache;
    } else {
      delete require.cache[dbModulePath];
    }
  }
};

test('vote submission is blocked when election is closed', async () => {
  const controllerPath = require.resolve(path.join(projectRoot, 'controllers', 'voteController.js'));
  delete require.cache[controllerPath];

  const client = {
    async query(sql) {
      if (sql.includes('FROM election_settings')) {
        return {
          rows: [
            { key: 'election_open', value: 'false' },
            { key: 'election_end_time', value: new Date(Date.now() + 3600000).toISOString() },
          ],
        };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {},
  };

  await withMockedDatabase(
    {
      pool: { connect: async () => client },
      query: async () => ({ rows: [] }),
    },
    async () => {
      delete require.cache[controllerPath];
      const { submit } = require(controllerPath);

      const req = {
        body: {
          votes: [{ member_id: 12, position_id: 1, candidate_id: 9 }],
        },
        ip: '127.0.0.1',
      };
      const res = makeRes();

      await submit(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /Election is closed/i);
    }
  );
});

test('result summary counts only verified votes', async () => {
  const controllerPath = require.resolve(path.join(projectRoot, 'controllers', 'resultController.js'));
  delete require.cache[controllerPath];
  const executedSql = [];

  await withMockedDatabase(
    {
      query: async (sql) => {
        executedSql.push(sql);
        if (sql.includes('COUNT(*) as count FROM members')) return { rows: [{ count: '10' }] };
        if (sql.includes("COUNT(DISTINCT member_id) as count FROM votes WHERE status = 'verified'")) return { rows: [{ count: '4' }] };
        if (sql.includes('COUNT(*) as count FROM positions')) return { rows: [{ count: '7' }] };
        if (sql.includes('COUNT(*) as count FROM candidates')) return { rows: [{ count: '20' }] };
        if (sql.includes('FROM votes v') && sql.includes("WHERE v.status = 'verified'")) return { rows: [] };
        return { rows: [] };
      },
    },
    async () => {
      delete require.cache[controllerPath];
      const { getSummary } = require(controllerPath);
      const res = makeRes();
      await getSummary({}, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.total_voters, 4);
      assert.ok(executedSql.some((sql) => sql.includes("COUNT(DISTINCT member_id) as count FROM votes WHERE status = 'verified'")));
    }
  );
});

test('public settings endpoint exposes sanitized keys', async () => {
  const controllerPath = require.resolve(path.join(projectRoot, 'controllers', 'settingsController.js'));
  delete require.cache[controllerPath];

  await withMockedDatabase(
    {
      query: async (sql) => {
        if (sql.includes('FROM election_settings')) {
          return {
            rows: [
              { key: 'election_open', value: 'true' },
              { key: 'election_end_time', value: '2027-01-01T00:00:00.000Z' },
              { key: 'election_title', value: 'NSC Election' },
            ],
          };
        }
        return { rows: [] };
      },
    },
    async () => {
      delete require.cache[controllerPath];
      const { getPublicSettings } = require(controllerPath);
      const res = makeRes();
      await getPublicSettings({}, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.election_open, 'true');
      assert.equal(res.body.data.election_title, 'NSC Election');
    }
  );
});

test('dashboard position vote counts use verified votes only', async () => {
  const controllerPath = require.resolve(path.join(projectRoot, 'controllers', 'dashboardController.js'));
  delete require.cache[controllerPath];
  const executedSql = [];
  let membersCountCalls = 0;

  await withMockedDatabase(
    {
      query: async (sql) => {
        executedSql.push(sql);
        if (sql === 'SELECT COUNT(*) as count FROM members') {
          membersCountCalls += 1;
          return { rows: [{ count: '5' }] };
        }
        if (sql.includes("status = $1") && sql.includes('active') && sql.includes('has_voted = FALSE')) {
          return { rows: [{ count: '3' }] };
        }
        if (sql.includes("status = $1") && sql.includes('active')) return { rows: [{ count: '5' }] };
        if (sql.includes('has_voted = TRUE')) return { rows: [{ count: '2' }] };
        if (sql.includes('ORDER BY v.created_at DESC')) return { rows: [] };
        if (sql.includes('COUNT(*) as count FROM positions')) return { rows: [{ count: '3' }] };
        if (sql.includes("v.status = 'verified'")) return { rows: [{ id: 1, name: 'President', vote_count: '2' }] };
        if (sql.includes('GROUP BY m.location')) return { rows: [] };
        return { rows: [{ count: '0' }] };
      },
    },
    async () => {
      delete require.cache[controllerPath];
      const { getDashboard } = require(controllerPath);
      const res = makeRes();
      await getDashboard({}, res);
      assert.equal(res.statusCode, 200);
      assert.equal(membersCountCalls, 1);
      assert.ok(executedSql.some((sql) => sql.includes("v.status = 'verified'")));
    }
  );
});

test('checkRole denies access for insufficient role', async () => {
  const authPath = require.resolve(path.join(projectRoot, 'middleware', 'auth.js'));
  delete require.cache[authPath];

  await withMockedDatabase(
    { query: async () => ({ rows: [] }) },
    async () => {
      const { checkRole, ROLES } = require(authPath);
      const middleware = checkRole(ROLES.SUPERADMIN);
      const req = { admin: { id: 1, role: ROLES.AUDITOR } };
      const res = makeRes();
      let nextCalled = false;

      middleware(req, res, () => { nextCalled = true; });
      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
    }
  );
});
