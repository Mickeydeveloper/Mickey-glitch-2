module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .react <emoji>' }, { quoted: msg });
    
    try {
        const emoji = q.trim();
        const quotedKey = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const quotedRemote = msg.message?.extendedTextMessage?.contextInfo?.remoteJid || chatId;
        const quotedFromMe = msg.message?.extendedTextMessage?.contextInfo?.participant === sock.user.id;
        const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (quotedKey) {
            await sock.sendMessage(chatId, { 
                react: { text: emoji, key: { remoteJid: quotedRemote, fromMe: quotedFromMe, id: quotedKey, participant: quotedParticipant } }
            });
        } else {
            await sock.sendMessage(chatId, { react: { text: emoji, key: msg.key } });
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
