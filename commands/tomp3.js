const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = async function(sock, chatId, msg) {
    try {
        const quoted = msg.message?.videoMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;
        
        if (!quoted) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F Reply to a video!' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { text: '\u1F3B5 Converting to MP3...' }, { quoted: msg });
        
        const stream = await downloadContentFromMessage(quoted, 'video');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        
        await sock.sendMessage(chatId, { 
            document: buffer,
            mimetype: 'audio/mpeg',
            fileName: 'converted.mp3'
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
