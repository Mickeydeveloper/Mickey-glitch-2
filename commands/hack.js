
const settings = require('../settings');
const { AIRich } = require('../lib/messageBuilder');

function onlyDigits(s = '') {
  return String(s).replace(/\D/g, '');
}

function getOwnersNormalized() {
  const raw = settings.ownerNumber;
  const owners = Array.isArray(raw) ? raw : String(raw).split ? String(raw).split(',') : [raw];
  return owners.map(o => onlyDigits(o));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function hackCommand(sock, chatId, message, q) {
  try {
    const rawSender = message.key?.participant || message.key?.remoteJid || '';
    const senderDigits = onlyDigits(rawSender);
    const owners = getOwnersNormalized();

    if (!owners.includes(senderDigits) && !message.key?.fromMe) {
      const builder = AIRich.error(sock, settings.botName, 'Only the bot owner can use this command.', 'Owner gate');
      return await builder.send(chatId, { quoted: message });
    }

    const steps = [
      '💻 *HACK STARTING...* 💻',
      '*Initializing hacking tools...* 🛠️',
      '*Connecting to remote servers...* 🌐',
      '```[█▒▒▒▒] 10%``` ⏳',
      '```[██▒▒▒▒] 30%``` ⏳',
      '```[████▒▒▒] 50%``` ⏳',
      '```[██████▒] 70%``` ⏳',
      '```[████████] 90%``` ⏳',
      '```[████████] 100%``` ✅',
      '🔒 *System Breach: Successful!* 🔓',
      '🚀 *Executing final commands...* 🎯',
      '*📡 Transmitting data...* 📤',
      '_🕵️‍♂️ Covering tracks..._ 🤫',
      '*🔧 Finalizing operations...* 🏁',
      '⚠️ *Note:* This is a joke command for fun.',
      '> *HACK COMPLETE ☣*'
    ];

    for (const line of steps) {
      const builder = AIRich.warning(sock, settings.botName, line, 'HACK MODE');
      await builder.send(chatId, { quoted: message });
      const delay = Math.floor(Math.random() * 1500) + 500;
      await sleep(delay);
    }
  } catch (err) {
    console.error('hackCommand error:', err);
    const builder = AIRich.error(sock, settings.botName, `Error: ${err.message || String(err)}`, 'Hack command');
    await builder.send(chatId, { quoted: message });
  }
}

module.exports = hackCommand;
