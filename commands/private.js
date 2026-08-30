async function privateCommand(sock, from, msg, isAdmin, session) {
    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only owner can use this command." }, { quoted: msg });
    
    session.isPublic = false;
    await sock.sendMessage(from, { text: "🔐 Bot is now in PRIVATE mode. Only the owner can use it." }, { quoted: msg });
}

module.exports = privateCommand;
