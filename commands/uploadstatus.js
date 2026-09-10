lconst { createCtx } = require('../lib/messageBuilder');

const STATUS_JID = 'status@broadcast';

// ═══════════════════════════════════════════════════════════
// SAFE PARSERS
// ═══════════════════════════════════════════════════════════

function parseArgs(args) {
    if (Array.isArray(args)) return args;
    if (typeof args === 'string') return args.trim().split(/\s+/).filter(Boolean);
    if (args && typeof args === 'object') {
        if (typeof args.text === 'string') return args.text.trim().split(/\s+/).filter(Boolean);
        if (Array.isArray(args.args)) return args.args;
    }
    return [];
}

function getMsgObject(msg) {
    if (msg && typeof msg === 'object' && msg.key) return msg;
    if (typeof msg === 'string') {
        return { key: { remoteJid: msg, fromMe: false }, message: {}, body: '', text: '', pushName: 'User' };
    }
    return { key: { remoteJid: '', fromMe: false }, message: {}, body: '', text: '', pushName: 'User' };
}

// ═══════════════════════════════════════════════════════════
// GROUP AUDIENCE
// ═══════════════════════════════════════════════════════════

async function getGroupAudience(sock, groupJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid);
        const participants = metadata?.participants || [];
        const audience = participants
            .map(p => p?.id)
            .filter(id => typeof id === 'string' && id.length > 0);
        console.log(`[uploadstatus] Group has ${audience.length} members`);
        return audience;
    } catch (e) {
        console.error('[uploadstatus] Group metadata failed:', e?.message);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════
// MEDIA HELPERS
// ═══════════════════════════════════════════════════════════

function getMediaType(msg) {
    if (!msg || typeof msg !== 'object') return null;
    const current = msg?.message || {};
    const quotedRaw = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage || {};
    const quoted = quotedRaw?.message || quotedRaw;

    if (current.imageMessage || quoted.imageMessage) return 'image';
    if (current.videoMessage || quoted.videoMessage) return 'video';
    if (current.audioMessage || quoted.audioMessage) return 'audio';
    if (current.documentMessage || quoted.documentMessage) return 'document';
    return null;
}

function getMediaMessageObject(msg, mediaType) {
    const current = msg?.message || {};
    const quotedRaw = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage || {};
    const quoted = quotedRaw?.message || quotedRaw;

    if (current[`${mediaType}Message`]) return current[`${mediaType}Message`];
    if (quoted[`${mediaType}Message`]) return quoted[`${mediaType}Message`];
    return {};
}

async function downloadMedia(sock, msg, mediaType) {
    if (!msg || typeof msg !== 'object') return null;
    if (typeof sock.downloadMediaMessage !== 'function') {
        console.error('[uploadstatus] downloadMediaMessage not available');
        return null;
    }

    const current = msg?.message || {};
    const quotedRaw = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage || {};
    const quoted = quotedRaw?.message || quotedRaw;

    // Priority 1: Current message media
    if (current[`${mediaType}Message`]) {
        try {
            console.log('[uploadstatus] Downloading current media:', mediaType);
            const buffer = await sock.downloadMediaMessage(msg);
            if (buffer && buffer.length > 0) return buffer;
        } catch (e) {
            console.error('[uploadstatus] Current media download failed:', e?.message);
        }
    }

    // Priority 2: Quoted media
    if (quoted[`${mediaType}Message`]) {
        try {
            console.log('[uploadstatus] Downloading quoted media:', mediaType);
            const quotedFull = msg.quoted || { message: quoted, key: msg?.msg?.contextInfo };
            const buffer = await sock.downloadMediaMessage(quotedFull);
            if (buffer && buffer.length > 0) return buffer;
        } catch (e) {
            console.error('[uploadstatus] Quoted media download failed:', e?.message);
        }
    }

    return null;
}

// ═══════════════════════════════════════════════════════════
// TEXT HELPERS
// ═══════════════════════════════════════════════════════════

function getInputText(msg, args) {
    const safeArgs = parseArgs(args);
    const safeMsg = getMsgObject(msg);

    // From args
    if (safeArgs.length > 0) {
        const text = safeArgs.join(' ')
            .replace(/^\.?(?:uploadstatus|upload-status|groupstatus|status|tostatus|gs|gcsw|swgc|upswgc|upgcsw|gstatus)\s*/i, '')
            .trim();
        if (text) return text;
    }

    // From quoted caption
    const quotedRaw = safeMsg?.quoted || safeMsg?.msg?.contextInfo?.quotedMessage;
    if (quotedRaw) {
        const q = quotedRaw.message || quotedRaw;
        const text = q?.imageMessage?.caption ||
                     q?.videoMessage?.caption ||
                     q?.documentMessage?.caption ||
                     q?.conversation ||
                     q?.extendedTextMessage?.text || '';
        if (text) return text;
    }

    // From body
    const body = safeMsg?.body || safeMsg?.text || '';
    const cleaned = body.replace(/^[\/.!?#$%^&*\-+=]\S+\s*/, '').trim();
    return cleaned;
}

function isStatusCommand(msg) {
    const body = (msg?.body || msg?.text || '').trim();
    const firstWord = body.split(/\s+/)[0] || '';
    return /^[\/.!?#$%^&*\-+=](uploadstatus|upload-status|groupstatus|status|tostatus|gs|gcsw|swgc|upswgc|upgcsw|gstatus)/i.test(firstWord);
}

// ═══════════════════════════════════════════════════════════
// BUILD GROUP STATUS CONTENT
// ═══════════════════════════════════════════════════════════

function buildGroupStatusContent(mediaType, buffer, mediaMessage, caption, pushName) {
    const contextInfo = {
        isGroupStatus: true,
        pairedMediaType: 'NOT_PAIRED_MEDIA',
        statusSourceType: 'TEXT',
        statusAudienceMetadata: {
            audienceType: 1,
            listName: pushName || 'Group Status',
            listEmoji: '🏷️'
        }
    };

    if (buffer && mediaType) {
        return {
            [mediaType]: buffer,
            ...(mediaMessage?.mimetype ? { mimetype: mediaMessage.mimetype } : {}),
            ...(mediaMessage?.fileName ? { fileName: mediaMessage.fileName } : {}),
            ...(mediaType !== 'audio' ? { caption: caption || '' } : {}),
            contextInfo,
            groupStatus: true
        };
    }

    return {
        text: caption || '',
        contextInfo,
        groupStatus: true
    };
}

// ═══════════════════════════════════════════════════════════
// SEND GROUP STATUS
// ═══════════════════════════════════════════════════════════

async function sendGroupStatus(sock, audience, content) {
    try {
        console.log('[uploadstatus] Sending to status@broadcast with', audience.length, 'recipients');
        await sock.sendMessage(STATUS_JID, content, {
            statusJidList: audience
        });
        console.log('[uploadstatus] Status sent successfully');
        return true;
    } catch (error) {
        console.error('[uploadstatus] Send status failed:', error?.message);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════
// MAIN COMMAND
// ═══════════════════════════════════════════════════════════

const uploadStatusCommand = async (sock, chatId, msg, args = []) => {
    try {
        const safeMsg = getMsgObject(msg);
        const safeArgs = parseArgs(args);

        let safeChatId = chatId;
        if (typeof safeChatId !== 'string') safeChatId = safeMsg?.key?.remoteJid || '';
        if (!safeChatId && typeof msg === 'string') safeChatId = msg;

        const ctx = createCtx(sock, safeChatId, safeMsg, { args: safeArgs });
        const target = ctx.chatId || safeChatId || safeMsg?.key?.remoteJid;

        if (!sock || !target) {
            console.error('[uploadstatus] No target or sock');
            return false;
        }

        // Must be a group
        const isGroup = target.endsWith('@g.us');
        if (!isGroup) {
            console.log('[uploadstatus] Skipping - not a group');
            return false;
        }

        // Get media and text
        const mediaType = getMediaType(safeMsg);
        const input = getInputText(safeMsg, safeArgs);
        let buffer = null;

        if (mediaType) {
            buffer = await downloadMedia(sock, safeMsg, mediaType);
            if (buffer) {
                console.log('[uploadstatus] Downloaded:', mediaType, buffer.length, 'bytes');
            } else {
                console.log('[uploadstatus] Media download failed');
            }
        }

        // Validation
        if (!input && !buffer) {
            if (isStatusCommand(safeMsg)) {
                await sock.sendMessage(target, {
                    text: `📤 UPLOAD STATUS\n━━━━━━━━━━━━━━━━━━━\n⚠️ Send a message or reply to media!\n━━━━━━━━━━━━━━━━━━━\n📌 Examples:\n.uploadstatus Hello everyone!\n.uploadstatus (reply to image)\n━━━━━━━━━━━━━━━━━━━\n📎 Reply to ANY media to auto-post`
                }, { quoted: safeMsg });
            }
            return true;
        }

        // Get group audience
        const audience = await getGroupAudience(sock, target);
        if (audience.length === 0) {
            await sock.sendMessage(target, {
                text: `❌ No group members found to send status to.`
            }, { quoted: safeMsg });
            return false;
        }

        // Build content
        const mediaMessage = getMediaMessageObject(safeMsg, mediaType);
        const content = buildGroupStatusContent(
            mediaType,
            buffer,
            mediaMessage,
            input,
            safeMsg?.pushName
        );

        // Send status
        const sent = await sendGroupStatus(sock, audience, content);

        if (sent) {
            await sock.sendMessage(target, {
                text: `✅ Group status posted!\n━━━━━━━━━━━━━━━━━━━\n📤 Type: ${mediaType || 'text'}\n📝 Caption: ${input || 'None'}\n👥 Sent to: ${audience.length} group members`
            }, { quoted: safeMsg });
            console.log('[uploadstatus] Success!');
            return true;
        } else {
            await sock.sendMessage(target, {
                text: `❌ Failed to post status. Try again.`
            }, { quoted: safeMsg });
            return false;
        }

    } catch (error) {
        console.error('[uploadstatus] Error:', error?.message || error);
        try {
            const fallbackTarget = chatId || (typeof msg === 'string' ? msg : msg?.key?.remoteJid);
            if (fallbackTarget) {
                await sock.sendMessage(fallbackTarget, {
                    text: `❌ Failed to post status\n⚠️ ${error?.message || 'Unknown error'}`
                });
            }
        } catch (e) {}
        return false;
    }
};

// ═══════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════

uploadStatusCommand.name = 'uploadstatus';
uploadStatusCommand.aliases = [
    'upload-status',
    'groupstatus',
    'gstatus',
    'gcsw',
    'swgc',
    'upgcsw',
    'upswgc',
    'gs'
];
uploadStatusCommand.category = 'group';
uploadStatusCommand.description = '📤 Post text or media to group status story';
uploadStatusCommand.permissions = { admin: false, group: true };

module.exports = uploadStatusCommand;