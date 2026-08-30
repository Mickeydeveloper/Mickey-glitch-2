module.exports = async function(sock, chatId, msg, isAdmin) {
    if (!isAdmin) return await sock.sendMessage(chatId, { text: '\u274C Only admin!' }, { quoted: msg });
    
    try {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length === 0) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (quoted) {
                await sock.groupParticipantsUpdate(chatId, [quoted], 'promote');
                return await sock.sendMessage(chatId, { text: '\u2705 User promoted to admin!' }, { quoted: msg });
            }
            return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F Mention a user!' }, { quoted: msg });
        }
        await sock.groupParticipantsUpdate(chatId, mentioned, 'promote');
        await sock.sendMessage(chatId, { text: `\u2705 Promoted ${mentioned.length} user(s)!` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
