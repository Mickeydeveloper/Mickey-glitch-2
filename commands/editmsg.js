module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .editmsg <new text>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: q, edit: msg.key });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
