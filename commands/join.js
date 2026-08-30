module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .join <whatsapp group link>' }, { quoted: msg });
    
    try {
        const inviteCode = q.split('chat.whatsapp.com/')[1]?.split('?')[0];
        if (!inviteCode) return await sock.sendMessage(chatId, { text: '\u274C Invalid link!' }, { quoted: msg });
        
        const response = await sock.groupAcceptInvite(inviteCode);
        await sock.sendMessage(chatId, { text: `\u2705 Joined group!\nGID: ${response}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Failed: ' + e.message }, { quoted: msg });
    }
};
