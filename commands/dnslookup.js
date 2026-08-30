const dns = require('dns').promises;

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .dnslookup <domain.com>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F4E1 Looking up DNS...' }, { quoted: msg });
        
        const [aRecords, aaaaRecords, mxRecords, txtRecords, nsRecords] = await Promise.allSettled([
            dns.resolve4(q),
            dns.resolve6(q).catch(() => []),
            dns.resolveMx(q),
            dns.resolveTxt(q),
            dns.resolveNs(q)
        ]);
        
        let text = `*\u1F4E1 DNS Lookup: ${q}*\n\n`;
        
        text += `*\u1F310 A Records:*\n${aRecords.status === 'fulfilled' ? aRecords.value.join('\n') : 'None'}\n\n`;
        text += `*\u1F310 AAAA Records:*\n${aaaaRecords.status === 'fulfilled' && aaaaRecords.value.length ? aaaaRecords.value.join('\n') : 'None'}\n\n`;
        text += `*\u2709\uFE0F MX Records:*\n${mxRecords.status === 'fulfilled' ? mxRecords.value.map(r => `${r.exchange} (priority: ${r.priority})`).join('\n') : 'None'}\n\n`;
        text += `*\u1F4CB TXT Records:*\n${txtRecords.status === 'fulfilled' ? txtRecords.value.map(r => r.join('')).join('\n') : 'None'}\n\n`;
        text += `*\u1F310 NS Records:*\n${nsRecords.status === 'fulfilled' ? nsRecords.value.join('\n') : 'None'}`;
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C DNS Error: ' + e.message }, { quoted: msg });
    }
};
