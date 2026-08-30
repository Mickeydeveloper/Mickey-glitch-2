async function tagallCommand(sock, from, msg, isAdmin, q) {
    if (!isAdmin || !from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ Only admin can use this command in groups." }, { quoted: msg });
    
    const groupMetadata = await sock.groupMetadata(from);
    const participants = groupMetadata.participants;
    
    let tagText = `📢 *TAG ALL*\n\n*Message:* ${q || 'No message'}\n\n`;
    for (let mem of participants) {
        tagText += `🔹 @${mem.id.split('@')[0]}\n`;
    }
    
    await sock.sendMessage(from, { 
        text: tagText, 
        mentions: participants.map(p => p.id) 
    }, { quoted: msg });
}

module.exports = tagallCommand;
