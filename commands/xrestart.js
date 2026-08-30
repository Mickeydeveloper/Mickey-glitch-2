module.exports = async function(sock, chatId, msg, isOwner) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    await sock.sendMessage(chatId, { text: '\u1F6E0\uFE0F Force restarting all sessions...' }, { quoted: msg });
    
    // Disconnect and reconnect
    for (const [sessionId, session] of Object.entries(sessions)) {
        try {
            if (session.sock) {
                await session.sock.ws.close();
                session.isConnected = false;
                setTimeout(() => session.initialize(), 3000);
            }
        } catch (e) {}
    }
    
    await sock.sendMessage(chatId, { text: '\u2705 Restart command executed!' });
};
