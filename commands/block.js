module.exports = async function(sock, chatId, msg, isOwner, q) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .block <number>' }, { quoted: msg });
    
    try {
        const number = q.replace(/\D/g, '') + '@s.whatsapp.net';
        await sock.updateBlockStatus(number, 'block');
        await sock.sendMessage(chatId, { text: `\u1F512 Blocked +${q.replace(/\D/g, '')}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
