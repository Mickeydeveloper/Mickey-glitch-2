module.exports = async function(sock, chatId, msg, isAdmin) {
    if (!isAdmin) return await sock.sendMessage(chatId, { text: '\u274C Only admin!' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F6AA Leaving group... Goodbye!' });
        await sock.groupLeave(chatId);
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
