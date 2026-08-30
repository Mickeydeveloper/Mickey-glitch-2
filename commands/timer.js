module.exports = async function(sock, chatId, msg, q) {
    if (!q || isNaN(parseInt(q))) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .timer <minutes>' }, { quoted: msg });
    
    const minutes = parseInt(q);
    const ms = minutes * 60 * 1000;
    
    await sock.sendMessage(chatId, { text: `\u23F0 Timer set for ${minutes} minute(s)!` }, { quoted: msg });
    
    setTimeout(async () => {
        try {
            await sock.sendMessage(chatId, { text: `\u23F0 *TIME'S UP!*\n\n${minutes} minute(s) have passed!` });
        } catch (e) {}
    }, ms);
};
