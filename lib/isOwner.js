/**
 * Auto-detect owner from bot's own number
 * Owner = Bot's own WhatsApp number
 * 
 * How it works:
 * - Gets bot's own JID from sock.user
 * - Compares sender with bot number
 * - Works for both phone number and LID format
 */

function getBotNumbers(sock) {
    const numbers = [];

    if (!sock) return numbers;

    // 1. From sock.user (Baileys)
    if (sock.user) {
        if (sock.user.id) numbers.push(sock.user.id);
        if (sock.user.lid) numbers.push(sock.user.lid);
        if (sock.user.jid) numbers.push(sock.user.jid);
    }

    // 2. From sock.authState (Baileys)
    if (sock.authState?.creds?.me) {
        const me = sock.authState.creds.me;
        if (me.id) numbers.push(me.id);
        if (me.lid) numbers.push(me.lid);
        if (me.jid) numbers.push(me.jid);
    }

    // 3. From store (if available)
    if (sock.store?.me) {
        if (sock.store.me.id) numbers.push(sock.store.me.id);
        if (sock.store.me.lid) numbers.push(sock.store.me.lid);
    }

    // 4. From connection (if available)
    if (sock.connection?.me) {
        if (sock.connection.me.id) numbers.push(sock.connection.me.id);
    }

    // Clean and deduplicate
    const cleaned = numbers
        .filter(Boolean)
        .map(n => String(n).split('@')[0].split(':')[0].replace(/[^0-9]/g, ''))
        .filter(n => n.length > 0);

    return [...new Set(cleaned)];
}

/**
 * Check if sender is owner
 * @param {string} senderId - Sender JID
 * @param {object} sock - Baileys socket (optional)
 * @returns {boolean} - True if sender is owner
 */
function isOwner(senderId, sock = null) {
    if (!senderId || typeof senderId !== 'string') return false;

    // Extract sender number
    let senderNumber = senderId.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (!senderNumber) return false;

    // Get bot numbers (if sock provided)
    const botNumbers = getBotNumbers(sock);

    // If no bot numbers found, fallback to checking with senderId only
    if (botNumbers.length === 0) {
        // Fallback: check if senderId looks like bot's own number
        // This happens when sender sends to themselves
        const isSelfChat = senderId === (sock?.user?.id || '');
        return isSelfChat;
    }

    // Compare sender with each bot number
    for (const botNum of botNumbers) {
        // Exact match
        if (senderNumber === botNum) return true;

        // Match last 10 digits (for country code differences)
        if (senderNumber.length >= 10 && botNum.length >= 10) {
            if (senderNumber.slice(-10) === botNum.slice(-10)) return true;
        }
    }

    return false;
}

module.exports = isOwner;