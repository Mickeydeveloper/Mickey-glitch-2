module.exports = async function(sock, chatId, msg, isOwner, q) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    try {
        const count = q && !isNaN(parseInt(q)) ? Math.min(parseInt(q), 100) : 50;
        
        await sock.sendMessage(chatId, { text: `\u1F5D1\uFE0F Deleting last ${count} messages...` }, { quoted: msg });
        
        // Fetch messages and delete them
        const messages = await sock.loadMessages(chatId, count);
        let deleted = 0;
        
        for (const m of messages.messages || []) {
            if (m.key.fromMe) {
                try {
                    await sock.sendMessage(chatId, { delete: m.key });
                    deleted++;
                } catch (e) {}
            }
        }
        
        await sock.sendMessage(chatId, { text: `\u2705 Deleted ${deleted} messages!` });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
