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

// ===== GET INPUT TEXT =====
function getInputText(msg, args) {
    const safeArgs = parseArgs(args);
    const safeMsg = getMsgObject(msg);
    
    if (safeArgs.length > 0) {
        const text = safeArgs.join(' ').replace(/^\.?(?:uploadstatus|status|tostatus|gs|gcsw|swgc|upswgc|upgcsw)\s*/i, '').trim();
        if (text) return text;
    }
    
    const quoted = safeMsg?.quoted || safeMsg?.msg?.contextInfo?.quotedMessage;
    if (quoted) {
        const q = quoted.message || quoted;
        const text = q?.conversation || 
                     q?.extendedTextMessage?.text || 
                     q?.imageMessage?.caption || 
                     q?.videoMessage?.caption || 
                     q?.documentMessage?.caption || '';
        if (text) return text;
    }
    
    const body = safeMsg?.body || safeMsg?.text || '';
    const parts = body.split(' ');
    if (parts.length > 1) {
        return parts.slice(1).join(' ').trim();
    }
    
    return '';
}

// ===== MAIN COMMAND =====
const uploadStatusCommand = async (sock, chatId, msg, args = []) => {
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

        // ===== GET INPUT & MEDIA =====
        const input = getInputText(safeMsg, safeArgs);
        const mediaType = getMediaType(safeMsg);
        let buffer = null;

        if (mediaType) {
            buffer = await downloadMedia(sock, safeMsg, mediaType);
        }

        // ===== VALIDATION =====
        if (!input && !buffer) {
            await sock.sendMessage(target, {
                text: `📤 GROUP STATUS\n━━━━━━━━━━━━━━━━━━━\n⚠️ Send a message or reply to media!\n━━━━━━━━━━━━━━━━━━━\n📌 Examples:\n.groupstatus Hello everyone!\n.groupstatus (reply to image)\n━━━━━━━━━━━━━━━━━━━\n📎 Reply to media to auto-post\n━━━━━━━━━━━━━━━━━━━\n👥 Only works in groups`
            }, { quoted: safeMsg });
            return true;
        }

        // ===== BUILD CONTENT =====
        const quotedContent = safeMsg?.quoted?.message || safeMsg?.quoted || safeMsg?.msg?.contextInfo?.quotedMessage || {};
        const mediaMessage = quotedContent[`${mediaType}Message`] || safeMsg?.message?.[`${mediaType}Message`] || {};

        // Context info for GROUP STATUS
        const contextInfo = {
            isGroupStatus: true, // ← IMPORTANT: Makes it a GROUP status
            pairedMediaType: 'NOT_PAIRED_MEDIA',
            statusSourceType: 'TEXT',
            statusAudienceMetadata: {
                audienceType: 1, // ← 1 = Custom audience (group members)
                listName: safeMsg?.pushName || 'Group Status',
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
                groupStatus: true // ← IMPORTANT: Marks as group status
            };
        } else {
            content = {
                text: input,
                contextInfo,
                groupStatus: true // ← IMPORTANT: Marks as group status
            };
        }

        // ===== GET GROUP AUDIENCE =====
        if (!isGroup) {
            await sock.sendMessage(target, {
                text: `❌ Group status only works in groups!\n━━━━━━━━━━━━━━━━━━━\nThis command sends status to group members only.`
            }, { quoted: safeMsg });
            return false;
        }

        const audience = await getGroupAudience(sock, target);
        if (audience.length === 0) {
            await sock.sendMessage(target, {
                text: `❌ No group members found to send status to.`
            }, { quoted: safeMsg });
            return false;
        }

        // ===== SEND GROUP STATUS =====
        // Send to status@broadcast with group audience ONLY
        const sendOptions = {
            statusJidList: audience // ← Only group members see it
        };

        console.log('[groupstatus] Sending group status to', audience.length, 'members');
        await sock.sendMessage(STATUS_JID, content, sendOptions);

        // ===== CONFIRMATION =====
        await sock.sendMessage(target, {
            text: `✅ Group status posted!\n━━━━━━━━━━━━━━━━━━━\n📤 Type: ${mediaType || 'text'}\n📝 Caption: ${input || 'None'}\n👥 Sent to: ${audience.length} group members`
        }, { quoted: safeMsg });

        console.log('[groupstatus] Success!');
        return true;

    } catch (error) {
        console.error('[groupstatus] Error:', error?.message || error);

        try {
            const fallbackTarget = chatId || (typeof msg === 'string' ? msg : msg?.key?.remoteJid);
            if (fallbackTarget) {
                await sock.sendMessage(fallbackTarget, {
                    text: `❌ Failed to post group status\n━━━━━━━━━━━━━━━━━━━\n⚠️ Error: ${error?.message || 'Unknown'}`
                });
            }
        } catch (e) {
            console.error('[groupstatus] Fallback failed:', e?.message);
        }
        return false;
    }
};

// ===== EXPORT =====
uploadStatusCommand.name = 'groupstatus';
uploadStatusCommand.aliases = ['gstatus', 'gcsw', 'swgc', 'upgcsw', 'upswgc', 'gs'];
uploadStatusCommand.category = 'group';
uploadStatusCommand.description = '📤 Post status to group members only';
uploadStatusCommand.permissions = { 
    admin: false, 
    group: true 
};

module.exports = uploadStatusCommand;