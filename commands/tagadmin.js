module.exports = async function(sock, chatId, msg, isAdmin) {
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const admins = groupMetadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        
        if (admins.length === 0) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F No admins found!' }, { quoted: msg });
        
        let text = '*\u1F4EF Tagging all admins:*\n\n';
        const mentions = [];
        for (const admin of admins) {
            text += `@${admin.id.split('@')[0]}\n`;
            mentions.push(admin.id);
        }
        
        await sock.sendMessage(chatId, { text, mentions }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
