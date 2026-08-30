module.exports = async function(sock, chatId, msg) {
    await sock.sendMessage(chatId, { text: '\u26A1 Running speed test...' }, { quoted: msg });
    
    const start = Date.now();
    
    // Simulate speed test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const latency = Date.now() - start;
    const downloadSpeed = (Math.random() * 100 + 50).toFixed(2);
    const uploadSpeed = (Math.random() * 50 + 20).toFixed(2);
    
    const text = `*\u26A1 Speed Test Results*\n\n` +
        `Latency: ${latency}ms\n` +
        `Download: ${downloadSpeed} Mbps\n` +
        `Upload: ${uploadSpeed} Mbps\n\n` +
        `_Note: This is a simulated test. Use a real speedtest for accurate results._`;
    
    await sock.sendMessage(chatId, { text }, { quoted: msg });
};
