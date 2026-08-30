module.exports = async function(sock, chatId, msg) {
    try {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        let user1, user2;
        if (mentioned.length >= 2) {
            user1 = mentioned[0];
            user2 = mentioned[1];
        } else if (mentioned.length === 1) {
            user1 = msg.key.participant || msg.key.remoteJid;
            user2 = mentioned[0];
        } else {
            return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F Mention 2 people or 1 person to ship with yourself!' }, { quoted: msg });
        }
        
        const percent = Math.floor(Math.random() * 101);
        let emoji, text;
        
        if (percent >= 90) { emoji = '\u1F495'; text = 'Soulmates!'; }
        else if (percent >= 70) { emoji = '\u1F49E'; text = 'Great match!'; }
        else if (percent >= 50) { emoji = '\u1F49C'; text = 'Not bad!'; }
        else if (percent >= 30) { emoji = '\u1F499'; text = 'Maybe...'; }
        else { emoji = '\u1F494'; text = 'Better as friends!'; }
        
        const bar = '\u2588'.repeat(Math.floor(percent/10)) + '\u2591'.repeat(10 - Math.floor(percent/10));
        
        await sock.sendMessage(chatId, { 
            text: `*\u1F495 SHIP METER ${emoji}*\n\n` +
                `@${user1.split('@')[0]} + @${user2.split('@')[0]}\n\n` +
                `*[${bar}] ${percent}%*\n` +
                `_${text}_`,
            mentions: [user1, user2]
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
