const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

module.exports = async function(sock, chatId, msg) {
    try {
        const quoted = msg.message?.imageMessage || msg.message?.videoMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;
        
        if (!quoted) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F Reply to an image/video!' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: '\u2728 Converting to sticker...' }, { quoted: msg });
        
        const type = quoted.imageMessage ? 'image' : 'video';
        const stream = await downloadContentFromMessage(quoted[type + 'Message'] || quoted, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        
        const tmpFile = path.join(__dirname, '..', 'data', `sticker_${Date.now()}.webp`);
        
        if (type === 'image') {
            await sharp(buffer)
                .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .webp({ quality: 80 })
                .toFile(tmpFile);
        }
        
        const stickerBuffer = await fs.readFile(tmpFile);
        await sock.sendMessage(chatId, { 
            sticker: stickerBuffer 
        }, { quoted: msg });
        
        await fs.remove(tmpFile);
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
