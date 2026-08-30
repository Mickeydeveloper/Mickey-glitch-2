module.exports = async function(sock, chatId, msg, isOwner, session) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    const currentMode = session.isPublic ? 'Public' : 'Private';
    
    await sock.sendMessage(chatId, { 
        text: `*\u2699\uFE0F Bot Mode*\n\nCurrent mode: *${currentMode}*\n\n` +
            `Use .public or .private to change mode.` 
    }, { quoted: msg });
};
