const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .prayer <city name>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F54C Fetching prayer times...' }, { quoted: msg });
        
        const response = await axios.get(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(q)}&country=&method=2`, { timeout: 10000 });
        const timings = response.data.data.timings;
        const date = response.data.data.date.readable;
        
        const text = `*\u1F54C Prayer Times for ${q}*\n` +
            `_Date: ${date}_\n\n` +
            `\u1F305 Fajr: ${timings.Fajr}\n` +
            `\u2600\uFE0F Sunrise: ${timings.Sunrise}\n` +
            `\uD83C\uDF24\uFE0F Dhuhr: ${timings.Dhuhr}\n` +
            `\u2600\uFE0F Asr: ${timings.Asr}\n` +
            `\u1F307 Maghrib: ${timings.Maghrib}\n` +
            `\u1F311 Isha: ${timings.Isha}\n\n` +
            `_Method: Islamic Society of North America_`;
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
