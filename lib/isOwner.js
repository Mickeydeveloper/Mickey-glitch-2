/**
 * Check if sender is owner OR sudo
 * Owner = Bot's own number (auto-detected)
 * Sudo = Additional numbers from config
 */

// Sudo numbers (optional - add manually)
const SUDO_NUMBERS = [
    // '255XXXXXXXXX',
];

// Cache ya bot numbers
let _botNumbersCache = [];
let _botNumbersCacheTime = 0;
const CACHE_TTL = 60000;

/**
 * Get bot's own numbers
 */
function getBotNumbers(sock) {
    if (!sock) return [];

    const now = Date.now();
    if (_botNumbersCache.length > 0 && (now - _botNumbersCacheTime) < CACHE_TTL) {
        return _botNumbersCache;
    }

    const numbers = [];

    // Source 1: sock.user
    if (sock.user) {
        if (sock.user.id) numbers.push(sock.user.id);
        if (sock.user.lid) numbers.push(sock.user.lid);
        if (sock.user.jid) numbers.push(sock.user.jid);
    }

    // Source 2: sock.authState.creds.me
    if (sock.authState?.creds?.me) {
        const me = sock.authState.creds.me;
        if (me.id) numbers.push(me.id);
        if (me.lid) numbers.push(me.lid);
        if (me.jid) numbers.push(me.jid);
    }

    // Source 3: sock.store.me
    if (sock.store?.me) {
        if (sock.store.me.id) numbers.push(sock.store.me.id);
        if (sock.store.me.lid) numbers.push(sock.store.me.lid);
    }

    // Clean
    const cleaned = numbers
        .filter(Boolean)
        .map(n => String(n).split('@')[0].split(':')[0].replace(/[^0-9]/g, ''))
        .filter(n => n.length > 0);

    _botNumbersCache = [...new Set(cleaned)];
    _botNumbersCacheTime = now;

    return _botNumbersCache;
}

/**
 * Check if sender is owner (bot's own number)
 */
function isOwner(senderId, sock = null) {
    if (!senderId || typeof senderId !== 'string') return false;

    const senderClean = senderId.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (!senderClean) return false;

    const botNumbers = getBotNumbers(sock);

    // If no bot numbers, fallback to direct match
    if (botNumbers.length === 0) {
        if (sock?.user?.id && senderId === sock.user.id) return true;
        if (sock?.user?.lid && senderId === sock.user.lid) return true;
        return false;
    }

    // Compare
    for (const botNum of botNumbers) {
        if (senderClean === botNum) return true;
        if (senderClean.length >= 10 && botNum.length >= 10) {
            if (senderClean.slice(-10) === botNum.slice(-10)) return true;
        }
    }

    return false;
}

/**
 * Check if sender is sudo
 */
function isSudo(senderId) {
    if (!senderId || typeof senderId !== 'string') return false;
    if (SUDO_NUMBERS.length === 0) return false;

    const senderClean = senderId.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

    for (const sudoNum of SUDO_NUMBERS) {
        const cleanSudo = sudoNum.replace(/[^0-9]/g, '');
        if (senderClean === cleanSudo) return true;
        if (senderClean.length >= 10 && cleanSudo.length >= 10) {
            if (senderClean.slice(-10) === cleanSudo.slice(-10)) return true;
        }
    }

    return false;
}

/**
 * Check if sender is owner OR sudo
 */
function isOwnerOrSudo(senderId, sock = null) {
    return isOwner(senderId, sock) || isSudo(senderId);
}

// Clear cache
isOwnerOrSudo.clearCache = () => {
    _botNumbersCache = [];
    _botNumbersCacheTime = 0;
};

module.exports = isOwnerOrSudo;
module.exports.isOwner = isOwner;
module.exports.isSudo = isSudo;
module.exports.isOwnerOrSudo = isOwnerOrSudo;
module.exports.clearCache = isOwnerOrSudo.clearCache;