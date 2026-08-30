module.exports = async function(sock, chatId, msg) {
    await sock.sendMessage(chatId, { text: '\u1F4BE Saved message bookmark!' }, { quoted: msg });
};
