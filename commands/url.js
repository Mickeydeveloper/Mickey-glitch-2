const crypto = require('crypto');
const https = require('https');
const { downloadContentFromMessage, normalizeMessageContent } = require('@whiskeysockets/baileys');

const MEDIA_CONFIG = {
    image: { hkdf: 'WhatsApp Image Keys', mediaPath: '/mms/image' },
    video: { hkdf: 'WhatsApp Video Keys', mediaPath: '/mms/video' },
    audio: { hkdf: 'WhatsApp Audio Keys', mediaPath: '/mms/audio' },
    document: { hkdf: 'WhatsApp Document Keys', mediaPath: '/mms/document' },
    sticker: { hkdf: 'WhatsApp Image Keys', mediaPath: '/mms/sticker' }
};

function queryMediaConnection(conn) {
    if (typeof conn?.query !== 'function') {
        throw new Error('WhatsApp connection does not support media upload');
    }

    return conn.query({
        tag: 'iq',
        attrs: {
            id: conn.generateMessageTag?.() || Date.now().toString(),
            to: 's.whatsapp.net',
            type: 'set',
            xmlns: 'w:m'
        },
        content: [{ tag: 'media_conn', attrs: {} }]
    });
}

async function uploadToServer(conn, buffer, { hkdf, mediaPath, mediaKey = crypto.randomBytes(32) }) {
    const expanded = Buffer.from(crypto.hkdfSync(
        'sha256',
        mediaKey,
        Buffer.alloc(32),
        Buffer.from(hkdf),
        112
    ));
    const iv = expanded.subarray(0, 16);
    const cipherKey = expanded.subarray(16, 48);
    const macKey = expanded.subarray(48, 80);
    const cipher = crypto.createCipheriv('aes-256-cbc', cipherKey, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const mac = crypto.createHmac('sha256', macKey)
        .update(iv)
        .update(encrypted)
        .digest()
        .subarray(0, 10);
    const encBuffer = Buffer.concat([encrypted, mac]);
    const fileSha256 = crypto.createHash('sha256').update(buffer).digest();
    const fileEncSha256 = crypto.createHash('sha256').update(encBuffer).digest();
    const iq = await queryMediaConnection(conn);
    const mediaConn = iq.content?.find((value) => value.tag === 'media_conn');
    if (!mediaConn) throw new Error('media_conn haikupatikana');

    const auth = mediaConn.attrs?.auth;
    const hosts = (mediaConn.content || [])
        .filter((value) => value.tag === 'host')
        .map((value) => value.attrs?.hostname)
        .filter(Boolean);
    if (!auth) throw new Error('auth ya media_conn haijapatikana');
    if (!hosts.length) throw new Error('host ya upload haikupatikana');

    const token = encodeURIComponent(fileEncSha256.toString('base64url'));
    let lastError;
    for (const host of hosts) {
        try {
            const json = await new Promise((resolve, reject) => {
                const url = new URL(`https://${host}${mediaPath}/${token}?auth=${encodeURIComponent(auth)}&token=${token}`);
                const request = https.request({
                    hostname: url.hostname,
                    port: 443,
                    path: url.pathname + url.search,
                    method: 'POST',
                    headers: {
                        Origin: 'https://web.whatsapp.com',
                        Referer: 'https://web.whatsapp.com/',
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': encBuffer.length
                    }
                }, (response) => {
                    let body = '';
                    response.setEncoding('utf8');
                    response.on('data', (chunk) => { body += chunk; });
                    response.on('end', () => {
                        if (response.statusCode < 200 || response.statusCode >= 300) {
                            reject(new Error(`Upload failed ${response.statusCode}: ${body}`));
                            return;
                        }
                        try {
                            resolve(JSON.parse(body));
                        } catch {
                            reject(new Error(`Upload response si JSON: ${body}`));
                        }
                    });
                });
                request.on('error', reject);
                request.write(encBuffer);
                request.end();
            });
            const directPath = json.direct_path || json.directPath || json.url || json.path;
            if (!directPath) throw new Error('direct path haikupatikana');
            return {
                directPath,
                mediaKey,
                fileLength: buffer.length,
                fileSha256,
                fileEncSha256,
                ...json,
                url: /^https?:\/\//i.test(directPath) ? directPath : `https://mmg.whatsapp.net${directPath}`
            };
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error('Hosts zote za upload zimeshindwa');
}

async function downloadMedia(media, type) {
    const stream = await downloadContentFromMessage(media, type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    return buffer.length ? buffer : null;
}

function getMedia(message) {
    const content = normalizeMessageContent(message?.message) || message?.message || {};
    for (const type of Object.keys(MEDIA_CONFIG)) {
        const media = content[`${type}Message`];
        if (media) return { media, type };
    }
    return null;
}

function getQuotedMedia(message) {
    const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return null;
    return getMedia({ message: quoted });
}

async function urlCommand(sock, chatId, message) {
    try {
        let media = getMedia(message) || getQuotedMedia(message);

        if (!media) {
            await sock.sendMessage(chatId, {
                text: '*Tuma au reply media* (image, video, audio, sticker, document), kisha tumia `.tourl`.'
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { text: '⏳ *Ninapakia media WhatsApp...*' }, { quoted: message });
        const buffer = await downloadMedia(media.media, media.type);
        if (!buffer) throw new Error('Media buffer iko tupu');

        const uploaded = await uploadToServer(sock, buffer, MEDIA_CONFIG[media.type]);
        await sock.sendMessage(chatId, {
            text: `✅ *URL imepatikana:*\n${uploaded.url}`
        }, { quoted: message });
    } catch (error) {
        console.error('[TOURL] error:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: `❌ Imeshindikana kupata URL: ${error?.message || 'unknown error'}`
        }, { quoted: message });
    }
}

urlCommand.name = 'tourl';
urlCommand.description = 'Upload WhatsApp media to the WhatsApp media server and return its URL';
urlCommand.category = 'UTILITY';
urlCommand.aliases = ['tourl', 'url'];

module.exports = urlCommand;


