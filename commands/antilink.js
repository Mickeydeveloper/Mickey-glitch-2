const settings = require('../settings');
const { AIRich } = require('../lib/messageBuilder');

async function antilinkCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin || !from.endsWith('@g.us')) {
        const builder = AIRich.warning(sock, settings.botName, 'Only admin can use this command in groups.', 'Anti-Link');
        return builder.send(from, { quoted: msg });
    }

    const action = args[0]?.toLowerCase();
    if (action === 'on' || action === 'del') {
        botData.antilinkGroups[from] = 'del';
        saveBotData();
        const builder = AIRich.success(sock, settings.botName, 'Anti-Link (Delete Only) Enabled!', 'Anti-Link');
        return builder.send(from, { quoted: msg });
    }

    if (action === 'kick') {
        botData.antilinkGroups[from] = 'kick';
        saveBotData();
        const builder = AIRich.success(sock, settings.botName, 'Anti-Link (Kick + Delete) Enabled!', 'Anti-Link');
        return builder.send(from, { quoted: msg });
    }

    if (action === 'off') {
        delete botData.antilinkGroups[from];
        saveBotData();
        const builder = AIRich.warning(sock, settings.botName, 'Anti-Link Disabled!', 'Anti-Link');
        return builder.send(from, { quoted: msg });
    }

    const builder = AIRich.warning(sock, settings.botName, 'Usage: .antilink [on/off/kick]', 'Anti-Link');
    return builder.send(from, { quoted: msg });
}

module.exports = antilinkCommand;
