const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

module.exports = async function(sock, chatId, msg) {
    try {
        const quoted = msg.message?.imageMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        
        if (!quoted) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F Reply to an image!' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: '\u1FA90 Applying blur...' }, { quoted: msg });
        
        const stream = await downloadContentFromMessage(quoted, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        
        const blurred = await sharp(buffer).blur(8).toBuffer();
        
        await sock.sendMessage(chatId, { image: blurred, caption: '\u1FA90 Blurred!' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
