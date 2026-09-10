const { createCtx } = require('../lib/messageBuilder');

const STATUS_JID = 'status@broadcast';

// ===== HELPERS =====
function getQuotedMessage(msg) {
    return msg?.quoted || msg?.msg?.contextInfo?.quotedMessage || null;
}

function getQuotedBody(quoted) {
    const message = quoted?.message || quoted;
    return message?.conversation || 
           message?.extendedTextMessage?.text || 
           message?.imageMessage?.caption || 
           message?.videoMessage?.caption || 
           message?.documentMessage?.caption || 
           message?.audioMessage?.caption || '';
}

function getMediaType(msg) {
    const current = msg?.message || {};
    const quoted = msg?.quoted?.message || msg?.quoted || {};
    if (current.imageMessage || quoted.imageMessage) return 'image';
    if (current.videoMessage || quoted.videoMessage) return 'video';
    if (current.audioMessage || quoted.audioMessage) return 'audio';
    if (current.documentMessage || quoted.documentMessage) return 'document';
    return null;
}

async function downloadMedia(sock, msg, mediaType) {
    try {
        const current = msg?.message || {};
        const quoted = msg?.quoted?.message || msg?.quoted || {};

        if (current[`${mediaType}Message`] && typeof sock.downloadMediaMessage === 'function') {
            return await sock.downloadMediaMessage(msg);
        }
        if (quoted[`${mediaType}Message`] && typeof sock.downloadMediaMessage === 'function') {
            return await sock.downloadMediaMessage(msg.quoted || { message: quoted });
        }
        if (msg?.msg?.media?.download) return await msg.msg.media.download();
        if (msg?.quoted?.media?.download) return await msg.quoted.media.download();
        return null;
    } catch (e) {
        console.error('[uploadstatus] Download media failed:', e?.message || e);
        return null;
    }
}

// ===== GET AUDIENCE =====
async function getGroupAudience(sock, groupJid) {
    if (typeof sock.groupMetadata !== 'function') {
        throw new Error('Group metadata API unavailable');
    }
    const metadata = await sock.groupMetadata(groupJid);
    const audience = (metadata?.participants || [])
        .map(p => p?.id)
        .filter(Boolean);
    if (audience.length === 0) {
        throw new Error('No group members found');
    }
    return audience;
}

// ===== AUTO-STATUS FROM REPLY =====
async function autoPostStatus(sock, chatId, msg) {
    try {
        const target = chatId || msg?.key?.remoteJid;
        const isGroup = target?.includes('@g.us');

        const quoted = getQuotedMessage(msg);
        if (!quoted) return false;

        const mediaType = getMediaType({ quoted, message: {} });
        if (!mediaType) return false;

        const buffer = await downloadMedia(sock, { quoted, message: {} }, mediaType);
        if (!buffer) return false;

        const caption = msg?.body || msg?.text || '';
        const mediaMessage = quoted[`${mediaType}Message`] || {};

        const contextInfo = {
            isGroupStatus: isGroup,
            pairedMediaType: 'NOT_PAIRED_MEDIA',
            statusAudienceMetadata: {
                audienceType: 1,
                listName: msg?.pushName || 'User',
                listEmoji: '🏷️'
            }
        };

        const content = {
            [mediaType]: buffer,
            ...(mediaMessage.mimetype ? { mimetype: mediaMessage.mimetype } : {}),
            ...(mediaType !== 'audio' && caption ? { caption } : {}),
            contextInfo
        };

        const sendOptions = {};
        if (isGroup) {
            try {
                const audience = await getGroupAudience(sock, target);
                sendOptions.statusJidList = audience;
            } catch (e) {
                console.error('[autoStatus] Group audience failed:', e);
            }
        }

        await sock.sendMessage(STATUS_JID, content, sendOptions);

        await sock.sendMessage(target, {
            text: `✅ Auto-status posted!\n━━━━━━━━━━━━━━━━━━━\n📎 Type: ${mediaType}\n${caption ? `📝 "${caption}"` : ''}`
        }, { quoted: msg });

        console.log(`[autoStatus] Posted ${mediaType} to status`);
        return true;

    } catch (error) {
        console.error('[autoStatus] Error:', error?.message || error);
        return false;
    }
}

// ===== MAIN COMMAND =====
const uploadStatusCommand = async (sock, chatId, msg, args = []) => {
    try {
        const ctx = createCtx(sock, chatId, msg, { args });
        const target = ctx.chatId || chatId || msg?.key?.remoteJid;

        if (!sock || !target) {
            console.error('[uploadstatus] No target or sock');
            return false;
        }

        const isGroup = target.endsWith('@g.us');

        // ===== AUTO-STATUS CHECK =====
        // If reply to media AND message is not a command
        const quoted = getQuotedMessage(msg);
        const hasQuotedMedia = quoted && getMediaType({ quoted, message: {} });
        const body = (msg?.body || msg?.text || '').trim();
        const isCommand = /^[\/.!?#$%^&*\-+=]/.test(body);

        if (hasQuotedMedia && !isCommand) {
            const result = await autoPostStatus(sock, target, msg);
            if (result) return true;
        }

        // ===== MANUAL COMMAND =====
        const input = String(args.join(' ') || '')
            .replace(/^\.?(?:uploadstatus|status|tostatus|gs)\s*/i, '')
            .trim() || getQuotedBody(quoted);

        const mediaType = getMediaType(msg);
        const buffer = mediaType ? await downloadMedia(sock, msg, mediaType) : null;

        if (!input && !buffer) {
            await sock.sendMessage(target, {
                text: `📤 UPLOAD STATUS\n━━━━━━━━━━━━━━━━━━━\n⚠️ Send a message or reply to media!\n━━━━━━━━━━━━━━━━━━━\n📌 Examples:\n.uploadstatus Hello everyone!\n.uploadstatus (reply image) Nice photo!\n━━━━━━━━━━━━━━━━━━━\n📎 Reply to any media to auto-post\n━━━━━━━━━━━━━━━━━━━\n👥 Works in private & group`
            }, { quoted: msg });
            return true;
        }

        const contextInfo = {
            isGroupStatus: isGroup,
            pairedMediaType: 'NOT_PAIRED_MEDIA',
            statusAudienceMetadata: {
                audienceType: 1,
                listName: msg?.pushName || 'User',
                listEmoji: '🏷️'
            }
        };

        const quotedContent = quoted?.message || quoted || {};
        const mediaMessage = quotedContent[`${mediaType}Message`] || msg?.message?.[`${mediaType}Message`] || {};

        const content = buffer
            ? {
                [mediaType]: buffer,
                ...(mediaMessage.mimetype ? { mimetype: mediaMessage.mimetype } : {}),
                ...(mediaType !== 'audio' ? { caption: input } : {}),
                contextInfo
            }
            : { 
                text: input, 
                contextInfo 
            };

        // Get audience for groups
        const sendOptions = {};
        if (isGroup) {
            try {
                const audience = await getGroupAudience(sock, target);
                sendOptions.statusJidList = audience;
            } catch (e) {
                console.error('[uploadstatus] Audience failed:', e);
            }
        }

        await sock.sendMessage(STATUS_JID, content, sendOptions);

        const targetType = isGroup ? 'group members' : 'contacts';
        await sock.sendMessage(target, {
            text: `✅ Status sent to ${targetType}!\n━━━━━━━━━━━━━━━━━━━\n📤 Type: ${mediaType || 'text'}\n📝 Caption: ${input || 'None'}`
        }, { quoted: msg });

        console.log('[uploadstatus] Status sent successfully');
        return true;

    } catch (error) {
        console.error('[uploadstatus] Error:', error?.message || error);
        try {
            const target = chatId || msg?.key?.remoteJid;
            if (target) {
                await sock.sendMessage(target, {
                    text: `❌ Failed to send status\n━━━━━━━━━━━━━━━━━━━\n⚠️ Error: ${error?.message || 'Unknown'}`
                }, { quoted: msg });
            }
        } catch (e) {}
        return false;
    }
};

// ===== EXPORT =====
uploadStatusCommand.name = 'uploadstatus';
uploadStatusCommand.aliases = ['status', 'upload-status', 'tostatus', 'gs', 'gcsw', 'swgc'];
uploadStatusCommand.category = 'general';
uploadStatusCommand.description = '📤 Upload text or media to status (private & group)';
uploadStatusCommand.permissions = { 
    admin: false, 
    group: false 
};

module.exports = uploadStatusCommand;