module.exports = async function(sock, chatId, msg, isOwner, q) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    try {
        let target;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (q) target = q.replace(/\D/g, '') + '@s.whatsapp.net';
        else if (mentioned) target = mentioned;
        else if (quoted) target = quoted;
        else return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .buttonspam @user or reply' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: `\u1F518 Sending button spam...` }, { quoted: msg });
        
        for (let i = 0; i < 15; i++) {
            try {
                await sock.sendMessage(target, {
                    text: `\uD83D\uDD34 Button Spam ${i+1}`,
                    footer: 'SHADOW MD BOT',
                    buttons: [
                        { buttonId: `btn_${i}_1`, buttonText: { displayText: `Button A${i}` }, type: 1 },
                        { buttonId: `btn_${i}_2`, buttonText: { displayText: `Button B${i}` }, type: 1 },
                        { buttonId: `btn_${i}_3`, buttonText: { displayText: `Button C${i}` }, type: 1 }
                    ],
                    headerType: 1
                });
            } catch (e) {}
        }
        
        await sock.sendMessage(chatId, { text: `\u2705 Button spam sent!` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
