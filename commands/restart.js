module.exports = async function(sock, chatId, msg, isOwner) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    await sock.sendMessage(chatId, { text: '\u1F504 Restarting bot session...' }, { quoted: msg });
    
    // Find current session and reinitialize
    setTimeout(() => {
        process.exit(0); // Let PM2/docker restart the process
    }, 2000);
};
