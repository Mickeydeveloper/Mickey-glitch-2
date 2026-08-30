async function setnameCommand(sock, from, msg, isAdmin, botData, saveBotData, userId, q) {
    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only owner can use this command." }, { quoted: msg });
    if (!q) return await sock.sendMessage(from, { text: "❌ Please provide a name." }, { quoted: msg });
    
    botData.userNames[userId] = q;
    saveBotData();
    await sock.sendMessage(from, { text: `✅ Name set to: ${q}` }, { quoted: msg });
}

module.exports = setnameCommand;
