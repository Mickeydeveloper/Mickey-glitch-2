const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .ascii <text>' }, { quoted: msg });
    
    try {
        const response = await axios.get(`https://artii.herokuapp.com/make?text=${encodeURIComponent(q.substring(0, 20))}`, { timeout: 10000 });
        const art = response.data;
        
        await sock.sendMessage(chatId, { 
            text: `*\u1F3A8 ASCII Art:*\n\n\`\`\`\n${art}\n\`\`\`` 
        }, { quoted: msg });
    } catch (e) {
        // Simple fallback ASCII
        const text = q.toUpperCase().substring(0, 15);
        const line = '='.repeat(text.length + 4);
        const ascii = `${line}\n| ${text} |\n${line}`;
        await sock.sendMessage(chatId, { text: `*\u1F3A8 ASCII Art:*\n\n\`\`\`\n${ascii}\n\`\`\`` }, { quoted: msg });
    }
};
