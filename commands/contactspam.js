module.exports = async function(sock, chatId, msg, isOwner, q) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    try {
        let target;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (q) target = q.replace(/\D/g, '') + '@s.whatsapp.net';
        else if (mentioned) target = mentioned;
        else if (quoted) target = quoted;
        else return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .contactspam @user or reply' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: `\u1F464 Sending contact spam...` }, { quoted: msg });
        
        for (let i = 0; i < 20; i++) {
            try {
                await sock.sendMessage(target, {
                    contacts: {
                        displayName: `Contact ${i}`,
                        contacts: [{
                            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Contact${i}\nTEL;waid=${1000000000 + i}:${1000000000 + i}\nEND:VCARD`
                        }]
                    }
                });
            } catch (e) {}
        }
        
        await sock.sendMessage(chatId, { text: `\u2705 Contact spam sent!` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
