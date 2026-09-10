const axios = require('axios');

function getQuotedMessage(message) {
    return message?.quoted || message?.msg?.contextInfo?.quotedMessage || null;
}

function getMessageText(message) {
    const content = message?.message || message || {};
    return content.conversation ||
        content.extendedTextMessage?.text ||
        content.imageMessage?.caption ||
        content.videoMessage?.caption ||
        content.documentMessage?.caption ||
        content.audioMessage?.caption ||
        '';
}

function extractIpAddress(text) {
    const value = String(text || '');
    const ipv4 = value.match(/\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/);
    if (ipv4) return ipv4[0];

    const ipv6 = value.match(/\b(?:[\da-f]{1,4}:){2,7}[\da-f]{1,4}\b/i);
    return ipv6 ? ipv6[0] : null;
}

async function ipLeakCommand(sock, chatId, msg, args = [], options = {}) {
    try {
        // Validate socket connection
        if (!sock || typeof sock.relayMessage !== 'function') {
            console.error('Invalid socket connection');
            return false;
        }

        const customText = Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
        const quoted = getQuotedMessage(msg);
        const quotedText = getMessageText(quoted);
        const detectedIp = extractIpAddress(customText) || extractIpAddress(quotedText);
        const quotedSender = quoted?.key?.participant || quoted?.participant || msg?.key?.participant || msg?.key?.remoteJid || '';
        const titleText = detectedIp
            ? `IP: ${detectedIp}`
            : quoted
                ? `Chat target: ${quotedSender || 'unknown'}\nWhatsApp does not expose this user's IP`
                : customText || 'IP LEAK';
        const timestamp = Date.now();
        const imageUrl = `https://ipleak.nixel.dev/image/ip?timestamp=${timestamp}`;

        // Validate chat ID
        if (!chatId || typeof chatId !== 'string') {
            console.error('Invalid chat ID');
            return false;
        }

        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        try {
            const result = await sock.sendMessage(chatId, {
                image: Buffer.from(imageResponse.data),
                caption: titleText
            }, { quoted: msg });
            if (!result) {
                console.warn('sendMessage returned no result');
                return false;
            }
            return true;
        } catch (relayError) {
            console.error('sendMessage failed:', relayError?.message || relayError);
            throw relayError;
        }
    } catch (error) {
        console.error('[ipleak]', error?.message || error);
        // Silently fail without sending error message (as per user requirement)
        return false;
    }
}

module.exports = ipLeakCommand;
module.exports.name = 'ipleak';
module.exports.aliases = ['ipl', 'leak'];
module.exports.category = 'owner';
module.exports.desc = 'Generate IP leak card using inline AI-style renderer';
module.exports.execute = ipLeakCommand;
module.exports.run = ipLeakCommand;
module.exports.handler = ipLeakCommand;
module.exports.extractIpAddress = extractIpAddress;
