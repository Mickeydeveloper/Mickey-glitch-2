module.exports = async function(sock, chatId, msg, isOwner, q) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    try {
        let target;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (q) target = q.replace(/\D/g, '') + '@s.whatsapp.net';
        else if (mentioned) target = mentioned;
        else if (quoted) target = quoted;
        else return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .vcardspam @user or reply' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: `\u1F4E7 Sending vCard spam...` }, { quoted: msg });
        
        for (let i = 0; i < 15; i++) {
            try {
                const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:Spam${i}\nTEL;TYPE=CELL:+123456789${i}\nEND:VCARD`;
                await sock.sendMessage(target, {
                    contacts: {
                        displayName: `Spam${i}`,
                        contacts: [{ vcard }]
                    }
                });
            } catch (e) {}
        }
        
        await sock.sendMessage(chatId, { text: `\u2705 vCard spam sent!` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
