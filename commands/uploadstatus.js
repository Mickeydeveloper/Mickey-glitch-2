const { createCtx } = require('../lib/messageBuilder');

const STATUS_JID = 'status@broadcast';

// ===== SAFELY PARSE ARGS =====
function parseArgs(args) {
    if (Array.isArray(args)) return args;
    if (typeof args === 'string') return args.trim().split(/\s+/).filter(Boolean);
    if (args && typeof args === 'object') {
        if (typeof args.text === 'string') return args.text.trim().split(/\s+/).filter(Boolean);
        if (Array.isArray(args.args)) return args.args;
    }
    return [];
}

// ===== SAFELY GET MSG OBJECT =====
function getMsgObject(msg) {
    if (msg && typeof msg === 'object' && msg.key) return msg;
    if (typeof msg === 'string') {
        return { key: { remoteJid: msg, fromMe: false }, message: {}, body: '', text: '', pushName: 'User' };
    }
    return { key: { remoteJid: '', fromMe: false }, message: {}, body: '', text: '', pushName: 'User' };
}

// ===== GET GROUP AUDIENCE =====
async function getGroupAudience(sock, groupJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid);
        return (metadata?.participants || []).map(p => p?.id).filter(Boolean);
    } catch (e) {
        console.error('[uploadstatus] Group metadata failed:', e?.message);
        return [];
    }
}

// ===== GET MEDIA TYPE =====
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

// ===== GET MEDIA MESSAGE OBJECT =====
function getMediaMessageObject(msg, mediaType) {
    const current = msg?.message || {};
    const quotedRaw = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage || {};
    const quoted = quotedRaw?.message || quotedRaw;
    
    if (current[`${mediaType}Message`]) return current[`${mediaType}Message`];
    if (quoted[`${mediaType}Message`]) return quoted[`${mediaType}Message`];
    return {};
}

// ===== DOWNLOAD MEDIA =====
async function downloadMedia(sock, msg, mediaType) {
    try {
        if (!msg || typeof msg !== 'object') return null;
        const current = msg?.message || {};
        const quotedRaw = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage || {};
        const quoted = quotedRaw?.message || quotedRaw;
        
        if (current[`${mediaType}Message`]) {
            console.log('[uploadstatus] Downloading current message media:', mediaType);
            return await sock.downloadMediaMessage(msg);
        }
        if (quoted[`${mediaType}Message`]) {
            console.log('[uploadstatus] Downloading quoted message media:', mediaType);
            const quotedFull = msg.quoted ? msg.quoted : { message: quoted };
            return await sock.downloadMediaMessage(quotedFull);
        }
        return null;
    } catch (e) {
        console.error('[uploadstatus] Download failed:', e?.message);
        return null;
    }
}

// ===== GET INPUT TEXT =====
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
    const quoted = safeMsg?.quoted || safeMsg?.msg?.contextInfo?.quotedMessage;
    if (quoted) {
        const q = quoted.message || quoted;
        const text = q?.imageMessage?.caption ||
                     q?.videoMessage?.caption ||
                     q?.documentMessage?.caption ||
                     q?.conversation ||
                     q?.extendedTextMessage?.text || '';
        if (text) return text;
    }
    
    // From body (remove command)
    const body = safeMsg?.body || safeMsg?.text || '';
    const cleaned = body.replace(/^[\/.!?#$%^&*\-+=]\S+\s*/, '').trim();
    return cleaned;
}

// ===== CHECK IF MESSAGE IS A COMMAND =====
function isStatusCommand(msg) {
    const body = (msg?.body || msg?.text || '').trim();
    const firstWord = body.split(/\s+/)[0] || '';
    return /^[\/.!?#$%^&*\-+=](uploadstatus|upload-status|groupstatus|status|tostatus|gs|gcsw|swgc|upswgc|upgcsw|gstatus)/i.test(firstWord);
}

// ===== MAIN COMMAND =====
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

        // ===== MUST BE A GROUP =====
        const isGroup = target.endsWith('@g.us');
        if (!isGroup) {
            console.log('[uploadstatus] Skipping - not a group');
            return false;
        }

        // ===== GET MEDIA & INPUT =====
        const mediaType = getMediaType(safeMsg);
        const input = getInputText(safeMsg, safeArgs);
        let buffer = null;

        if (mediaType) {
            buffer = await downloadMedia(sock, safeMsg, mediaType);
            if (buffer) {
                console.log('[uploadstatus] Media downloaded:', mediaType, buffer.length, 'bytes');
            } else {
                console.log('[uploadstatus] Media download FAILED');
            }
        }

        // ===== VALIDATION =====
        if (!input && !buffer) {
            if (isStatusCommand(safeMsg)) {
                await sock.sendMessage(target, {
                    text: `📤 UPLOAD STATUS\n━━━━━━━━━━━━━━━━━━━\n⚠️ Send a message or reply to media!\n━━━━━━━━━━━━━━━━━━━\n📌 Examples:\n.uploadstatus Hello everyone!\n.uploadstatus (reply to image)\n━━━━━━━━━━━━━━━━━━━\n📎 Reply to ANY media to auto-post`
                }, { quoted: safeMsg });
            }
            return true;
        }

        // ===== GET GROUP AUDIENCE =====
        const audience = await getGroupAudience(sock, target);
        if (audience.length === 0) {
            await sock.sendMessage(target, {
                text: `❌ No group members found to send status to.`
            }, { quoted: safeMsg });
            return false;
        }

        // ===== BUILD CONTENT FOR GROUP STATUS =====
        const mediaMessage = getMediaMessageObject(safeMsg, mediaType);

        const contextInfo = {
            isGroupStatus: true,
            pairedMediaType: 'NOT_PAIRED_MEDIA',
            statusSourceType: 'TEXT',
            statusAudienceMetadata: {
                audienceType: 1,
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
                groupStatus: true
            };
        } else {
            content = {
                text: input,
                contextInfo,
                groupStatus: true
            };
        }

        // ===== SEND GROUP STATUS =====
        console.log('[uploadstatus] Sending status to', audience.length, 'group members');
        await sock.sendMessage(STATUS_JID, content, {
            statusJidList: audience
        });

        // ===== CONFIRMATION =====
        await sock.sendMessage(target, {
            text: `✅ Group status posted!\n━━━━━━━━━━━━━━━━━━━\n📤 Type: ${mediaType || 'text'}\n📝 Caption: ${input || 'None'}\n👥 Sent to: ${audience.length} group members`
        }, { quoted: safeMsg });

        console.log('[uploadstatus] Success!');
        return true;

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

// ===== EXPORT =====
uploadStatusCommand.name = 'uploadstatus';
uploadStatusCommand.aliases = ['upload-status', 'groupstatus', 'gstatus', 'gcsw', 'swgc', 'upgcsw', 'upswgc', 'gs'];
uploadStatusCommand.category = 'group';
uploadStatusCommand.description = '📤 Post text or media to group status story';
uploadStatusCommand.permissions = { admin: false, group: true };

module.exports = uploadStatusCommand;