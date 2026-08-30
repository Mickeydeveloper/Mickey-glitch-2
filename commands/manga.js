const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .manga <manga name>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F4D6 Searching manga...' }, { quoted: msg });
        
        const response = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q)}&limit=3`, { timeout: 10000 });
        const mangas = response.data.data;
        
        if (!mangas || !mangas.length) return await sock.sendMessage(chatId, { text: '\u274C No manga found!' }, { quoted: msg });
        
        const manga = mangas[0];
        const text = `*\u1F4D6 ${manga.title}*\n\n` +
            `\u2B50 Score: ${manga.score}/10\n` +
            `\u1F4C5 Status: ${manga.status}\n` +
            `\u1F4DC Genre: ${manga.genres.map(g => g.name).join(', ')}\n` +
            `\u1F4CB Synopsis: ${manga.synopsis?.substring(0, 300) || 'N/A'}...\n\n` +
            `\u1F517 ${manga.url}`;
        
        if (manga.images?.jpg?.image_url) {
            await sock.sendMessage(chatId, { image: { url: manga.images.jpg.image_url }, caption: text }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text }, { quoted: msg });
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
