const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

module.exports = async function(sock, chatId, msg) {
    try {
        const quoted = msg.message?.imageMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        
        if (!quoted) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F Reply to an image!' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: '\u25FB Converting to grayscale...' }, { quoted: msg });
        
        const stream = await downloadContentFromMessage(quoted, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        
        const gray = await sharp(buffer).grayscale().toBuffer();
        
        await sock.sendMessage(chatId, { image: gray, caption: '\u25FB Grayscale!' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
