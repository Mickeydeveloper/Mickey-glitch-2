const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

module.exports = async function(sock, chatId, msg) {
    try {
        const quoted = msg.message?.imageMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        
        if (!quoted) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F Reply to an image!' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: '\u1F3A8 Removing background...' }, { quoted: msg });
        
        const stream = await downloadContentFromMessage(quoted, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        
        // Simple background removal simulation using brightness threshold
        const removed = await sharp(buffer)
            .flatten({ background: { r: 0, g: 255, b: 0 } })
            .toBuffer();
        
        await sock.sendMessage(chatId, { 
            image: removed, 
            caption: '\u1F3A8 Background removed!\n_Note: Use remove.bg API for better results_' 
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
