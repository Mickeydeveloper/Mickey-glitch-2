module.exports = async function(sock, chatId, msg, q) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    
    if (!mentioned.length) {
        return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F Mention someone!' }, { quoted: msg });
    }
    
    const text = q || 'Hey there!';
    const mentionsText = mentioned.map(jid => `@${jid.split('@')[0]}`).join(' ');
    
    await sock.sendMessage(chatId, { 
        text: `${mentionsText}\n\n${text}`,
        mentions: mentioned
    }, { quoted: msg });
};
