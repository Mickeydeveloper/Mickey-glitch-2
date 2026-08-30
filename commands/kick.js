async function kickCommand(sock, from, msg, isAdmin) {
    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only admin can use this command." }, { quoted: msg });
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ This command can only be used in groups." }, { quoted: msg });

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant || 
                   msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    if (!quoted) return await sock.sendMessage(from, { text: "❌ Please reply to a message or tag someone to kick." }, { quoted: msg });

    try {
        await sock.groupParticipantsUpdate(from, [quoted], "remove");
        await sock.sendMessage(from, { text: "✅ User kicked successfully." }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: "❌ Failed to kick user. Make sure I am an admin." }, { quoted: msg });
    }
}

module.exports = kickCommand;
