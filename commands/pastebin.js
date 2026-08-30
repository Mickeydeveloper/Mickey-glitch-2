const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .pastebin <text>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F4CB Creating paste...' }, { quoted: msg });
        
        // Use a simple paste service
        const response = await axios.post('https://api.paste.ee/v1/pastes', {
            sections: [{ contents: q }]
        }, {
            headers: { 'X-Auth-Token': 'public' },
            timeout: 10000
        }).catch(() => null);
        
        if (response && response.data?.link) {
            await sock.sendMessage(chatId, { 
                text: `*\u1F4CB Paste Created!*\n\nLink: ${response.data.link}` 
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { 
                text: `*\u1F4CB Your Text*\n\n${q.substring(0, 3000)}\n\n_${q.length > 3000 ? '... (truncated)' : ''}_` 
            }, { quoted: msg });
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
