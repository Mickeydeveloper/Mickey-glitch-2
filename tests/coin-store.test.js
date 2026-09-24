const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const coinStore = require('../lib/coinStore');

test('PalmPesa completion credits coins once and deployment debits five coins', () => {
  const file = path.join(os.tmpdir(), `mickey-coins-${Date.now()}-${Math.random()}.json`);
  const previousFile = process.env.COIN_STORE_FILE;
  process.env.COIN_STORE_FILE = file;

  try {
    const pending = coinStore.createPendingTopUp({
      accountId: 'account_test',
      coins: 10,
      amount: 500,
      phone: '255700000000',
      transactionId: 'TXN-TEST-1'
    });

    assert.equal(coinStore.getWallet('account_test').balance, 0);
    coinStore.applyPaymentStatus(pending.transactionId, 'PENDING', { orderId: 'ORDER-TEST-1' });
    assert.equal(coinStore.getWallet('account_test').balance, 0);

    coinStore.applyPaymentStatus('ORDER-TEST-1', 'COMPLETED');
    coinStore.applyPaymentStatus('ORDER-TEST-1', 'COMPLETED');
    assert.equal(coinStore.getWallet('account_test').balance, 10);

    const deployment = coinStore.debitForDeployment('account_test', 'bot_test');
    assert.equal(deployment.wallet.balance, 5);
    assert.equal(coinStore.debitForDeployment('account_test', 'bot_test-2').wallet.balance, 0);
    assert.equal(coinStore.debitForDeployment('account_test', 'bot_test-3'), null);
  } finally {
    if (previousFile === undefined) delete process.env.COIN_STORE_FILE;
    else process.env.COIN_STORE_FILE = previousFile;
    fs.rmSync(file, { force: true });
  }
});
