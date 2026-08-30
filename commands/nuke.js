module.exports = async function(sock, chatId, msg, isOwner) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    const isGroup = chatId.endsWith('@g.us');
    if (!isGroup) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F This command only works in groups!' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F4A3 NUKING GROUP IN 5 SECONDS...' }, { quoted: msg });
        
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants
            .filter(p => p.id !== sock.user.id)
            .map(p => p.id);
        
        // Remove all participants
        await sock.groupParticipantsUpdate(chatId, participants, 'remove');
        
        // Clear messages by sending delete
        await sock.sendMessage(chatId, { text: '\u1F4A3 GROUP NUKED! All members removed.' });
        
        // Leave group
        await sock.groupLeave(chatId);
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Nuke failed: ' + e.message }, { quoted: msg });
    }
};
