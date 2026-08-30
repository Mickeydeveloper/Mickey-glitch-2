const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .playstore <app name>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F3AE Searching Play Store...' }, { quoted: msg });
        
        const url = `https://play.google.com/store/search?q=${encodeURIComponent(q)}&c=apps`;
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10)' },
            timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        const apps = [];
        
        $('a[href*="/store/apps/details"]').slice(0, 5).each((i, el) => {
            const href = $(el).attr('href');
            const name = $(el).find('span').first().text().trim() || 'Unknown';
            if (href && href.includes('id=')) {
                const id = href.split('id=')[1];
                apps.push({ name, id, url: `https://play.google.com${href}` });
            }
        });
        
        if (!apps.length) {
            return await sock.sendMessage(chatId, { 
                text: `*\u1F3AE Play Store: ${q}*\n\nhttps://play.google.com/store/search?q=${encodeURIComponent(q)}&c=apps` 
            }, { quoted: msg });
        }
        
        let text = `*\u1F3AE Play Store Results: ${q}*\n\n`;
        apps.forEach((app, i) => {
            text += `${i+1}. *${app.name}*\n\u1F517 ${app.url}\n\n`;
        });
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { 
            text: `*\u1F3AE Play Store: ${q}*\n\nhttps://play.google.com/store/search?q=${encodeURIComponent(q)}&c=apps` 
        }, { quoted: msg });
    }
};
