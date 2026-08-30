const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .shorturl <long url>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F517 Shortening URL...' }, { quoted: msg });
        
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(q)}`, { timeout: 10000 });
        
        await sock.sendMessage(chatId, { 
            text: `*\u1F517 Shortened URL*\n\n` +
                `*Original:* ${q}\n` +
                `*Short:* ${response.data}` 
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
