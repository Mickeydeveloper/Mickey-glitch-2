const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .reddit <subreddit>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F47E Fetching from Reddit...' }, { quoted: msg });
        
        const subreddit = q.replace('r/', '').trim();
        const response = await axios.get(`https://www.reddit.com/r/${subreddit}/hot.json?limit=5`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        
        const posts = response.data.data.children;
        if (!posts.length) return await sock.sendMessage(chatId, { text: '\u274C No posts found!' }, { quoted: msg });
        
        let text = `*\u1F47E r/${subreddit} - Hot Posts*\n\n`;
        for (let i = 0; i < Math.min(5, posts.length); i++) {
            const post = posts[i].data;
            text += `${i+1}. *${post.title}*\n` +
                `\u2B06\uFE0F ${post.ups} upvotes | \u1F4AC ${post.num_comments} comments\n` +
                `\u1F517 https://reddit.com${post.permalink}\n\n`;
        }
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
