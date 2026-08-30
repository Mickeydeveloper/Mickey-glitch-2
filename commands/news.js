const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    try {
        await sock.sendMessage(chatId, { text: '\u1F4F0 Fetching news...' }, { quoted: msg });
        
        const category = q || 'general';
        
        // Using a free news API
        const response = await axios.get(`https://saurav.tech/NewsAPI/top-headlines/category/${category}/in.json`, { timeout: 10000 });
        const articles = response.data.articles.slice(0, 5);
        
        if (!articles.length) return await sock.sendMessage(chatId, { text: '\u274C No news found!' }, { quoted: msg });
        
        let text = `*\u1F4F0 Top News - ${category.toUpperCase()}*\n\n`;
        articles.forEach((article, i) => {
            text += `${i+1}. *${article.title}*\n` +
                `${article.description ? article.description.substring(0, 100) + '...' : ''}\n` +
                `\u1F517 ${article.url}\n\n`;
        });
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
