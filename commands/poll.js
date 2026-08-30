module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .poll <question|option1|option2>' }, { quoted: msg });
    
    try {
        const parts = q.split('|');
        const question = parts[0].trim();
        const options = parts.slice(1).map(o => o.trim()).filter(o => o);
        
        if (options.length < 2) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F Provide at least 2 options separated by |' }, { quoted: msg });
        
        await sock.sendMessage(chatId, {
            poll: {
                name: question,
                values: options,
                selectableCount: 1
            }
        });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
