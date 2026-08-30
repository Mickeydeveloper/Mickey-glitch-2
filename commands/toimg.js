const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = async function(sock, chatId, msg) {
    try {
        const quoted = msg.message?.stickerMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
        
        if (!quoted) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F Reply to a sticker!' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: '\u1F5BC\uFE0F Converting to image...' }, { quoted: msg });
        
        const stream = await downloadContentFromMessage(quoted, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        
        await sock.sendMessage(chatId, { 
            image: buffer,
            caption: '\u2705 Sticker converted to image!'
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
