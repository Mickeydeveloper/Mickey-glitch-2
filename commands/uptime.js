const os = require('os');

function formatTime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

module.exports = async function(sock, chatId, msg) {
    const uptime = process.uptime();
    const sysUptime = os.uptime();
    
    const text = `*\u23F1\uFE0F Uptime*\n\n` +
        `Bot Uptime: ${formatTime(uptime)}\n` +
        `System Uptime: ${formatTime(sysUptime)}\n` +
        `Platform: ${os.platform()} ${os.arch()}\n` +
        `Node.js: ${process.version}`;
    
    await sock.sendMessage(chatId, { text }, { quoted: msg });
};
