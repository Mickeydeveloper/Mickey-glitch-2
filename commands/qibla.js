const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .qibla <city name>' }, { quoted: msg });
    
    try {
        // Get city coordinates
        const geoResponse = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`, { timeout: 10000 });
        
        if (!geoResponse.data.length) return await sock.sendMessage(chatId, { text: '\u274C City not found!' }, { quoted: msg });
        
        const lat = geoResponse.data[0].lat;
        const lon = geoResponse.data[0].lon;
        
        const response = await axios.get(`https://api.aladhan.com/v1/qibla/${lat}/${lon}`, { timeout: 10000 });
        const direction = response.data.data.direction;
        
        const text = `*\u1F949 Qibla Direction for ${q}*\n\n` +
            `Latitude: ${lat}\n` +
            `Longitude: ${lon}\n` +
            `Direction: *${Math.round(direction)}\u00B0* from North\n\n` +
            `Face ${Math.round(direction)}\u00B0 clockwise from North for Qibla.`;
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
