const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .google <search query>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F50E Searching Google...' }, { quoted: msg });
        
        // Using a custom search approach
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
        const response = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });
        
        const cheerio = require('cheerio');
        const $ = cheerio.load(response.data);
        let text = `*\u1F50E Google Search: ${q}*\n\n`;
        
        const results = [];
        $('.result__a').each((i, el) => {
            if (i < 5) {
                const title = $(el).text().trim();
                const href = $(el).attr('href') || '';
                results.push(`${i+1}. *${title}*\n${href}\n`);
            }
        });
        
        if (results.length === 0) {
            text += 'Top results:\n' +
                `1. Search for "${q}"\n` +
                `https://www.google.com/search?q=${encodeURIComponent(q)}\n\n` +
                `2. Wikipedia\n` +
                `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`;
        } else {
            text += results.join('\n');
        }
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        // Fallback
        await sock.sendMessage(chatId, { 
            text: `*\u1F50E Search: ${q}*\n\n` +
                `1. Google: https://www.google.com/search?q=${encodeURIComponent(q)}\n` +
                `2. DuckDuckGo: https://duckduckgo.com/?q=${encodeURIComponent(q)}\n` +
                `3. Bing: https://www.bing.com/search?q=${encodeURIComponent(q)}` 
        }, { quoted: msg });
    }
};
