const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .define <word>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F4D6 Looking up definition...' }, { quoted: msg });
        
        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`, { timeout: 10000 });
        const entry = response.data[0];
        
        let text = `*\u1F4D6 ${entry.word}*${entry.phonetic ? ' ' + entry.phonetic : ''}\n\n`;
        
        entry.meanings.forEach((meaning, i) => {
            text += `*${i+1}. ${meaning.partOfSpeech}*\n`;
            meaning.definitions.slice(0, 3).forEach((def, j) => {
                text += `   ${j+1}. ${def.definition}\n`;
                if (def.example) text += `      _"${def.example}"_\n`;
            });
            text += '\n';
        });
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: `\u274C No definition found for "${q}"` }, { quoted: msg });
    }
};
