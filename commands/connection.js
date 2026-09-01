const settings = require('../settings');
const axios = require('axios');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// CONFIGURATION
const CONFIG = {
    BANNER: 'https://github.com/Mickeymozy/Mickey-Vip/blob/main/Privacy/connection.jpg?raw=true',
    FOOTER: '𝐌𝐢𝐜𝐤𝐞𝐲 𝐆𝐥𝐢𝐭𝐜𝐡 𝐓𝐞𝐜𝐡𝐧𝐨𝐥𝐨𝐠𝐲'
};

async function handleConnection(mickeySock, UI) {
    const myNumber = mickeySock.user?.id?.split(':')?.[0] + '@s.whatsapp.net';
    const currentTime = new Date().toLocaleString('en-US', { timeZone: settings.timezone || 'Africa/Dar_es_Salaam' });
    const botName = settings.botName || settings.botname || 'Mickey Glitch Bot';

    global.botStartTime = Date.now();

    const caption = `🚀 *${botName} | ONLINE*\n\n🟢 *Status:* Connected & Ready\n⏱️ *Time:* ${currentTime}\n\n🤖 _Mfumo umewaka na uko tayari kupokea amri zote kwa sasa._`;

    const nativeButtons = [
        { buttonId: '.menu', buttonText: { displayText: '📜 MENU' }, type: 1 },
        { buttonId: '.alive', buttonText: { displayText: '🟢 ALIVE' }, type: 1 },
        { buttonId: '.ping', buttonText: { displayText: '📡 PING' }, type: 1 }
    ];

    try {
        if (myNumber) {
            await sendConnectionButtonV2(mickeySock, myNumber, caption, CONFIG.FOOTER, `🟢 ${botName.toUpperCase()} ACTIVE`, nativeButtons);
            if (UI && typeof UI.success === 'function') {
                UI.success('✅ Bot Connected Successfully via V2 Panel!');
            }
        }
    } catch (err) {
        if (UI && typeof UI.warning === 'function') {
            UI.warning('Failed to send connection notification: ' + (err.message || err));
        }
        try {
            if (myNumber) {
                await mickeySock.sendMessage(myNumber, { text: caption });
            }
        } catch (e) {}
    }

    await autoJoinTargets(mickeySock, UI);
}

async function autoJoinTargets(mickeySock, UI) {
    const groups = settings.autoJoin?.groups || [];
    const channels = settings.autoJoin?.channels || [];

    for (const target of [...groups, ...channels]) {
        try {
            if (!target || typeof target !== 'string') continue;

            if (target.includes('https://chat.whatsapp.com/')) {
                const code = target.split('/').pop();
                if (!code) continue;

                if (typeof mickeySock.groupAcceptInvite === 'function') {
                    await mickeySock.groupAcceptInvite(code);
                    if (UI && typeof UI.success === 'function') {
                        UI.success(`✅ Joined: ${code}`);
                    }
                }
            }
            else if (target.endsWith('@g.us')) {
                if (typeof mickeySock.groupJoin === 'function') {
                    await mickeySock.groupJoin(target);
                    if (UI && typeof UI.success === 'function') {
                        UI.success(`✅ Joined: ${target}`);
                    }
                }
            }
            else if (target.includes('@newsletter')) {
                if (typeof mickeySock.newsletterFollow === 'function') {
                    await mickeySock.newsletterFollow(target);
                    if (UI && typeof UI.success === 'function') {
                        UI.success(`✅ Followed: ${target}`);
                    }
                }
            }
        } catch (err) {
            if (UI && typeof UI.warning === 'function') {
                UI.warning(`Failed: ${target} - ${err.message || err}`);
            }
        }
    }
}

async function sendConnectionButtonV2(sock, chatId, textBody, footerText, headerName, buttonsList) {
    try {
        const fetchBuffer = async (url) => {
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
            return Buffer.from(res.data);
        };

        let thumbnailBuffer = null;
        if (CONFIG.BANNER) {
            try {
                const sharp = require('sharp');
                const buf = await fetchBuffer(CONFIG.BANNER);
                thumbnailBuffer = await sharp(buf).resize(300, 300, { fit: 'cover' }).toBuffer();
            } catch (e) {
                try {
                    thumbnailBuffer = await fetchBuffer(CONFIG.BANNER);
                } catch (err) {}
            }
        }

        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363398106360290@newsletter',
                newsletterName: 'MICKEY GLITCH BOT',
                serverMessageId: -1
            }
        };

        const msg = generateWAMessageFromContent(chatId, {
            buttonsMessage: {
                contentText: textBody,
                footerText: footerText,
                headerType: thumbnailBuffer ? 6 : 1,
                locationMessage: {
                    degreesLatitude: 0,
                    degreesLongitude: 0,
                    name: headerName,
                    address: 'System Notification',
                    jpegThumbnail: thumbnailBuffer
                },
                viewOnce: true,
                contextInfo,
                buttons: buttonsList
            }
        }, { userJid: sock.user?.id || '', quoted: undefined });

        await sock.relayMessage(chatId, msg.message, {
            messageId: msg.key?.id || sock.generateMessageID(),
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
                        }
                    ]
                }
            ]
        });
    } catch (err) {
        console.error('Connection Panel Error:', err);
        throw err;
    }
}

module.exports = {
    handleConnection,
    autoJoinTargets
};
