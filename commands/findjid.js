async function findJidCommand(sock, chatId, message) {
    try {
        if (typeof sock.findUserId !== 'function') {
            throw new Error('Baileys findUserId is unavailable');
        }

        const body = message?.message?.conversation
            || message?.message?.extendedTextMessage?.text
            || '';
        const phoneNumber = body
            .replace(/^[.!/#]?findjid\s*/i, '')
            .replace(/[^0-9]/g, '');

        if (!phoneNumber) {
            await sock.sendMessage(chatId, {
                text: '⚠️ Tumia: .findjid 255712345678'
            }, { quoted: message });
            return;
        }

        const result = await sock.findUserId(phoneNumber);
        await sock.sendMessage(chatId, {
            text: [
                '🏷️ *WhatsApp IDs*',
                `📞 PN: ${result?.phoneNumber || 'Haikupatikana'}`,
                `🪪 LID: ${result?.lid || 'Haikupatikana'}`
            ].join('\n')
        }, { quoted: message });
    } catch (error) {
        console.error('[findjid] Failed:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Imeshindikana kupata WhatsApp ID ya namba hiyo.'
        }, { quoted: message });
    }
}

module.exports = findJidCommand;