const { createCtx } = require('../lib/messageBuilder');

const STATUS_JID = 'status@broadcast';

// ===== SAFELY PARSE ARGS =====
function parseArgs(args) {
    if (Array.isArray(args)) return args;
    if (typeof args === 'string') {
        return args.trim().split(/\s+/).filter(Boolean);
    }
    if (args && typeof args === 'object') {
        if (typeof args.text === 'string') {
            return args.text.trim().split(/\s+/).filter(Boolean);
        }
        if (Array.isArray(args.args)) {
            return args.args;
        }
    }
    return [];
}

// ===== SAFELY GET MSG OBJECT =====
function getMsgObject(msg) {
    if (msg && typeof msg === 'object' && msg.key) {
        return msg;
    }
    if (typeof msg === 'string') {
        return {
            key: { remoteJid: msg, fromMe: false },
            message: {},
            body: '',
            text: '',
            pushName: 'User'
        };
    }
    return {
        key: { remoteJid: '', fromMe: false },
        message: {},
        body: '',
        text: '',
        pushName: 'User'
    };
}

// ===== GET GROUP AUDIENCE =====
async function getGroupAudience(sock, groupJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid);
        return (metadata?.participants || [])
            .map(p => p?.id)
            .filter(Boolean);
    } catch (e) {
        console.error('[groupstatus] Group metadata failed:', e?.message);
        return [];
    }
}

// ===== GET MEDIA TYPE =====
function getMediaType(msg) {
    if (!msg || typeof msg !== 'object') return null;
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
        if (!msg || typeof msg !== 'object') return null;
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
        console.error('[groupstatus] Download failed:', e?.message);
        return null;
    }
}

// ===== CHECK IF MESSAGE IS A COMMAND =====
function isCommandMessage(msg) {
    const body = msg?.body || msg?.text || '';
    const trimmed = body.trim();
    // Check if starts with command prefix
    if (/^[\/.!?#$%^&*\-+=]/.test(trimmed)) return true;
    return false;
}

// ===== MAIN COMMAND =====
const groupStatusCommand = async (sock, chatId, msg, args = []) => {
    try {
        const safeMsg = getMsgObject(msg);
        const safeArgs = parseArgs(args);
        
        let safeChatId = chatId;
        if (typeof safeChatId !== 'string') {
            safeChatId = safeMsg?.key?.remoteJid || '';
        }
        if (!safeChatId && typeof msg === 'string') {
            safeChatId = msg;
        }

        const ctx = createCtx(sock, safeChatId, safeMsg, { args: safeArgs });
        const target = ctx.chatId || safeChatId || safeMsg?.key?.remoteJid;

        if (!sock || !target) {
            console.error('[groupstatus] No target or sock');
            return false;
        }

        const isGroup = target.endsWith('@g.us');
        if (!isGroup) {
            console.log('[groupstatus] Not a group, skipping');
            return false;
        }

        // ===== AUTO-DETECT REPLY TO MEDIA (NO COMMAND NEEDED) =====
        const quoted = safeMsg?.quoted || safeMsg?.msg?.contextInfo?.quotedMessage;
        const quotedMediaType = quoted ? getMediaType({ quoted, message: {} }) : null;
        
        // If replying to media AND message is NOT a command → AUTO STATUS
        if (quotedMediaType && !isCommandMessage(safeMsg)) {
            console.log('[groupstatus] Auto-detected media reply:', quotedMediaType);
            
            // Download media
            const buffer = await downloadMedia(sock, safeMsg, quotedMediaType);
            if (!buffer) {
                console.log('[groupstatus] Failed to download media');
                return false;
            }

            // Get caption from reply text
            const caption = safeMsg?.body || safeMsg?.text || '';
            
            // Get group audience
            const audience = await getGroupAudience(sock, target);
            if (audience.length === 0) {
                console.log('[groupstatus] No audience found');
                return false;
            }

            // Get mimetype
            const quotedContent = quoted?.message || quoted || {};
            const mediaMessage = quotedContent[`${quotedMediaType}Message`] || {};

            // Build content
            const contextInfo = {
                isGroupStatus: true,
                pairedMediaType: 'NOT_PAIRED_MEDIA',
                statusSourceType: 'TEXT',
                statusAudienceMetadata: {
                    audienceType: 1,
                    listName: safeMsg?.pushName || 'User',
                    listEmoji: '🏷️'
                }
            };

            const content = {
                [quotedMediaType]: buffer,
                ...(mediaMessage.mimetype ? { mimetype: mediaMessage.mimetype } : {}),
                ...(quotedMediaType !== 'audio' && caption ? { caption } : {}),
                contextInfo,
                groupStatus: true
            };

            // Send to status
            await sock.sendMessage(STATUS_JID, content, {
                statusJidList: audience
            });

            // Send confirmation
            await sock.sendMessage(target, {
                text: `✅ Auto-status posted!\n━━━━━━━━━━━━━━━━━━━\n📤 Type: ${quotedMediaType}\n${caption ? `📝 Caption: ${caption}` : ''}\n👥 Sent to: ${audience.length} group members`
            }, { quoted: safeMsg });

            console.log('[groupstatus] Auto-status success!');
            return true;
        }

        // ===== MANUAL COMMAND =====
        const input = safeArgs.length > 0 
            ? safeArgs.join(' ').replace(/^\.?(?:groupstatus|uploadstatus|status|tostatus|gs|gcsw|swgc|upswgc|upgcsw)\s*/i, '').trim()
            : '';

        const mediaType = getMediaType(safeMsg);
        let buffer = null;

        if (mediaType) {
            buffer = await downloadMedia(sock, safeMsg, mediaType);
        }

        // Validation
        if (!input && !buffer) {
            await sock.sendMessage(target, {
                text: `📤 GROUP STATUS\n━━━━━━━━━━━━━━━━━━━\n⚠️ Send a message or reply to media!\n━━━━━━━━━━━━━━━━━━━\n📌 Examples:\n.groupstatus Hello everyone!\n.groupstatus (reply image)\n━━━━━━━━━━━━━━━━━━━\n📎 Reply to ANY media to auto-post!`
            }, { quoted: safeMsg });
            return true;
        }

        // Build content
        const quotedContent = safeMsg?.quoted?.message || safeMsg?.quoted || safeMsg?.msg?.contextInfo?.quotedMessage || {};
        const mediaMessage = quotedContent[`${mediaType}Message`] || safeMsg?.message?.[`${mediaType}Message`] || {};

        const contextInfo = {
            isGroupStatus: true,
            pairedMediaType: 'NOT_PAIRED_MEDIA',
            statusSourceType: 'TEXT',
            statusAudienceMetadata: {
                audienceType: 1,
                listName: safeMsg?.pushName || 'User',
                listEmoji: '🏷️'
            }
        };

        let content;
        if (buffer && mediaType) {
            content = {
                [mediaType]: buffer,
                ...(mediaMessage.mimetype ? { mimetype: mediaMessage.mimetype } : {}),
                ...(mediaType !== 'audio' ? { caption: input || '' } : {}),
                contextInfo,
                groupStatus: true
            };
        } else {
            content = {
                text: input,
                contextInfo,
                groupStatus: true
            };
        }

        // Get audience
        const audience = await getGroupAudience(sock, target);
        if (audience.length === 0) {
            await sock.sendMessage(target, {
                text: `❌ No group members found.`
            }, { quoted: safeMsg });
            return false;
        }

        // Send status
        console.log('[groupstatus] Sending to', audience.length, 'members');
        await sock.sendMessage(STATUS_JID, content, {
            statusJidList: audience
        });

        // Confirmation
        await sock.sendMessage(target, {
            text: `✅ Group status posted!\n━━━━━━━━━━━━━━━━━━━\n📤 Type: ${mediaType || 'text'}\n📝 Caption: ${input || 'None'}\n👥 Sent to: ${audience.length} group members`
        }, { quoted: safeMsg });

        console.log('[groupstatus] Success!');
        return true;

    } catch (error) {
        console.error('[groupstatus] Error:', error?.message || error);
        return false;
    }
};

// ===== EXPORT =====
groupStatusCommand.name = 'groupstatus';
groupStatusCommand.aliases = ['gstatus', 'gcsw', 'swgc', 'upgcsw', 'upswgc', 'gs'];
groupStatusCommand.category = 'group';
groupStatusCommand.description = '📤 Post status to group members (auto-detect media reply)';
groupStatusCommand.permissions = { 
    admin: false, 
    group: true 
};

module.exports = groupStatusCommand;