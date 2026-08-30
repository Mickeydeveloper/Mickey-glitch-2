module.exports = async function(sock, chatId, msg, isAdmin, q) {
    if (!isAdmin) return await sock.sendMessage(chatId, { text: '\u274C Only admin!' }, { quoted: msg });
    
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants.map(p => p.id);
        
        let text = '*\u1F4AC Everyone Message*\n\n';
        participants.forEach(p => { text += `@${p.split('@')[0]} `; });
        text += `\n\n${q || 'Hello everyone!'}`;
        
        await sock.sendMessage(chatId, { text, mentions: participants }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
