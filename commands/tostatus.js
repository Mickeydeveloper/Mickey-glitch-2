const { createCtx } = require('../lib/messageBuilder');

const STATUS_JID = 'status@broadcast';

async function getGroupAudience(sock, groupJid) {
    if (typeof sock.groupMetadata !== 'function') {
        throw new Error('Baileys group metadata API is unavailable');
    }

    const metadata = await sock.groupMetadata(groupJid);
    const audience = (metadata?.participants || [])
        .map((participant) => participant?.id)
        .filter(Boolean);

    if (audience.length === 0) {
        throw new Error('No group members were found for the status audience');
    }

    return audience;
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

        // Check if in group
        const isGroup = target?.includes('@g.us') || msg?.key?.remoteJid?.includes('@g.us');
        if (!isGroup) {
            await sock.sendMessage(target, {
                text: '❌ This command can only be used in groups!'
            }, { quoted: msg });
            return false;
        }

        // Get input - from args first
        let input = '';
        
        // Check args
        if (normalizedArgs.length > 0) {
            input = normalizedArgs.join(' ').replace(/^\.?(?:tostatus|groupstatus)\s*/i, '').trim();
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
            // Remove command prefix
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
            // Check for image
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
            // Check for video
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
            // Check for document
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
            // Check for audio or voice note
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

        // A replied media message can be posted without a caption.
        if (!input && !hasMedia) {
            await sock.sendMessage(target, {
                text: `📤 TO STATUS\n━━━━━━━━━━━━━━━━━━━\n⚠️ Tuma message au reply picha, video, au audio!\n━━━━━━━━━━━━━━━━━━━\n📌 Example:\n.tostatus Hello everyone!\n━━━━━━━━━━━━━━━━━━━\n📎 Au reply media`
            }, { quoted: msg });
            return true;
        }

        // Build and send content
        let content = {};

        if (hasMedia && mediaBuffer) {
            // Send with media
            content = {
                [mediaType]: mediaBuffer,
                ...(mediaMimetype ? { mimetype: mediaMimetype } : {}),
                ...(mediaType !== 'audio' ? { caption: input } : {}),
                contextInfo: {
                    isGroupStatus: true,
                    pairedMediaType: 'NOT_PAIRED_MEDIA',
                    statusAudienceMetadata: {
                        audienceType: 1,
                        listName: msg?.pushName || 'User',
                        listEmoji: "🏷️"
                    }
                }
            };
            
        } else {
            // Send as text
            content = {
                text: input,
                contextInfo: {
                    isGroupStatus: true,
                    pairedMediaType: 'NOT_PAIRED_MEDIA',
                    statusAudienceMetadata: {
                        audienceType: 1,
                        listName: msg?.pushName || 'User',
                        listEmoji: "🏷️"
                    }
                }
            };
        }

        const statusAudience = await getGroupAudience(sock, target);

        // Publish to WhatsApp Status and restrict the audience to this group.
        console.log('[tostatus] Sending group audience status:', input);
        await sock.sendMessage(STATUS_JID, content, {
            statusJidList: statusAudience
        });

        // Send confirmation
        await sock.sendMessage(target, {
            text: `✅ Status imewekwa kwa members wa group!\n━━━━━━━━━━━━━━━━━━━\n📝 "${input}"`
        }, { quoted: msg });

        console.log('[tostatus] Status sent successfully');
        return true;

    } catch (error) {
        console.error('[tostatus] Error:', error?.message || error);
        
        try {
            const target = chatId || msg?.key?.remoteJid;
            if (target) {
                await sock.sendMessage(target, {
                    text: `❌ Failed to send group status\n━━━━━━━━━━━━━━━━━━━\n⚠️ Error: ${error?.message || 'Unknown error'}\n━━━━━━━━━━━━━━━━━━━\nTry again later.`
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
tostatusCommand.aliases = ['tostatus', 'gcsw', 'swgc', 'upgcsw', 'upswgc', 'gs'];
tostatusCommand.category = 'group';
tostatusCommand.description = '📤 Send text or media to status for this group';
tostatusCommand.permissions = {
    admin: false,
    group: true
};

module.exports = tostatusCommand;