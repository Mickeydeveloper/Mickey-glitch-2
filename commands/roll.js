module.exports = async function(sock, chatId, msg, q) {
    const sides = q && !isNaN(parseInt(q)) ? parseInt(q) : 6;
    const result = Math.floor(Math.random() * sides) + 1;
    
    await sock.sendMessage(chatId, { 
        text: `*\u1F3B2 Rolling d${sides}*\n\n` +
            `Rolling...\n\n` +
            `*Result: ${result}!*` 
    }, { quoted: msg });
};
