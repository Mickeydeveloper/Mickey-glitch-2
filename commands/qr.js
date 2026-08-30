module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .qr <text/url>' }, { quoted: msg });
    
    try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(q)}`;
        await sock.sendMessage(chatId, { 
            image: { url: qrUrl }, 
            caption: `*\u1F4F7 QR Code for:*\n\n${q}` 
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
