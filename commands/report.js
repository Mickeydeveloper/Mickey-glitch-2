const settings = require('../settings');
const { AIRich } = require('../lib/messageBuilder');

function onlyDigits(s = '') { 
    return String(s).replace(/\D/g, ''); 
}

module.exports = async function(sock, chatId, message, q) {
    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });
        
        if (!q) {
            const builder = AIRich.warning(sock, settings.botName, 'Usage: .report <number/mention>', 'Report command');
            return await builder.send(chatId, { quoted: message });
        }

        let target = onlyDigits(q);
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            target = onlyDigits(message.message.extendedTextMessage.contextInfo.mentionedJid[0]);
        }
        
        if (target.length < 10) {
            const builder = AIRich.error(sock, settings.botName, 'Invalid number provided for report.', 'Report command');
            return await builder.send(chatId, { quoted: message });
        }

        const tJid = target + '@s.whatsapp.net';
        const reportTypes = ['spam', 'abuse', 'harassment', 'fraud', 'illegal_content'];
        
        const infoBuilder = AIRich.createBotCard(sock, {
            title: settings.botName,
            body: 'Official WhatsApp report',
            footer: 'Processing reports',
            lines: [
                `👤 **Target:** +${target}`,
                '📊 **Action:** Sending Official Abuse Reports',
                '_Please wait..._',
            ],
            items: [
                { label: 'Target', value: `+${target}` },
                { label: 'Action', value: 'Official abuse reports' },
                { label: 'Status', value: 'Processing' },
            ],
        });
        await infoBuilder.send(chatId, { quoted: message });

        let successCount = 0;
        for (const type of reportTypes) {
            try {
                await sock.query({
                    tag: 'iq',
                    type: 'set',
                    attrs: {
                        to: 's.whatsapp.net',
                        id: sock.generateMessageTag(),
                        xmlns: 'abuse',
                    },
                    content: [
                        {
                            tag: 'report',
                            attrs: {
                                jid: tJid,
                                type: type,
                            },
                        },
                    ],
                });
                successCount++;
            } catch (e) {
                console.error(`Report failed for type ${type}:`, e.message);
            }
        }

        const result = AIRich.success(sock, settings.botName, 'Reporting complete', 'Report command');
        result.addList([
            { label: 'Target', value: `+${target}` },
            { label: 'Official Reports', value: `${successCount}/${reportTypes.length}` },
            { label: 'Status', value: 'Target has been reported to WhatsApp for multiple violations.' },
        ]);
        await result.send(chatId, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch(err) { 
        console.error('Report Error:', err);
        const errorBuilder = AIRich.error(sock, settings.botName, `Error: ${err.message || String(err)}`, 'Report command');
        await errorBuilder.send(chatId, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
    }
};
