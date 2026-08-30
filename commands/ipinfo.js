const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    try {
        if (!q) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ Usage: .ipinfo 8.8.8.8\n\nEnter an IP address to lookup.' 
            }, { quoted: msg });
        }

        const ip = q.trim();
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

        if (!ipRegex.test(ip)) {
            return await sock.sendMessage(chatId, { text: '❌ Invalid IP address format!' }, { quoted: msg });
        }

        try {
            const response = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 5000 });
            const data = response.data;

            const text = `🌐 *SHADOW IP INFO* 🌐\n\n` +
                         `📍 *IP:* ${data.ip || ip}\n` +
                         `🏙️ *City:* ${data.city || 'N/A'}\n` +
                         `🏛️ *Region:* ${data.region || 'N/A'}\n` +
                         `🌍 *Country:* ${data.country_name || 'N/A'} (${data.country || 'N/A'})\n` +
                         `📮 *Postal:* ${data.postal || 'N/A'}\n` +
                         `🌐 *ISP:* ${data.org || 'N/A'}\n` +
                         `📡 *ASN:* ${data.asn || 'N/A'}\n` +
                         `⏰ *Timezone:* ${data.timezone || 'N/A'}\n\n` +
                         `_Powered by Shadow MD Bot_`;

            await sock.sendMessage(chatId, { text }, { quoted: msg });
        } catch (apiErr) {
            const text = `🌐 *SHADOW IP INFO* 🌐\n\n` +
                         `📍 *IP:* ${ip}\n` +
                         `⚠️ *Status:* API limit reached or IP not found\n` +
                         `🔄 Try again later or use a different IP.\n\n` +
                         `_Powered by Shadow MD Bot_`;
            await sock.sendMessage(chatId, { text }, { quoted: msg });
        }
    } catch (err) {
        await sock.sendMessage(chatId, { text: '❌ Error: ' + err.message }, { quoted: msg });
    }
};
