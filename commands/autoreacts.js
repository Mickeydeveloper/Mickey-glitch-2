async function autoreactsCommand(sock, from, msg, isAdmin, session, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only owner can use this command." }, { quoted: msg });
    
    const action = args[0]?.toLowerCase();
    if (action === 'on') {
        session.autoReact = true;
        await sock.sendMessage(from, { text: "✅ Auto-React Enabled!" }, { quoted: msg });
    } else if (action === 'off') {
        session.autoReact = false;
        await sock.sendMessage(from, { text: "❌ Auto-React Disabled!" }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { text: "❌ Usage: .autoreacts [on/off]" }, { quoted: msg });
    }
}

module.exports = autoreactsCommand;
