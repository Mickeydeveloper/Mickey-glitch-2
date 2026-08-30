module.exports = async function(sock, chatId, msg, isAdmin) {
    if (!isAdmin) return await sock.sendMessage(chatId, { text: '\u274C Only admin!' }, { quoted: msg });
    
    try {
        const code = await sock.groupRevokeInvite(chatId);
        await sock.sendMessage(chatId, { text: `\u2705 Group link revoked!\n\nNew link: https://chat.whatsapp.com/${code}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
