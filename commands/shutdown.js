module.exports = async function(sock, chatId, msg, isOwner) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    await sock.sendMessage(chatId, { text: '\u26A1 Shutting down bot...' }, { quoted: msg });
    
    setTimeout(() => {
        process.exit(1);
    }, 2000);
};
