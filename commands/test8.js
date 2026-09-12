const { createCtx } = require('../../lib/messageBuilder');

const test8Command = async (sock, chatId, msg, args = []) => {
    try {
        const ctx = createCtx(sock, chatId, msg, { args });
        const target = ctx.chatId || chatId || msg?.key?.remoteJid;

        if (!sock || !target) {
            console.error('[test8] No target or sock');
            return false;
        }

        const userName = msg?.pushName || 'User';

        // Check if sock.sendMessage supports nativeFlow
        const supportsNativeFlow = typeof sock.sendMessage === 'function';
        
        if (!supportsNativeFlow) {
            throw new Error('sendMessage not available');
        }

        // Try native flow
        await sock.sendMessage(target, {
            image: { url: 'https://picsum.photos/400/200' },
            caption: `🗄️ Interactive Native Flow!\n👤 Hello ${userName}!`,
            footer: '@itsliaaa/baileys',
            optionText: '👉🏻 Select Options',
            optionTitle: '📄 Menu Options',
            nativeFlow: [
                {
                    text: '👋🏻 Greeting',
                    id: '#Greeting',
                    icon: 'review'
                },
                {
                    text: '📋 Copy',
                    copy: '@itsliaaa/baileys'
                },
                {
                    text: '🌐 Source',
                    url: 'https://www.npmjs.com/package/@itsliaaa/baileys',
                    useWebview: true
                }
            ]
        }, { quoted: msg });

        console.log('[test8] Native flow sent successfully');
        return true;

    } catch (error) {
        console.error('[test8] Error:', error?.message || error);
        return false;
    }
};

test8Command.name = 'test8';
test8Command.aliases = ['native', 'interactive', 'flow'];
test8Command.category = 'test';
test8Command.description = '🗄️ Test Native Flow';
test8Command.permissions = { admin: false, group: false };

module.exports = test8Command;