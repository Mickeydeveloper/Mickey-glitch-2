const deletedMessages = new Map();

function handleSnipe(msg) {
    const from = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[Media/Message]';
    const sender = msg.key.participant || msg.key.remoteJid;
    
    if (!deletedMessages.has(from)) deletedMessages.set(from, []);
    deletedMessages.get(from).unshift({ text, sender, time: Date.now() });
    if (deletedMessages.get(from).length > 10) deletedMessages.get(from).pop();
}

module.exports = async function(sock, chatId, msg) {
    const messages = deletedMessages.get(chatId);
    
    if (!messages || !messages.length) {
        return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F No recently deleted messages!' }, { quoted: msg });
    }
    
    const recent = messages[0];
    const text = `*\u1F50E SNIPE - Last Deleted Message*\n\n` +
        `From: @${recent.sender.split('@')[0]}\n` +
        `Time: ${new Date(recent.time).toLocaleTimeString()}\n` +
        `Content: ${recent.text}`;
    
    await sock.sendMessage(chatId, { text, mentions: [recent.sender] }, { quoted: msg });
};

module.exports.handleSnipe = handleSnipe;
