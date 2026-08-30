const settings = require('../settings');
const { AIRich } = require('../lib/messageBuilder');

async function antistatusCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!from.endsWith('@g.us')) {
        const builder = AIRich.warning(sock, settings.botName, 'This command only works in groups.', 'Anti-Status');
        return builder.send(from, { quoted: msg });
    }

    if (!isAdmin) {
        const builder = AIRich.warning(sock, settings.botName, 'Only admins can use this command.', 'Admin required');
        return builder.send(from, { quoted: msg });
    }

    const action = args[0]?.toLowerCase();
    if (!botData.antiStatusGroups) botData.antiStatusGroups = {};

    if (action === 'on') {
        botData.antiStatusGroups[from] = true;
        saveBotData();
        const builder = AIRich.success(sock, settings.botName, 'Anti-Status Enabled! Any status shared in this group will be automatically deleted.', 'Anti-Status');
        return builder.send(from, { quoted: msg });
    }

    if (action === 'off') {
        botData.antiStatusGroups[from] = false;
        saveBotData();
        const builder = AIRich.warning(sock, settings.botName, 'Anti-Status Disabled!', 'Anti-Status');
        return builder.send(from, { quoted: msg });
    }

    const builder = AIRich.warning(sock, settings.botName, 'Usage: .antistatus [on/off]', 'Anti-Status');
    return builder.send(from, { quoted: msg });
}

module.exports = antistatusCommand;
