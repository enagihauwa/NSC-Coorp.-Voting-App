const { emitToAdmin, emitToPublicResults } = require('./index');

const emitVotePending = (payload) => {
  emitToAdmin('vote:pending:new', {
    ...payload,
    timestamp: new Date().toISOString(),
  });
};

const emitVoteStatusChanged = (payload) => {
  emitToAdmin('vote:status:changed', {
    ...payload,
    timestamp: new Date().toISOString(),
  });
};

const emitResultsUpdated = (payload = {}) => {
  const eventPayload = { ...payload, timestamp: new Date().toISOString() };
  emitToAdmin('results:updated', eventPayload);
  emitToPublicResults('results:updated', eventPayload);
};

const emitRunoffUpdated = (payload = {}) => {
  const eventPayload = { ...payload, timestamp: new Date().toISOString() };
  emitToAdmin('runoff:updated', eventPayload);
  emitToPublicResults('runoff:updated', eventPayload);
};

module.exports = { emitVotePending, emitVoteStatusChanged, emitResultsUpdated, emitRunoffUpdated };
