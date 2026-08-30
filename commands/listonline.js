module.exports = async function(sock, chatId, msg) {
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;
        
        let text = `*\u1F465 Online Members*\n\n` +
            `Total members: ${participants.length}\n\n` +
            `*Participants:*\n`;
        
        participants.forEach((p, i) => {
            text += `${i+1}. @${p.id.split('@')[0]} ${p.admin === 'superadmin' ? '\u1F451' : p.admin === 'admin' ? '\u1F51D' : ''}\n`;
        });
        
        await sock.sendMessage(chatId, { text, mentions: participants.map(p => p.id) }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
