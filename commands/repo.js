const settings = require('../settings');
const { AIRich } = require('../lib/messageBuilder');

module.exports = async function(sock, chatId, msg, args) {
    try {
        await sock.sendMessage(chatId, { react: { text: '🔗', key: msg.key } });

        const builder = AIRich.createBotCard(sock, {
            title: settings.botName,
            body: 'Repository / pairing information',
            footer: 'Powered by HASEEB MINI BOT',
            lines: [
                '🔗 *Official Website:*',
                'https://syed-md-production.up.railway.app/',
                '📱 *Pairing Guide:*',
                'Type .pair 92XXXXXXXXXX',
                '🚀 *Quick Connect:*',
                '.pair 923XXXXXXXXX',
            ],
            items: [
                { label: 'Version', value: settings.version || '3.0.0' },
                { label: 'Security', value: 'Premium encrypted' },
                { label: 'Website', value: 'https://syed-md-production.up.railway.app/' },
            ],
            actions: [
                { text: 'Open website', type: 'OPEN_URL', url: 'https://syed-md-production.up.railway.app/' },
            ],
        });

        await builder.send(chatId, { quoted: msg });

    } catch (error) {
        console.error('❌ Repo command error:', error);
        const errorBuilder = AIRich.error(sock, settings.botName, 'Something went wrong. Please try again.', 'Repository');
        await errorBuilder.send(chatId, { quoted: msg });
    }
};