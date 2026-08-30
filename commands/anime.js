const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .anime <anime name>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F3A8 Searching anime...' }, { quoted: msg });
        
        const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=3`, { timeout: 10000 });
        const animes = response.data.data;
        
        if (!animes || !animes.length) return await sock.sendMessage(chatId, { text: '\u274C No anime found!' }, { quoted: msg });
        
        const anime = animes[0];
        const text = `*\u1F3A8 ${anime.title}*\n\n` +
            `\u2B50 Score: ${anime.score}/10\n` +
            `\u1F4DA Episodes: ${anime.episodes || 'Unknown'}\n` +
            `\u1F4C5 Status: ${anime.status}\n` +
            `\u1F4DC Genre: ${anime.genres.map(g => g.name).join(', ')}\n` +
            `\u1F4CB Synopsis: ${anime.synopsis?.substring(0, 300) || 'N/A'}...\n\n` +
            `\u1F517 ${anime.url}`;
        
        if (anime.images?.jpg?.image_url) {
            await sock.sendMessage(chatId, { image: { url: anime.images.jpg.image_url }, caption: text }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text }, { quoted: msg });
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
