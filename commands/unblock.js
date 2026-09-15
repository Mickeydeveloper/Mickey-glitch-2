const isOwnerOrSudo = require('../lib/isOwner');

function getTargetJid(message, chatId) {
    const contextInfo = message?.message?.extendedTextMessage?.contextInfo;
    return contextInfo?.mentionedJid?.[0]
        || contextInfo?.participant
        || message?.key?.participant
        || message?.key?.remoteJid
        || chatId;
}

async function unblockCommand(sock, chatId, message) {
    try {
        const senderId = message?.key?.participant || message?.key?.remoteJid;
        if (!(await isOwnerOrSudo(senderId, sock, chatId))) {
            await sock.sendMessage(chatId, {
                text: '❌ Command hii ni ya owner au sudo tu.'
            }, { quoted: message });
            return;
        }

        const targetJid = getTargetJid(message, chatId);
        await sock.updateBlockStatus(targetJid, 'unblock');
        await sock.sendMessage(chatId, {
            text: `✅ @${targetJid.split('@')[0]} ame-unblockiwa.`
        }, { quoted: message, mentions: [targetJid] });
    } catch (error) {
        console.error('[unblock] Failed:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Imeshindikana kum-unblock huyo user.'
        }, { quoted: message });
    }
}

module.exports = unblockCommand;