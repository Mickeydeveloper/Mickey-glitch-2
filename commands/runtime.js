module.exports = async function(sock, chatId, msg) {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const text = `*\u1F551 Runtime*\n\n` +
        `The bot has been running for:\n` +
        `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds\n\n` +
        `_Started: ${new Date(Date.now() - uptime * 1000).toLocaleString()}_`;
    
    await sock.sendMessage(chatId, { text }, { quoted: msg });
};
