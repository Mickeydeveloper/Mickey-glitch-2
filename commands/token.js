function bareJid(value) {
    return String(value || '')
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

async function tokenCommand(sock, chatId, msg) {
    const ownerJid = sock?.user?.id || '';
    const senderJid = msg?.key?.participant || msg?.key?.remoteJid || '';

    if (!ownerJid || bareJid(senderJid) !== bareJid(ownerJid)) {
        await sock.sendMessage(chatId, {
            text: '🔒 Token inaweza kuombwa na namba iliyopairiwa tu.'
        }, { quoted: msg });
        return true;
    }

    const token = String(sock.accountToken || '').trim();
    if (!/^Mickey-\d{6}$/.test(token)) {
        await sock.sendMessage(chatId, {
            text: '⚠️ Token haijapatikana. Pair bot tena au wasiliana na admin.'
        }, { quoted: msg });
        return true;
    }

    await sock.sendMessage(ownerJid, {
        text: `🔐 Website token yako ni:\n\n${token}\n\nUsimshirikishe mtu mwingine.`
    }, { quoted: msg });
    return true;
}

tokenCommand.name = 'token';
tokenCommand.description = 'Show the website access token to the paired owner';
tokenCommand.category = 'OWNER';

module.exports = tokenCommand;