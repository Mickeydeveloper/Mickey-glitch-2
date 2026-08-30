async function pingCommand(sock, from, msg) {
    const start = Date.now();
    const { key } = await sock.sendMessage(from, { text: 'Testing Speed...' }, { quoted: msg });
    const end = Date.now();
    await sock.sendMessage(from, { text: `⚡ *Response Speed:* ${end - start}ms`, edit: key });
}

module.exports = pingCommand;
