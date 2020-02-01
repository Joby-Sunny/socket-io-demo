module.exports.info = logPayload => {
  console.log(makeLogEntry(logPayload, 'INFO'));
};

function makeLogEntry(payload, type) {
  return `[${type}] || ${payload}`;
}
