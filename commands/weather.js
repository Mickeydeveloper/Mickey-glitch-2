const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .weather <city name>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u26C5 Fetching weather...' }, { quoted: msg });
        
        const response = await axios.get(`https://wttr.in/${encodeURIComponent(q)}?format=j1`, { timeout: 10000 });
        const current = response.data.current_condition[0];
        const area = response.data.nearest_area[0];
        
        const text = `*\u26C5 Weather in ${area.areaName[0].value}, ${area.country[0].value}*\n\n` +
            `\uD83C\uDF21\uFE0F Temperature: ${current.temp_C}\u00B0C / ${current.temp_F}\u00B0F\n` +
            `\uD83D\uDCA7 Humidity: ${current.humidity}%\n` +
            `\uD83D\uDCA8 Wind: ${current.windspeedKmph} km/h (${current.winddir16point})\n` +
            `\uD83D\uDC41\uFE0F Visibility: ${current.visibility} km\n` +
            `\uD83D\uDD14 Description: ${current.weatherDesc[0].value}\n` +
            `\uD83D\uDD52 Local Time: ${area.localTime}`;
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
