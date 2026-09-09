const { createCtx } = require('../../lib/messageBuilder');

const test8Command = async (sock, chatId, msg, args = []) => {
    try {
        const ctx = createCtx(sock, chatId, msg, { args });
        const target = ctx.chatId || chatId || msg?.key?.remoteJid;

        if (!sock || !target) {
            console.error('[test8] No target or sock');
            return false;
        }

        // Get user name
        const userName = msg?.pushName || 'User';

        // ===== 1. NATIVE FLOW WITH IMAGE =====
        // Send interactive message with image and buttons
        await sock.sendMessage(target, {
            image: {
                url: 'https://picsum.photos/400/200' // Random placeholder image
            },
            caption: `🗄️ Interactive Native Flow!\n━━━━━━━━━━━━━━━━━━━\n👤 Hello ${userName}!\n━━━━━━━━━━━━━━━━━━━\n🔹 Try the buttons below`,
            footer: '@itsliaaa/baileys • Native Flow',
            optionText: '👉🏻 Select Options',
            optionTitle: '📄 Menu Options',
            offerText: '🏷️ Special Offer!',
            offerCode: '@itsliaaa/baileys',
            offerUrl: 'https://www.npmjs.com/package/@itsliaaa/baileys',
            offerExpiration: Date.now() + 3_600_000,
            nativeFlow: [
                {
                    text: '👋🏻 Greeting',
                    id: '#Greeting',
                    icon: 'review'
                },
                {
                    text: '📞 Call Me',
                    call: '628123456789'
                },
                {
                    text: '📋 Copy Code',
                    copy: '@itsliaaa/baileys'
                },
                {
                    text: '🌐 View Source',
                    url: 'https://www.npmjs.com/package/@itsliaaa/baileys',
                    useWebview: true
                },
                {
                    text: '📋 Select Menu',
                    sections: [
                        {
                            title: '✨ Main Menu',
                            rows: [
                                {
                                    header: '🏷️',
                                    title: 'Get Coupon',
                                    description: 'Claim your special coupon',
                                    id: '#GetCoupon'
                                },
                                {
                                    header: '💭',
                                    title: 'Secret Message',
                                    description: 'Reveal secret',
                                    id: '#Secret'
                                }
                            ]
                        },
                        {
                            title: '✨ Extra Options',
                            highlight_label: '🔥 Popular',
                            rows: [
                                {
                                    header: '🎮',
                                    title: 'Play Game',
                                    description: 'Start a game',
                                    id: '#PlayGame'
                                },
                                {
                                    header: '📊',
                                    title: 'View Stats',
                                    description: 'Check your stats',
                                    id: '#ViewStats'
                                }
                            ]
                        }
                    ],
                    icon: 'default'
                }
            ],
            interactiveAsTemplate: false
        }, {
            quoted: msg
        });

        // Send confirmation
        await sock.sendMessage(target, {
            text: `✅ Interactive message sent!\n━━━━━━━━━━━━━━━━━━━\n🔹 Try the buttons below`
        }, { quoted: msg });

        console.log('[test8] Native flow sent successfully');
        return true;

    } catch (error) {
        console.error('[test8] Error:', error?.message || error);
        
        try {
            const target = chatId || msg?.key?.remoteJid;
            if (target) {
                await sock.sendMessage(target, {
                    text: `❌ Failed to send interactive message\n━━━━━━━━━━━━━━━━━━━\n⚠️ Error: ${error?.message || 'Unknown error'}`
                }, { quoted: msg });
            }
        } catch (sendErr) {
            console.error('[test8] Fallback failed:', sendErr?.message || sendErr);
        }
        return false;
    }
};

// Export command
test8Command.name = 'test8';
test8Command.aliases = ['native', 'interactive', 'flow'];
test8Command.category = 'test';
test8Command.description = '🗄️ Test Native Flow Interactive Message';
test8Command.permissions = {
    admin: false,
    group: false
};

module.exports = test8Command;