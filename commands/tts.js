const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .tts <text>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F442 Generating TTS...' }, { quoted: msg });
        
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=en&client=tw-ob`;
        
        const response = await axios.get(ttsUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });
        
        await sock.sendMessage(chatId, { 
            audio: Buffer.from(response.data),
            mimetype: 'audio/mp4',
            ptt: true
        }, { quoted: msg });
    } catch (e) {
        // Fallback: just send as text message
        await sock.sendMessage(chatId, { text: `\u1F442 TTS: "${q}"` }, { quoted: msg });
    }
};
