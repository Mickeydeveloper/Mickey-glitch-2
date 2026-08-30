const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

module.exports = async function(sock, chatId, msg) {
    try {
        const quoted = msg.message?.imageMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        
        if (!quoted) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F Reply to an image!' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: '\u2702\uFE0F Cropping to square...' }, { quoted: msg });
        
        const stream = await downloadContentFromMessage(quoted, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        
        const meta = await sharp(buffer).metadata();
        const size = Math.min(meta.width, meta.height);
        const left = Math.floor((meta.width - size) / 2);
        const top = Math.floor((meta.height - size) / 2);
        
        const cropped = await sharp(buffer).extract({ left, top, width: size, height: size }).toBuffer();
        
        await sock.sendMessage(chatId, { image: cropped, caption: '\u2702\uFE0F Cropped!' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
