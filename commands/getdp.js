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
        
        const ppUrl = await sock.profilePictureUrl(targetJid, 'image').catch(() => null);
        if (!ppUrl) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F No profile picture!' }, { quoted: msg });
        
        await sock.sendMessage(chatId, { image: { url: ppUrl }, caption: '\u1F5BC\uFE0F Profile Picture' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
