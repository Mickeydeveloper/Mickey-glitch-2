const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .twitter <url>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F426 Fetching tweet...' }, { quoted: msg });
        
        // Use a tweet extraction API
        const tweetId = q.match(/status\/(\d+)/)?.[1];
        if (!tweetId) {
            return await sock.sendMessage(chatId, { text: '\u274C Invalid Twitter URL!' }, { quoted: msg });
        }
        
        await sock.sendMessage(chatId, { 
            text: `*\u1F426 Twitter Post*\n\n` +
                `Tweet ID: ${tweetId}\n` +
                `URL: ${q}\n\n` +
                `_Note: Use a download service for media extraction_`
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
