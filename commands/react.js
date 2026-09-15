async function reactCommand(sock, chatId, message) {
    try {
        const body = message?.message?.conversation
            || message?.message?.extendedTextMessage?.text
            || '';
        const emoji = body.replace(/^[.!/#]?react\s*/i, '').trim() || '❤️';
        const contextInfo = message?.message?.extendedTextMessage?.contextInfo;
        const quotedKey = message?.quoted?.key || (contextInfo?.stanzaId ? {
            remoteJid: chatId,
            id: contextInfo.stanzaId,
            participant: contextInfo.participant,
            fromMe: false
        } : message?.key);

        await sock.sendMessage(chatId, {
            react: { text: emoji, key: quotedKey }
        });
    } catch (error) {
        console.error('[react] Failed:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Imeshindikana kuweka reaction.'
        }, { quoted: message });
    }
}

module.exports = reactCommand;