const test = require('node:test');
const assert = require('node:assert/strict');

const { invokeCommand } = require('../lib/commandInvoker');

test('invokeCommand passes real chatId, senderId, text and message to modern handlers', async () => {
  const msg = {
    key: {
      participant: '255712345678@s.whatsapp.net',
      remoteJid: '123456@g.us',
      fromMe: false
    },
    message: {
      conversation: '.add 255612130873'
    }
  };

  let seen;
  const command = async (sock, chatId, senderId, text, message, isSenderAdmin) => {
    seen = { chatId, senderId, text, message, isSenderAdmin };
    return 'ok';
  };

  const result = await invokeCommand(command, { id: 'bot' }, '123456@g.us', msg, true, '255612130873', {}, {}, {}, 'bot');

  assert.equal(result, 'ok');
  assert.equal(seen.chatId, '123456@g.us');
  assert.equal(seen.senderId, '255712345678@s.whatsapp.net');
  assert.equal(seen.text, '255612130873');
  assert.equal(seen.message, msg);
  assert.equal(seen.isSenderAdmin, true);
});

test('invokeCommand supports legacy handlers that receive message as third argument', async () => {
  const msg = {
    key: {
      participant: '255700000001@s.whatsapp.net',
      remoteJid: '987654@g.us',
      fromMe: false
    },
    message: {
      conversation: '.tagall'
    }
  };

  let seen;
  const command = async (sock, chatId, message) => {
    seen = { chatId, message };
    return 'legacy';
  };

  const result = await invokeCommand(command, { id: 'bot' }, '987654@g.us', msg, false, '', {}, {}, {}, 'bot');

  assert.equal(result, 'legacy');
  assert.equal(seen.chatId, '987654@g.us');
  assert.equal(seen.message, msg);
});
