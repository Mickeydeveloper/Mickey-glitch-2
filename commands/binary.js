module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .binary <text>' }, { quoted: msg });
    
    let binary = '';
    for (let i = 0; i < q.length; i++) {
        binary += q[i].charCodeAt(0).toString(2).padStart(8, '0') + ' ';
    }
    
    await sock.sendMessage(chatId, { 
        text: `*\u1F4BB Binary*\n\nText: ${q}\n\nBinary:\n${binary.trim()}` 
    }, { quoted: msg });
};
