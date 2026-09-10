const { createCtx } = require('../lib/messageBuilder');

const STATUS_JID = 'status@broadcast';

// ===== AUDIENCE: Get status audience =====
async function getAudience(sock, chatId, msg, customJid = null) {
    // If custom JID provided, use that number
    if (customJid) {
        // Format: 255612130873@s.whatsapp.net
        const cleanNumber = customJid.replace(/[^0-9]/g, '');
        if (!cleanNumber || cleanNumber.length < 10) {
            throw new Error('Invalid phone number provided');
        }
        return [`${cleanNumber}@s.whatsapp.net`];
    }

    const isGroup = chatId?.includes('@g.us') || msg?.key?.remoteJid?.includes('@g.us');

    if (isGroup) {
        if (typeof sock.groupMetadata !== 'function') {
            throw new Error('Baileys group metadata API is unavailable');
        }
        const metadata = await sock.groupMetadata(chatId);
        const audience = (metadata?.participants || [])
            .map((participant) => participant?.id)
            .filter(Boolean);
        if (audience.length === 0) {
            throw new Error('No group members found for status audience');
        }
        return audience;
    } else {
        // Private: send to all contacts
        try {
            if (typeof sock.fetchContacts === 'function') {
                const contacts = await sock.fetchContacts();
                const ids = contacts.map(c => c.id).filter(Boolean);
                if (ids.length > 0) return ids;
            }
        } catch (e) {
            console.log('[tostatus] fetchContacts failed');
        }
        return [];
    }
}

// ===== AUTO-STATUS: Reply to any media to post status =====
async function autoStatusFromMedia(sock, chatId, msg) {
    try {
        // Only process if message is a reply to media
        const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage;
        if (!quoted) return false;

        // Check if quoted has media
        let hasMedia = false;
        let mediaType = null;
        let mediaBuffer = null;
        let mediaMimetype = null;

        if (quoted?.imageMessage) {
            mediaType = 'image';
            mediaMimetype = quoted.imageMessage.mimetype;
            hasMedia = true;
        } else if (quoted?.videoMessage) {
            mediaType = 'video';
            mediaMimetype = quoted.videoMessage.mimetype;
            hasMedia = true;
        } else if (quoted?.audioMessage) {
            mediaType = 'audio';
            mediaMimetype = quoted.audioMessage.mimetype || 'audio/ogg; codecs=opus';
            hasMedia = true;
        } else if (quoted?.documentMessage) {
            mediaType = 'document';
            mediaMimetype = quoted.documentMessage.mimetype;
            hasMedia = true;
        }

        if (!hasMedia) return false;

        // Download media
        mediaBuffer = await sock.downloadMediaMessage(quoted);
        if (!mediaBuffer) return false;

        // Get caption from reply text
        const caption = msg?.body || msg?.text || '';

        // Get audience
        const isGroup = chatId?.includes('@g.us');
        const audience = await getAudience(sock, chatId, msg);

        // Build content
        const content = {
            [mediaType]: mediaBuffer,
            ...(mediaMimetype ? { mimetype: mediaMimetype } : {}),
            ...(mediaType !== 'audio' && caption ? { caption: caption } : {}),
            contextInfo: {
                isGroupStatus: isGroup,
                pairedMediaType: 'NOT_PAIRED_MEDIA',
                statusAudienceMetadata: {
                    audienceType: 1,
                    listName: msg?.pushName || 'User',
                    listEmoji: "🏷️"
                }
            }
        };

        // Send to status
        const sendOptions = {};
        if (audience.length > 0) {
            sendOptions.statusJidList = audience;
        }

        await sock.sendMessage(STATUS_JID, content, sendOptions);

        // Confirm
        await sock.sendMessage(chatId, {
            text: `✅ Auto-status posted!\n━━━━━━━━━━━━━━━━━━━\n📎 Type: ${mediaType}\n${caption ? `📝 "${caption}"` : ''}`
        }, { quoted: msg });

        console.log(`[tostatus] Auto-status posted: ${mediaType}`);
        return true;

    } catch (error) {
        console.error('[tostatus] Auto-status error:', error?.message || error);
        return false;
    }
}

// ===== MAIN COMMAND =====
const tostatusCommand = async (sock, chatId, senderId, text, msg) => {
    try {
        const normalizedArgs = typeof text === 'string'
            ? text.trim().split(/\s+/).filter(Boolean)
            : [];
        const ctx = createCtx(sock, chatId, msg, { args: normalizedArgs });
        const target = ctx.chatId || chatId || msg?.key?.remoteJid;

        if (!sock || !target) {
            console.error('[tostatus] No target or sock');
            return false;
        }

        const isGroup = target?.includes('@g.us') || msg?.key?.remoteJid?.includes('@g.us');

        // ===== AUTO-STATUS CHECK =====
        // If reply to media and no special command, auto-post status
        const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage;
        const hasQuotedMedia = quoted?.imageMessage || quoted?.videoMessage || quoted?.audioMessage || quoted?.documentMessage;

        // Check if this is an auto-status trigger (reply to media with any text)
        if (hasQuotedMedia && !normalizedArgs.some(a => a.match(/^\.?(tostatus|status|gs)/i))) {
            // Only auto-post if the message is not a command (starts with .)
            const body = msg?.body || '';
            const isCommand = /^[\/.!?#$%^&*\-+=]/.test(body.trim());
            
            if (!isCommand) {
                // Auto-post status from replied media
                const result = await autoStatusFromMedia(sock, chatId, msg);
                if (result) return true;
            }
        }

        // ===== MANUAL COMMAND =====
        // Parse custom number from args
        let customJid = null;
        let input = '';

        // Check if first arg is a phone number
        if (normalizedArgs.length > 0) {
            const firstArg = normalizedArgs[0].replace(/[^0-9]/g, '');
            if (firstArg.length >= 10 && firstArg.length <= 15 && /^\d+$/.test(firstArg)) {
                customJid = firstArg;
                input = normalizedArgs.slice(1).join(' ');
            } else {
                input = normalizedArgs.join(' ');
            }
        }

        // Clean input
        input = input.replace(/^\.?(?:tostatus|status|gcsw|swgc|upgcsw|upswgc|gs)\s*/i, '').trim();

        // If no input, check quoted message
        if (!input && quoted) {
            input = quoted?.conversation || 
                    quoted?.extendedTextMessage?.text || 
                    quoted?.imageMessage?.caption ||
                    quoted?.videoMessage?.caption ||
                    quoted?.documentMessage?.caption ||
                    quoted?.buttonsResponseMessage?.selectedButtonId ||
                    '';
        }

        // If still no input, check message body
        if (!input) {
            const body = msg?.body || msg?.text || '';
            const prefixes = ['.', '/', '!', '#', '$', '%', '^', '&', '*', '-', '+', '='];
            for (const prefix of prefixes) {
                if (body.startsWith(prefix)) {
                    const parts = body.split(' ');
                    if (parts.length > 1) {
                        input = parts.slice(1).join(' ');
                    }
                    break;
                }
            }
        }

        // Check for media
        let hasMedia = false;
        let mediaBuffer = null;
        let mediaType = null;
        let mediaMimetype = null;

        if (quoted) {
            if (quoted?.imageMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'image';
                    mediaMimetype = quoted.imageMessage.mimetype;
                    hasMedia = true;
                } catch (e) {
                    console.error('[tostatus] Image download failed:', e);
                }
            } else if (quoted?.videoMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'video';
                    mediaMimetype = quoted.videoMessage.mimetype;
                    hasMedia = true;
                } catch (e) {
                    console.error('[tostatus] Video download failed:', e);
                }
            } else if (quoted?.audioMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'audio';
                    mediaMimetype = quoted.audioMessage.mimetype || 'audio/ogg; codecs=opus';
                    hasMedia = true;
                } catch (e) {
                    console.error('[tostatus] Audio download failed:', e);
                }
            } else if (quoted?.documentMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'document';
                    mediaMimetype = quoted.documentMessage.mimetype;
                    hasMedia = true;
                } catch (e) {
                    console.error('[tostatus] Document download failed:', e);
                }
            }
        }

        // Check current message for media
        if (!hasMedia && msg?.message) {
            const msgMedia = msg.message;
            if (msgMedia?.imageMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(msg);
                    mediaType = 'image';
                    mediaMimetype = msgMedia.imageMessage.mimetype;
                    hasMedia = true;
                } catch (e) {
                    console.error('[tostatus] Current image download failed:', e);
                }
            } else if (msgMedia?.videoMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(msg);
                    mediaType = 'video';
                    mediaMimetype = msgMedia.videoMessage.mimetype;
                    hasMedia = true;
                } catch (e) {
                    console.error('[tostatus] Current video download failed:', e);
                }
            } else if (msgMedia?.audioMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(msg);
                    mediaType = 'audio';
                    mediaMimetype = msgMedia.audioMessage.mimetype || 'audio/ogg; codecs=opus';
                    hasMedia = true;
                } catch (e) {
                    console.error('[tostatus] Current audio download failed:', e);
                }
            }
        }

        // Require either input or media
        if (!input && !hasMedia) {
            await sock.sendMessage(target, {
                text: `📤 TO STATUS\n━━━━━━━━━━━━━━━━━━━\n⚠️ Send a message or reply to media!\n━━━━━━━━━━━━━━━━━━━\n📌 Examples:\n.tostatus Hello everyone!\n.tostatus 255612130873 Hello!\n.tostatus 255612130873 (reply media)\n━━━━━━━━━━━━━━━━━━━\n📎 Or reply to any media to auto-post\n━━━━━━━━━━━━━━━━━━━\n👥 Works in private & group`
            }, { quoted: msg });
            return true;
        }

        // Build content
        let content = {};

        if (hasMedia && mediaBuffer) {
            content = {
                [mediaType]: mediaBuffer,
                ...(mediaMimetype ? { mimetype: mediaMimetype } : {}),
                ...(mediaType !== 'audio' ? { caption: input } : {}),
                contextInfo: {
                    isGroupStatus: isGroup,
                    pairedMediaType: 'NOT_PAIRED_MEDIA',
                    statusAudienceMetadata: {
                        audienceType: 1,
                        listName: msg?.pushName || 'User',
                        listEmoji: "🏷️"
                    }
                }
            };
        } else {
            content = {
                text: input,
                contextInfo: {
                    isGroupStatus: isGroup,
                    pairedMediaType: 'NOT_PAIRED_MEDIA',
                    statusAudienceMetadata: {
                        audienceType: 1,
                        listName: msg?.pushName || 'User',
                        listEmoji: "🏷️"
                    }
                }
            };
        }

        // Get audience (group members, contacts, or custom number)
        const audience = await getAudience(sock, target, msg, customJid);

        // Send to status
        console.log('[tostatus] Sending status:', input);
        
        const sendOptions = {};
        if (audience.length > 0) {
            sendOptions.statusJidList = audience;
        }

        await sock.sendMessage(STATUS_JID, content, sendOptions);

        // Confirmation message
        let targetMsg = 'group members';
        if (customJid) targetMsg = `+${customJid}`;
        else if (!isGroup) targetMsg = 'contacts';

        await sock.sendMessage(target, {
            text: `✅ Status sent to ${targetMsg}!\n━━━━━━━━━━━━━━━━━━━\n📝 "${input || 'Media'}"`
        }, { quoted: msg });

        console.log('[tostatus] Status sent successfully');
        return true;

    } catch (error) {
        console.error('[tostatus] Error:', error?.message || error);

        try {
            const target = chatId || msg?.key?.remoteJid;
            if (target) {
                await sock.sendMessage(target, {
                    text: `❌ Failed to send status\n━━━━━━━━━━━━━━━━━━━\n⚠️ Error: ${error?.message || 'Unknown error'}\n━━━━━━━━━━━━━━━━━━━\nTry again later.`
                }, { quoted: msg });
            }
        } catch (sendErr) {
            console.error('[tostatus] Fallback failed:', sendErr?.message || sendErr);
        }
        return false;
    }
};

// ===== EXPORT =====
tostatusCommand.name = 'tostatus';
tostatusCommand.aliases = ['status', 'gcsw', 'swgc', 'upgcsw', 'upswgc', 'gs'];
tostatusCommand.category = 'general';
tostatusCommand.description = '📤 Send text or media to status (private, group, or custom number)';
tostatusCommand.permissions = {
    admin: false,
    group: false
};

module.exports = tostatusCommand;