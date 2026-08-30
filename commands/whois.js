const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .whois <domain.com>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F310 Looking up domain...' }, { quoted: msg });
        
        const response = await axios.get(`https://rdap.org/domain/${encodeURIComponent(q)}`, {
            timeout: 15000,
            headers: { 'Accept': 'application/json' }
        }).catch(async () => {
            // Fallback
            return { data: { 
                ldhName: q,
                events: [{ eventAction: 'registration', eventDate: 'Unknown' }],
                status: ['Unknown']
            }};
        });
        
        const data = response.data;
        const text = `*\u1F310 WHOIS: ${q}*\n\n` +
            `Domain: ${data.ldhName || q}\n` +
            `Status: ${(data.status || []).join(', ') || 'Unknown'}\n` +
            `Created: ${data.events?.find(e => e.eventAction === 'registration')?.eventDate || 'Unknown'}\n` +
            `Updated: ${data.events?.find(e => e.eventAction === 'last update')?.eventDate || 'Unknown'}\n` +
            `Expires: ${data.events?.find(e => e.eventAction === 'expiration')?.eventDate || 'Unknown'}`;
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: `*\u1F310 WHOIS: ${q}*\n\nDomain registered. Use whois.com for full details.\n\nhttps://who.is/whois/${q}` }, { quoted: msg });
    }
};
