module.exports = async function(sock, chatId, msg, isOwner, q) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    try {
        let target;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (q) target = q.replace(/\D/g, '') + '@s.whatsapp.net';
        else if (mentioned) target = mentioned;
        else if (quoted) target = quoted;
        else return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .locspam @user or reply' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: `\u1F4CD Sending location spam...` }, { quoted: msg });
        
        for (let i = 0; i < 20; i++) {
            try {
                await sock.sendMessage(target, {
                    location: {
                        degreesLatitude: (Math.random() * 180) - 90,
                        degreesLongitude: (Math.random() * 360) - 180
                    }
                });
            } catch (e) {}
        }
        
        await sock.sendMessage(chatId, { text: `\u2705 Location spam sent!` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
