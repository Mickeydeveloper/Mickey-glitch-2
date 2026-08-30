module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .hex <text>' }, { quoted: msg });
    
    let hex = '';
    for (let i = 0; i < q.length; i++) {
        hex += q[i].charCodeAt(0).toString(16).padStart(2, '0') + ' ';
    }
    
    await sock.sendMessage(chatId, { 
        text: `*\u1F9EA Hex*\n\nText: ${q}\n\nHex:\n${hex.trim().toUpperCase()}` 
    }, { quoted: msg });
};
