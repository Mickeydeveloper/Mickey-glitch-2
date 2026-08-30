const os = require('os');

module.exports = async function(sock, chatId, msg) {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    const text = `*\u1F5A5\uFE0F Server Information*\n\n` +
        `*OS:* ${os.type()} ${os.release()}\n` +
        `*Platform:* ${os.platform()} ${os.arch()}\n` +
        `*Hostname:* ${os.hostname()}\n` +
        `*CPUs:* ${os.cpus().length}x ${os.cpus()[0].model.trim()}\n` +
        `*CPU Speed:* ${os.cpus()[0].speed} MHz\n\n` +
        `*Memory:*\n` +
        `Total: ${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB\n` +
        `Used: ${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB\n` +
        `Free: ${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB\n\n` +
        `*Load Average:* ${os.loadavg().map(v => v.toFixed(2)).join(', ')}\n` +
        `*Node.js:* ${process.version}`;
    
    await sock.sendMessage(chatId, { text }, { quoted: msg });
};
