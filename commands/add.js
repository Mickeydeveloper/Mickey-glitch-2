const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const settings = require('../settings');
const { AIRich } = require('../lib/messageBuilder');

module.exports = async function(sock, chatId, msg, isAdmin, q) {
    if (!isAdmin) {
        const builder = AIRich.warning(sock, settings.botName, 'Only admin can use this command.', 'Admin required');
        return builder.send(chatId, { quoted: msg });
    }

    if (!q) {
        const builder = AIRich.warning(sock, settings.botName, 'Usage: .add 923xxxxxxxxxx', 'Add member');
        return builder.send(chatId, { quoted: msg });
    }

    try {
        const number = q.replace(/\D/g, '');
        const userJid = number + '@s.whatsapp.net';
        await sock.groupParticipantsUpdate(chatId, [userJid], 'add');

        const builder = AIRich.success(sock, settings.botName, `Added +${number} to the group.`, 'Add member');
        builder.addList([
            { label: 'Number', value: `+${number}` },
            { label: 'Status', value: 'Added' },
        ]);
        await builder.send(chatId, { quoted: msg });
    } catch (e) {
        const builder = AIRich.error(sock, settings.botName, `Failed to add: ${e.message}`, 'Add member');
        await builder.send(chatId, { quoted: msg });
    }
};
