const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const {
  isSessionRepairableError,
  backupSignalState
} = require('../lib/sessionRecovery');

test('session recovery detects Bad MAC errors', () => {
  assert.equal(isSessionRepairableError(new Error('Bad MAC')), true);
  assert.equal(isSessionRepairableError(new Error('network timeout')), false);
});

test('session recovery preserves creds and backs up Signal keys', () => {
  const authPath = fs.mkdtempSync(path.join(os.tmpdir(), 'mickey-auth-'));
  fs.writeFileSync(path.join(authPath, 'creds.json'), '{}');
  fs.writeFileSync(path.join(authPath, 'session-123.json'), '{}');

  try {
    const backupPath = backupSignalState(authPath, 123);

    assert.equal(fs.existsSync(path.join(authPath, 'creds.json')), true);
    assert.equal(fs.existsSync(path.join(authPath, 'session-123.json')), false);
    assert.equal(fs.existsSync(path.join(backupPath, 'session-123.json')), true);
  } finally {
    fs.removeSync(authPath);
    fs.removeSync(`${authPath}_bad_mac_123`);
  }
});