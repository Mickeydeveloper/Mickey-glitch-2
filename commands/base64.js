module.exports = async function(sock, chatId, msg, q) {
    try {
        if (!q) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ Usage:\n.base64 enc Hello World\n.base64 dec SGVsbG8gV29ybGQ=' 
            }, { quoted: msg });
        }

        const parts = q.trim().split(' ');
        const action = parts[0].toLowerCase();
        const text = parts.slice(1).join(' ');

        if (!text) {
            return await sock.sendMessage(chatId, { text: '❌ Please provide text to encode/decode!' }, { quoted: msg });
        }

        let result;
        if (action === 'enc' || action === 'encode') {
            result = Buffer.from(text).toString('base64');
            await sock.sendMessage(chatId, { 
                text: `🔐 *SHADOW BASE64 ENCODER* 🔐\n\n` +
                      `📝 *Original:* ${text}\n` +
                      `🔒 *Encoded:*\n\`${result}\`\n\n` +
                      `_Powered by Shadow MD Bot_` 
            }, { quoted: msg });
        } else if (action === 'dec' || action === 'decode') {
            try {
                result = Buffer.from(text, 'base64').toString('utf8');
                await sock.sendMessage(chatId, { 
                    text: `🔓 *SHADOW BASE64 DECODER* 🔓\n\n` +
                          `🔒 *Encoded:* ${text}\n` +
                          `📝 *Decoded:*\n\`${result}\`\n\n` +
                          `_Powered by Shadow MD Bot_` 
                }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(chatId, { text: '❌ Invalid Base64 string!' }, { quoted: msg });
            }
        } else {
            await sock.sendMessage(chatId, { 
                text: '⚠️ Usage:\n.base64 enc Hello World\n.base64 dec SGVsbG8gV29ybGQ=' 
            }, { quoted: msg });
        }
    } catch (err) {
        await sock.sendMessage(chatId, { text: '❌ Error: ' + err.message }, { quoted: msg });
    }
};
