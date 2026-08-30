module.exports = async function(sock, chatId, msg, isOwner, session, args) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    const action = args[0]?.toLowerCase();
    
    if (action === 'on') {
        session.ghostMode = true;
        await sock.sendMessage(chatId, { text: '\u1F47B Ghost mode ON! Bot will not reply in personal chats.' }, { quoted: msg });
    } else if (action === 'off') {
        session.ghostMode = false;
        await sock.sendMessage(chatId, { text: '\u1F47B Ghost mode OFF! Bot will reply normally.' }, { quoted: msg });
    } else {
        await sock.sendMessage(chatId, { 
            text: `*\u1F47B Ghost Mode*\n\nStatus: ${session.ghostMode ? 'ON' : 'OFF'}\n\nUse .ghostmode on/off` 
        }, { quoted: msg });
    }
};
