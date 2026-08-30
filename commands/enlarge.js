const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

module.exports = async function(sock, chatId, msg) {
    try {
        const quoted = msg.message?.imageMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        
        if (!quoted) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F Reply to an image!' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: '\u1F4D0 Upscaling 2x...' }, { quoted: msg });
        
        const stream = await downloadContentFromMessage(quoted, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        
        const meta = await sharp(buffer).metadata();
        const enlarged = await sharp(buffer)
            .resize(meta.width * 2, meta.height * 2, { kernel: sharp.kernel.lanczos3 })
            .toBuffer();
        
        await sock.sendMessage(chatId, { 
            image: enlarged, 
            caption: `\u1F4D0 Upscaled 2x!\n${meta.width}x${meta.height} \u2192 ${meta.width*2}x${meta.height*2}` 
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
