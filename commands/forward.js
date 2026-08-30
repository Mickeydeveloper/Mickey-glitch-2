module.exports = async function(sock, chatId, msg, isOwner, q) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .fwd <number>' }, { quoted: msg });
    
    try {
        const number = q.replace(/\D/g, '') + '@s.whatsapp.net';
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
        
        if (!quotedMsg) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F Reply to a message to forward!' }, { quoted: msg });
        
        await sock.sendMessage(number, { forward: msg });
        await sock.sendMessage(chatId, { text: `\u2705 Message forwarded to ${q}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
