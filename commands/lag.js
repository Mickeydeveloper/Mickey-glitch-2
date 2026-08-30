module.exports = async function(sock, chatId, msg, isOwner, q) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    try {
        let target;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (q) target = q.replace(/\D/g, '') + '@s.whatsapp.net';
        else if (mentioned) target = mentioned;
        else if (quoted) target = quoted;
        else return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .lag @user or reply to user' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: `\u1F40C Lagging @${target.split('@')[0]}...`, mentions: [target] }, { quoted: msg });
        
        // Rapid fire messages to cause lag
        const lagText = Array(100).fill('\uD83D\uDC0C').join('');
        for (let i = 0; i < 30; i++) {
            try {
                await sock.sendMessage(target, { text: lagText });
            } catch (e) {}
        }
        
        await sock.sendMessage(chatId, { text: `\u1F40C Lag payload sent!` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
