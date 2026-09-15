async function typingCommand(sock, chatId, message) {
    try {
        const body = message?.message?.conversation
            || message?.message?.extendedTextMessage?.text
            || '';
        const seconds = Math.min(
            Math.max(Number(body.replace(/^[.!/#]?typing\s*/i, '').trim()) || 3, 1),
            10
        );

        await sock.sendPresenceUpdate('composing', chatId);
        setTimeout(() => {
            sock.sendPresenceUpdate('paused', chatId).catch(() => {});
        }, seconds * 1000);

        await sock.sendMessage(chatId, {
            text: `⌨️ Typing presence imetumwa kwa sekunde ${seconds}.`
        }, { quoted: message });
    } catch (error) {
        console.error('[typing] Failed:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Imeshindikana kutuma typing presence.'
        }, { quoted: message });
    }
}

module.exports = typingCommand;