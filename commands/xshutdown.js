module.exports = async function(sock, chatId, msg, isOwner) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    await sock.sendMessage(chatId, { text: '\u1F4A3 Shutting down all sessions...' }, { quoted: msg });
    
    for (const [sessionId, session] of Object.entries(sessions)) {
        try {
            if (session.sock) {
                await session.sock.logout();
                session.isConnected = false;
            }
        } catch (e) {}
    }
    
    await sock.sendMessage(chatId, { text: '\u2705 All sessions shut down!' });
};
