const { createCtx } = require('../lib/messageBuilder');

const STATUS_JID = 'status@broadcast';

// ===== GET GROUP AUDIENCE =====
async function getGroupAudience(sock, groupJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid);
        return (metadata?.participants || [])
            .map(p => p?.id)
            .filter(Boolean);
    } catch (e) {
        console.error('[status] Group metadata failed:', e?.message);
        return [];
    }
}

// ===== GET MEDIA TYPE =====
function getMediaType(msg) {
    const current = msg?.message || {};
    const quoted = msg?.quoted?.message || msg?.quoted || msg?.msg?.contextInfo?.quotedMessage || {};
    
    if (current.imageMessage || quoted.imageMessage) return 'image';
    if (current.videoMessage || quoted.videoMessage) return 'video';
    if (current.audioMessage || quoted.audioMessage) return 'audio';
    if (current.documentMessage || quoted.documentMessage) return 'document';
    return null;
}

// ===== DOWNLOAD MEDIA =====
async function downloadMedia(sock, msg, mediaType) {
    try {
        const current = msg?.message || {};
        const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage || {};
        
        if (current[`${mediaType}Message`]) {
            return await sock.downloadMediaMessage(msg);
        }
        if (quoted[`${mediaType}Message`]) {
            const quotedFull = msg.quoted || { message: quoted };
            return await sock.downloadMediaMessage(quotedFull);
        }
        return null;
    } catch (e) {
        console.error('[status] Download failed:', e?.message);
        return null;
    }
}

// ===== GET INPUT TEXT =====
function getInputText(msg, args) {
    // From args
    if (args && args.length > 0) {
        const text = args.join(' ').replace(/^\.?(?:uploadstatus|status|tostatus|gs|gcsw|swgc|upswgc|upgcsw)\s*/i, '').trim();
        if (text) return text;
    }
    
    // From quoted
    const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage;
    if (quoted) {
        const q = quoted.message || quoted;
        const text = q?.conversation || 
                     q?.extendedTextMessage?.text || 
                     q?.imageMessage?.caption || 
                     q?.videoMessage?.caption || 
                     q?.documentMessage?.caption || '';
        if (text) return text;
    }
    
    // From body
    const body = msg?.body || msg?.text || '';
    const parts = body.split(' ');
    if (parts.length > 1) {
        return parts.slice(1).join(' ').trim();
    }
    
    return '';
}

// ===== MAIN COMMAND =====
const uploadStatusCommand = async (sock, chatId, msg, args = []) => {
    try {
        const ctx = createCtx(sock, chatId, msg, { args });
        const target = ctx.chatId || chatId || msg?.key?.remoteJid;

        if (!sock || !target) {
            console.error('[status] No target or sock');
            return false;
        }

        const isGroup = target.endsWith('@g.us');

        // ===== GET INPUT & MEDIA =====
        const input = getInputText(msg, args);
        const mediaType = getMediaType(msg);
        let buffer = null;

        if (mediaType) {
            buffer = await downloadMedia(sock, msg, mediaType);
        }

        // ===== VALIDATION =====
        if (!input && !buffer) {
            await sock.sendMessage(target, {
                text: `📤 STATUS UPLOADER\n━━━━━━━━━━━━━━━━━━━\n⚠️ Send a message or reply to media!\n━━━━━━━━━━━━━━━━━━━\n📌 Examples:\n.uploadstatus Hello everyone!\n.uploadstatus (reply to image)\n━━━━━━━━━━━━━━━━━━━\n📎 Reply to media to auto-post\n━━━━━━━━━━━━━━━━━━━\n👥 Works in private & group`
            }, { quoted: msg });
            return true;
        }

        // ===== BUILD CONTENT =====
        const quotedContent = msg?.quoted?.message || msg?.quoted || msg?.msg?.contextInfo?.quotedMessage || {};
        const mediaMessage = quotedContent[`${mediaType}Message`] || msg?.message?.[`${mediaType}Message`] || {};

        // Context info for status
        const contextInfo = {
            isGroupStatus: isGroup,
            pairedMediaType: 'NOT_PAIRED_MEDIA',
            statusSourceType: 'TEXT',
            statusAudienceMetadata: {
                audienceType: 1,
                listName: msg?.pushName || 'User',
                listEmoji: '🏷️'
            }
        };

        let content;
        if (buffer && mediaType) {
            content = {
                [mediaType]: buffer,
                ...(mediaMessage.mimetype ? { mimetype: mediaMessage.mimetype } : {}),
                ...(mediaType !== 'audio' ? { caption: input || '' } : {}),
                contextInfo
            };
        } else {
            content = {
                text: input,
                contextInfo
            };
        }

        // ===== GET AUDIENCE =====
        let audience = [];
        if (isGroup) {
            audience = await getGroupAudience(sock, target);
            if (audience.length === 0) {
                console.log('[status] No group members found, sending to all');
            }
        }

        // ===== SEND STATUS =====
        const sendOptions = {};
        if (audience.length > 0) {
            sendOptions.statusJidList = audience;
        }

        console.log('[status] Sending to:', STATUS_JID, 'audience:', audience.length || 'all');
        await sock.sendMessage(STATUS_JID, content, sendOptions);

        // ===== CONFIRMATION =====
        const targetMsg = isGroup ? `${audience.length} group members` : 'contacts';
        await sock.sendMessage(target, {
            text: `✅ Status posted!\n━━━━━━━━━━━━━━━━━━━\n📤 Type: ${mediaType || 'text'}\n📝 Caption: ${input || 'None'}\n👥 Sent to: ${targetMsg}`
        }, { quoted: msg });

        console.log('[status] Success!');
        return true;

    } catch (error) {
        console.error('[status] Error:', error?.message || error);

        try {
            const target = chatId || msg?.key?.remoteJid;
            if (target) {
                await sock.sendMessage(target, {
                    text: `❌ Failed to post status\n━━━━━━━━━━━━━━━━━━━\n⚠️ Error: ${error?.message || 'Unknown'}`
                }, { quoted: msg });
            }
        } catch (e) {}
        return false;
    }
};

// ===== EXPORT =====
uploadStatusCommand.name = 'uploadstatus';
uploadStatusCommand.aliases = ['status', 'upload-status', 'tostatus', 'gs', 'gcsw', 'swgc', 'upgcsw', 'upswgc'];
uploadStatusCommand.category = 'general';
uploadStatusCommand.description = '📤 Upload text or media to WhatsApp status';
uploadStatusCommand.permissions = { 
    admin: false, 
    group: false 
};

module.exports = uploadStatusCommand;