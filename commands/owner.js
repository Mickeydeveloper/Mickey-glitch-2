const settings = require('../settings');
const { AIRich } = require('../lib/messageBuilder');

async function ownerCommand(sock, from, msg) {
    const info = settings.getBotIdentity ? settings.getBotIdentity() : { name: settings.botName, owner: settings.ownerName, ownerNumber: settings.ownerNumber };
    const builder = AIRich.createBotCard(sock, {
        title: info.name,
        body: 'Bot owner information',
        footer: 'Official contact details',
        lines: [
            `👤 *BOT OWNER:* ${info.owner}`,
            `📱 *NUMBER:* +${info.ownerNumber}`,
            `🔗 *OFFICIAL WHATSAPP CHANNEL:*`,
            `> *${settings.whatsappChannel}*`,
        ],
        items: [
            { label: 'Owner', value: info.owner },
            { label: 'Number', value: `+${info.ownerNumber}` },
            { label: 'Channel', value: settings.whatsappChannel },
        ],
        actions: [
            { text: 'Open channel', type: 'OPEN_URL', url: settings.whatsappChannel },
        ],
    });

    await builder.send(from, { quoted: msg });
}

module.exports = ownerCommand;
