module.exports = async function(sock, chatId, msg, isOwner, botData, saveBotData, args) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    const action = args[0]?.toLowerCase();
    
    if (action === 'on') {
        botData.antiBug = true;
        saveBotData();
        await sock.sendMessage(chatId, { text: '\u1F9EA Anti-bug protection ON!' }, { quoted: msg });
    } else if (action === 'off') {
        botData.antiBug = false;
        saveBotData();
        await sock.sendMessage(chatId, { text: '\u274C Anti-bug protection OFF!' }, { quoted: msg });
    } else {
        await sock.sendMessage(chatId, { 
            text: `*\u1F9EA Anti-Bug*\n\nStatus: ${botData.antiBug ? 'ON' : 'OFF'}\n\nUse .antibug on/off` 
        }, { quoted: msg });
    }
};
