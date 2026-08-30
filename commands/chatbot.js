module.exports = async function(sock, chatId, msg, session, args) {
    const action = args[0]?.toLowerCase();
    
    if (action === 'on') {
        session.aiEnabled = true;
        await sock.sendMessage(chatId, { text: '\u1F916 Chatbot AI ON! The bot will auto-reply to personal messages.' }, { quoted: msg });
    } else if (action === 'off') {
        session.aiEnabled = false;
        await sock.sendMessage(chatId, { text: '\u274C Chatbot AI OFF!' }, { quoted: msg });
    } else {
        await sock.sendMessage(chatId, { 
            text: `*\u1F3AE Chatbot Settings*\n\n` +
                `Status: ${session.aiEnabled ? 'ON' : 'OFF'}\n\n` +
                `Use .chatbot on/off` 
        }, { quoted: msg });
    }
};
