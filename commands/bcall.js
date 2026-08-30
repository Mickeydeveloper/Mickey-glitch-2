module.exports = async function(sock, chatId, msg, isOwner, q) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .bcall <message>' }, { quoted: msg });
    
    try {
        const allChats = Object.keys(sock.chats).filter(jid => jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us'));
        await sock.sendMessage(chatId, { text: `\u1F4E3 Broadcasting to ${allChats.length} chats...` }, { quoted: msg });
        
        let sent = 0;
        for (const jid of allChats) {
            try {
                await sock.sendMessage(jid, { text: `*\u1F4E3 BROADCAST*\n\n${q}\n\n_From: SHADOW MD BOT Owner_` });
                sent++;
            } catch (e) {}
        }
        
        await sock.sendMessage(chatId, { text: `\u2705 Broadcast sent to ${sent} chats!` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
