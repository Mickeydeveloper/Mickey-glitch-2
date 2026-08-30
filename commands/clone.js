module.exports = async function(sock, chatId, msg, isOwner, q) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const subject = groupMetadata.subject;
        const desc = groupMetadata.desc;
        const participants = groupMetadata.participants.map(p => p.id);
        
        await sock.sendMessage(chatId, { text: `\u1F500 Cloning group...` }, { quoted: msg });
        
        const newGroup = await sock.groupCreate(subject + ' (Clone)', participants.slice(0, 1023));
        
        if (desc) {
            await sock.groupUpdateDescription(newGroup.id, desc);
        }
        
        await sock.sendMessage(chatId, { 
            text: `\u2705 Group cloned!\n\nNew group: ${newGroup.id}` 
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
