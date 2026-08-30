module.exports = async function(sock, chatId, msg) {
    const sender = msg.key.participant || msg.key.remoteJid;
    await sock.sendMessage(chatId, { 
        text: `Hey @${sender.split('@')[0]}! \uD83D\uDC4B`,
        mentions: [sender]
    }, { quoted: msg });
};
