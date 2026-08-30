const settings = require('../settings');
const { AIRich } = require('../lib/messageBuilder');

async function acceptCommand(sock, from, msg, isAdmin) {
    if (!from.endsWith('@g.us')) {
        const builder = AIRich.warning(sock, settings.botName, 'This command can only be used in groups.', 'Group command');
        return builder.send(from, { quoted: msg });
    }

    if (!isAdmin) {
        const builder = AIRich.warning(sock, settings.botName, 'Only group admins can use this command.', 'Admin required');
        return builder.send(from, { quoted: msg });
    }

    try {
        const response = await sock.groupRequestParticipantsList(from);

        if (!response || response.length === 0) {
            const builder = AIRich.success(sock, settings.botName, 'No pending join requests found in this group.', 'Join requests');
            return builder.send(from, { quoted: msg });
        }

        const start = AIRich.createBotCard(sock, {
            title: settings.botName,
            body: 'Auto-accept pending join requests',
            footer: 'Group moderation',
            items: [
                { label: 'Pending requests', value: String(response.length) },
                { label: 'Status', value: 'Starting approval' },
            ],
        });
        await start.send(from, { quoted: msg });

        let acceptedCount = 0;
        for (const participant of response) {
            try {
                await sock.groupRequestParticipantsUpdate(from, [participant.jid], 'approve');
                acceptedCount++;
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err) {
                console.error(`Failed to accept ${participant.jid}:`, err.message);
            }
        }

        const result = AIRich.success(sock, settings.botName, 'Pending join requests processed.', 'Join requests');
        result.addList([
            { label: 'Approved', value: String(acceptedCount) },
            { label: 'Group', value: from },
            { label: 'Status', value: 'Completed' },
        ]);
        await result.send(from, { quoted: msg });

    } catch (e) {
        console.error('Accept command error:', e);
        const builder = AIRich.error(sock, settings.botName, `Error: ${e.message}`, 'Accept command');
        await builder.send(from, { quoted: msg });
    }
}

module.exports = acceptCommand;
