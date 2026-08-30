async function isAdmin(sock, chatId, senderId) {
    if (!chatId.endsWith('@g.us')) return true;
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;
        const participant = participants.find(p => p.id === senderId);
        return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
    } catch (e) {
        return false;
    }
}

module.exports = isAdmin;
