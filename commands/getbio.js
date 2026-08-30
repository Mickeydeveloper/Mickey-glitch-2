module.exports = async function(sock, chatId, msg, q) {
    try {
        let targetJid;
        if (q) {
            targetJid = q.replace(/\D/g, '') + '@s.whatsapp.net';
        } else {
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
            targetJid = mentioned || quoted || chatId;
        }
        
        const status = await sock.fetchStatus(targetJid);
        const about = status?.status || 'No bio set';
        const setAt = status?.setAt ? new Date(status.setAt).toLocaleString() : 'Unknown';
        
        await sock.sendMessage(chatId, { 
            text: `\u1F4CB *User Bio*\n\n${about}\n\n_Set at: ${setAt}_` 
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Could not fetch bio: ' + e.message }, { quoted: msg });
    }
};
