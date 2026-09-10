const { createCtx } = require('../lib/messageBuilder');

const STATUS_JID = 'status@broadcast';

async function getAudience(sock, chatId, msg) {
    const isGroup = chatId?.includes('@g.us') || msg?.key?.remoteJid?.includes('@g.us');
    
    if (isGroup) {
        // Group audience
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
        // Private audience - all contacts
        try {
            if (typeof sock.fetchContacts === 'function') {
                const contacts = await sock.fetchContacts();
                return contacts.map(c => c.id).filter(Boolean);
            }
        } catch (e) {
            console.log('[tostatus] fetchContacts failed, using default audience');
        }
        // Fallback: just send to broadcast (all contacts)
        return [];
    }
}

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

        // Determine chat type
        const isGroup = target?.includes('@g.us') || msg?.key?.remoteJid?.includes('@g.us');

        // Get input - from args first
        let input = '';

        // Check args
        if (normalizedArgs.length > 0) {
            input = normalizedArgs.join(' ').replace(/^\.?(?:tostatus|groupstatus|status)\s*/i, '').trim();
        }

        // If no args, check quoted message
        if (!input) {
            const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage;
            if (quoted) {
                input = quoted?.conversation || 
                        quoted?.extendedTextMessage?.text || 
                        quoted?.imageMessage?.caption ||
                        quoted?.videoMessage?.caption ||
                        quoted?.documentMessage?.caption ||
                        quoted?.buttonsResponseMessage?.selectedButtonId ||
                        '';
            }
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

        // Check for media in quoted message
        let hasMedia = false;
        let mediaBuffer = null;
        let mediaType = null;
        let mediaMimetype = null;

        const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage;

        if (quoted) {
            // Image
            if (quoted?.imageMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'image';
                    mediaMimetype = quoted.imageMessage.mimetype;
                    hasMedia = true;
                    console.log('[tostatus] Image downloaded');
                } catch (e) {
                    console.error('[tostatus] Image download failed:', e);
                }
            }
            // Video
            else if (quoted?.videoMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'video';
                    mediaMimetype = quoted.videoMessage.mimetype;
                    hasMedia = true;
                    console.log('[tostatus] Video downloaded');
                } catch (e) {
                    console.error('[tostatus] Video download failed:', e);
                }
            }
            // Document
            else if (quoted?.documentMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'document';
                    mediaMimetype = quoted.documentMessage.mimetype;
                    hasMedia = true;
                    console.log('[tostatus] Document downloaded');
                } catch (e) {
                    console.error('[tostatus] Document download failed:', e);
                }
            }
            // Audio
            else if (quoted?.audioMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'audio';
                    mediaMimetype = quoted.audioMessage.mimetype || 'audio/ogg; codecs=opus';
                    hasMedia = true;
                    console.log('[tostatus] Audio downloaded');
                } catch (e) {
                    console.error('[tostatus] Audio download failed:', e);
                }
            }
        }

        // Check current message for media (if not quoted)
        if (!hasMedia && msg?.message) {
            const msgMedia = msg.message;
            if (msgMedia?.imageMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(msg);
                    mediaType = 'image';
                    mediaMimetype = msgMedia.imageMessage.mimetype;
                    hasMedia = true;
                    console.log('[tostatus] Current image downloaded');
                } catch (e) {
                    console.error('[tostatus] Current image download failed:', e);
                }
            } else if (msgMedia?.videoMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(msg);
                    mediaType = 'video';
                    mediaMimetype = msgMedia.videoMessage.mimetype;
                    hasMedia = true;
                    console.log('[tostatus] Current video downloaded');
                } catch (e) {
                    console.error('[tostatus] Current video download failed:', e);
                }
            } else if (msgMedia?.audioMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(msg);
                    mediaType = 'audio';
                    mediaMimetype = msgMedia.audioMessage.mimetype || 'audio/ogg; codecs=opus';
                    hasMedia = true;
                    console.log('[tostatus] Current audio downloaded');
                } catch (e) {
                    console.error('[tostatus] Current audio download failed:', e);
                }
            }
        }

        // Require either input or media
        if (!input && !hasMedia) {
            await sock.sendMessage(target, {
                text: `📤 TO STATUS\n━━━━━━━━━━━━━━━━━━━\n⚠️ Send a message or reply to media!\n━━━━━━━━━━━━━━━━━━━\n📌 Example:\n.tostatus Hello everyone!\n━━━━━━━━━━━━━━━━━━━\n📎 Or reply to an image/video/audio`
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

        // Get audience (group members or all contacts)
        const audience = await getAudience(sock, target, msg);

        // Send to status
        console.log('[tostatus] Sending status:', input);
        
        const sendOptions = {};
        if (audience.length > 0) {
            sendOptions.statusJidList = audience;
        }

        await sock.sendMessage(STATUS_JID, content, sendOptions);

        // Send confirmation
        const targetType = isGroup ? 'group members' : 'contacts';
        await sock.sendMessage(target, {
            text: `✅ Status sent to ${targetType}!\n━━━━━━━━━━━━━━━━━━━\n📝 "${input || 'Media'}"`
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

// Export command
tostatusCommand.name = 'tostatus';
tostatusCommand.aliases = ['status', 'gcsw', 'swgc', 'upgcsw', 'upswgc', 'gs'];
tostatusCommand.category = 'general';
tostatusCommand.description = '📤 Send text or media to status (works in private & group)';
tostatusCommand.permissions = {
    admin: false,
    group: false
};

module.exports = tostatusCommand;