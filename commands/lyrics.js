const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .lyrics <song name>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F3B5 Searching lyrics...' }, { quoted: msg });
        
        // Using a lyrics API
        const response = await axios.get(`https://lyrist.vercel.app/api/${encodeURIComponent(q)}`, { timeout: 10000 });
        
        if (response.data.lyrics) {
            const text = `*\u1F3B5 ${response.data.title}*\n` +
                `_by ${response.data.artist}_\n\n` +
                `${response.data.lyrics.substring(0, 3000)}\n\n` +
                `${response.data.lyrics.length > 3000 ? '_... (truncated)_' : ''}`;
            
            await sock.sendMessage(chatId, { text }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { 
                text: `\u274C Lyrics not found for "${q}"\n\nTry: https://genius.com/search?q=${encodeURIComponent(q)}` 
            }, { quoted: msg });
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
