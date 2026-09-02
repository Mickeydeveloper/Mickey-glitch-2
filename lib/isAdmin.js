// Simple in-memory cache to reduce groupMetadata calls and avoid rate limits
const groupAdminCache = new Map(); // chatId -> { ts, result }
const CACHE_TTL_MS = 15 * 1000; // 15 seconds

async function fetchGroupMetadataWithRetry(sock, chatId, maxAttempts = 3) {
    let attempt = 0;
    const baseDelay = 400; // ms
    while (attempt < maxAttempts) {
        try {
            return await sock.groupMetadata(chatId);
        } catch (err) {
            attempt++;
            const isRate = (err && (err.statusCode === 429 || err.data === 429 || (err.message && err.message.toLowerCase().includes('rate'))));
            if (attempt >= maxAttempts || !isRate) {
                throw err;
            }
            // exponential backoff with jitter
            const delay = Math.min(2000, baseDelay * Math.pow(2, attempt - 1));
            const jitter = Math.floor(Math.random() * 200);
            await new Promise(r => setTimeout(r, delay + jitter));
        }
    }
}

async function isAdmin(sock, chatId, senderId) {
    try {
        // Safe string conversions (Fixes the crash)
        const safeSenderId = String(senderId || '');
        const safeChatId = String(chatId || '');

        // Check cache first
        const cached = groupAdminCache.get(safeChatId);
        if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
            return cached.result;
        }

        const metadata = await fetchGroupMetadataWithRetry(sock, safeChatId);
        const participants = metadata.participants || [];

        // Extract bot's pure phone number
        const botId = String(sock.user?.id || '');
        const botLid = String(sock.user?.lid || '');
        const botNumber = botId.includes(':') ? botId.split(':')[0] : (botId.includes('@') ? botId.split('@')[0] : botId);
        const botIdWithoutSuffix = botId.includes('@') ? botId.split('@')[0] : botId;
        
        // Extract numeric part from bot LID
        const botLidNumeric = botLid.includes(':') ? botLid.split(':')[0] : (botLid.includes('@') ? botLid.split('@')[0] : botLid);
        const botLidWithoutSuffix = botLid.includes('@') ? botLid.split('@')[0] : botLid;

        const senderNumber = safeSenderId.includes(':') ? safeSenderId.split(':')[0] : (safeSenderId.includes('@') ? safeSenderId.split('@')[0] : safeSenderId);
        const senderIdWithoutSuffix = safeSenderId.includes('@') ? safeSenderId.split('@')[0] : safeSenderId;

        // Check if bot is admin
        const isBotAdmin = participants.some(p => {
            const pPhoneNumber = p.phoneNumber ? String(p.phoneNumber).split('@')[0] : '';
            const pId = p.id ? String(p.id).split('@')[0] : '';
            const pLid = p.lid ? String(p.lid).split('@')[0] : '';
            const pFullId = String(p.id || '');
            const pFullLid = String(p.lid || '');
            
            const pLidNumeric = pLid.includes(':') ? pLid.split(':')[0] : pLid;
            
            const botMatches = (
                botId === pFullId ||
                botId === pFullLid ||
                botLid === pFullLid ||
                botLidNumeric === pLidNumeric ||
                botLidWithoutSuffix === pLid ||
                botNumber === pPhoneNumber ||
                botNumber === pId ||
                botIdWithoutSuffix === pPhoneNumber ||
                botIdWithoutSuffix === pId ||
                (botLid && botLid.split('@')[0].split(':')[0] === pLid)
            );
            
            return botMatches && (p.admin === 'admin' || p.admin === 'superadmin');
        });

        // Check if sender is admin
        const isSenderAdmin = participants.some(p => {
            const pPhoneNumber = p.phoneNumber ? String(p.phoneNumber).split('@')[0] : '';
            const pId = p.id ? String(p.id).split('@')[0] : '';
            const pLid = p.lid ? String(p.lid).split('@')[0] : '';
            const pFullId = String(p.id || '');
            const pFullLid = String(p.lid || '');
            
            const senderMatches = (
                safeSenderId === pFullId ||
                safeSenderId === pFullLid ||
                senderNumber === pPhoneNumber ||
                senderNumber === pId ||
                senderIdWithoutSuffix === pPhoneNumber ||
                senderIdWithoutSuffix === pId ||
                (pLid && senderIdWithoutSuffix === pLid)
            );
            
            return senderMatches && (p.admin === 'admin' || p.admin === 'superadmin');
        });

        const result = { isSenderAdmin, isBotAdmin };
        try { groupAdminCache.set(safeChatId, { ts: Date.now(), result }); } catch (e) {}
        return result;
    } catch (err) {
        console.error('❌ Error in isAdmin:', err);
        return { isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = isAdmin;
