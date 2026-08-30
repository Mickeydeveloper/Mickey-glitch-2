const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .pinterest <search>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F50E Searching Pinterest...' }, { quoted: msg });
        
        const response = await axios.get(`https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(q)}&data=%7B%22options%22%3A%7B%22filters%22%3A%22%22%2C%22page_size%22%3A10%7D%2C%22context%22%3A%7B%7D%7D`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }).catch(() => null);
        
        // Fallback: use a simple image search API
        const fallback = await axios.get(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=5&client_id=demo`, { timeout: 5000 }).catch(() => null);
        
        if (!fallback || !fallback.data?.results?.length) {
            // Simple fallback using random image
            await sock.sendMessage(chatId, { 
                image: { url: `https://image.pollinations.ai/prompt/${encodeURIComponent(q)}?width=1024&height=1024&nologo=true` },
                caption: `*\u1F4F7 Pinterest: ${q}*\n\n_Powered by SHADOW MD BOT_`
            }, { quoted: msg });
        } else {
            const img = fallback.data.results[0];
            await sock.sendMessage(chatId, { 
                image: { url: img.urls.regular },
                caption: `*\u1F4F7 Result for: ${q}*\n\nBy: ${img.user.name}\n_Powered by SHADOW MD BOT_`
            }, { quoted: msg });
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
