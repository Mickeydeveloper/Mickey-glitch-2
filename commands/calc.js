module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .calc <expression>' }, { quoted: msg });
    
    try {
        // Safe evaluation - only allow math operations
        const sanitized = q.replace(/[^0-9+\-*/().\s%^]/g, '');
        if (!sanitized) return await sock.sendMessage(chatId, { text: '\u274C Invalid expression!' }, { quoted: msg });
        
        const result = Function('"use strict"; return (' + sanitized + ')')();
        
        await sock.sendMessage(chatId, { 
            text: `*\u1F4CA Calculator*\n\n` +
                `Expression: ${sanitized}\n` +
                `Result: *${result}*` 
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Math error: ' + e.message }, { quoted: msg });
    }
};
