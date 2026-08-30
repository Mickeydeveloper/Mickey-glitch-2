module.exports = async function(sock, chatId, msg) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '\u1FA99' : '\uD83E\uDE99';
    
    await sock.sendMessage(chatId, { 
        text: `*${emoji} Coin Flip*\n\n` +
            `Flipping...\n\n` +
            `*Result: ${result}!*` 
    }, { quoted: msg });
};
