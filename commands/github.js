const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .github <username>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F431 Fetching GitHub profile...' }, { quoted: msg });
        
        const response = await axios.get(`https://api.github.com/users/${encodeURIComponent(q)}`, { timeout: 10000 });
        const user = response.data;
        
        const text = `*\u1F431 GitHub: ${user.login}*\n\n` +
            `${user.bio ? '*Bio:* ' + user.bio + '\n' : ''}` +
            `\u1F464 Name: ${user.name || 'N/A'}\n` +
            `\u1F4CD Location: ${user.location || 'N/A'}\n` +
            `\u1F3E2 Company: ${user.company || 'N/A'}\n` +
            `\u1F4DD Public Repos: ${user.public_repos}\n` +
            `\u1F465 Followers: ${user.followers} | Following: ${user.following}\n` +
            `\u1F4C5 Joined: ${new Date(user.created_at).toLocaleDateString()}\n` +
            `\u1F517 ${user.html_url}`;
        
        if (user.avatar_url) {
            await sock.sendMessage(chatId, { image: { url: user.avatar_url }, caption: text }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text }, { quoted: msg });
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C User not found or error: ' + e.message }, { quoted: msg });
    }
};
