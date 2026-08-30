module.exports = async function(sock, chatId, msg) {
    await sock.sendMessage(chatId, { text: '\u1F5D1\uFE0F Clearing chat...\n\nThis will delete bot messages.' }, { quoted: msg });
};
