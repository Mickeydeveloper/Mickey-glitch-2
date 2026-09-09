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

const groupStatusCommand = async (sock, chatId, msg, args = []) => {
    try {
        const normalizedArgs = Array.isArray(args)
            ? args.filter((arg) => typeof arg === 'string')
            : typeof args === 'string'
                ? args.trim().split(/\s+/).filter(Boolean)
                : [];
        const ctx = createCtx(sock, chatId, msg, { args: normalizedArgs });
        const target = ctx.chatId || chatId || msg?.key?.remoteJid;

        if (!sock || !target) {
            console.error('[groupstatus] No target or sock');
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
            input = normalizedArgs.join(' ');
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
                    console.log('[groupstatus] Image downloaded');
                } catch (e) {
                    console.error('[groupstatus] Image download failed:', e);
                }
            }
            // Check for video
            else if (quoted?.videoMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'video';
                    mediaMimetype = quoted.videoMessage.mimetype;
                    hasMedia = true;
                    console.log('[groupstatus] Video downloaded');
                } catch (e) {
                    console.error('[groupstatus] Video download failed:', e);
                }
            }
            // Check for document
            else if (quoted?.documentMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'document';
                    mediaMimetype = quoted.documentMessage.mimetype;
                    hasMedia = true;
                    console.log('[groupstatus] Document downloaded');
                } catch (e) {
                    console.error('[groupstatus] Document download failed:', e);
                }
            }
            // Check for audio or voice note
            else if (quoted?.audioMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'audio';
                    mediaMimetype = quoted.audioMessage.mimetype || 'audio/ogg; codecs=opus';
                    hasMedia = true;
                    console.log('[groupstatus] Audio downloaded');
                } catch (e) {
                    console.error('[groupstatus] Audio download failed:', e);
                }
            }
        }

        // A replied media message can be posted without a caption.
        if (!input && !hasMedia) {
            await sock.sendMessage(target, {
                text: `📝 GROUP STATUS\n━━━━━━━━━━━━━━━━━━━\n⚠️ Please provide a message or reply to media!\n━━━━━━━━━━━━━━━━━━━\n📌 Examples:\n.groupstatus Hello everyone!\n━━━━━━━━━━━━━━━━━━━\n📎 Reply to a picture, video, or audio`
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
        console.log('[groupstatus] Sending status:', input);
        await sock.sendMessage(STATUS_JID, content, {
            statusJidList: statusAudience
        });

        // Send confirmation
        await sock.sendMessage(target, {
            text: `✅ Group status sent successfully!\n━━━━━━━━━━━━━━━━━━━\n📝 "${input}"`
        }, { quoted: msg });

        console.log('[groupstatus] Status sent successfully');
        return true;

    } catch (error) {
        console.error('[groupstatus] Error:', error?.message || error);
        
        try {
            const target = chatId || msg?.key?.remoteJid;
            if (target) {
                await sock.sendMessage(target, {
                    text: `❌ Failed to send group status\n━━━━━━━━━━━━━━━━━━━\n⚠️ Error: ${error?.message || 'Unknown error'}\n━━━━━━━━━━━━━━━━━━━\nTry again later.`
                }, { quoted: msg });
            }
        } catch (sendErr) {
            console.error('[groupstatus] Fallback failed:', sendErr?.message || sendErr);
        }
        return false;
    }
};

// Export command
groupStatusCommand.name = 'groupstatus';
groupStatusCommand.aliases = ['gcsw', 'swgc', 'upgcsw', 'upswgc', 'gs'];
groupStatusCommand.category = 'group';
groupStatusCommand.description = '📝 Send group status with text or media';
groupStatusCommand.permissions = {
    admin: false,
    group: true
};

module.exports = groupStatusCommand;