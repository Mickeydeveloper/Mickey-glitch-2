const { createCtx } = require('../../lib/messageBuilder');

const groupStatusCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    // Check if in group
    const isGroup = target?.includes('@g.us') || msg?.key?.remoteJid?.includes('@g.us');
    if (!isGroup) {
        await sock.sendMessage(target, {
            text: '❌ This command can only be used in groups!'
        }, { quoted: ctx.msg });
        return false;
    }

    // Get input - supports quoted messages and args
    let input = '';
    
    // Check if there's a quoted message with text
    const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage;
    if (quoted) {
        // Get text from quoted message
        input = quoted?.conversation || 
                quoted?.extendedTextMessage?.text || 
                quoted?.imageMessage?.caption ||
                quoted?.videoMessage?.caption ||
                quoted?.documentMessage?.caption ||
                quoted?.buttonsResponseMessage?.selectedButtonId ||
                '';
    }

    // If no quoted text, use args
    if (!input && args.length > 0) {
        input = args.join(' ');
    }

    // If still no input, check message body
    if (!input) {
        input = msg?.body || msg?.text || '';
    }

    // Clean input - remove command prefix
    const prefixes = ['.', '/', '!', '#', '$', '%', '^', '&', '*', '-', '+', '='];
    for (const prefix of prefixes) {
        if (input.startsWith(prefix)) {
            const parts = input.split(' ');
            if (parts.length > 1) {
                input = parts.slice(1).join(' ');
            } else {
                input = '';
            }
            break;
        }
    }

    if (!input) {
        await sock.sendMessage(target, {
            text: `📝 GROUP STATUS\n━━━━━━━━━━━━━━━━━━━\n⚠️ Please provide a message!\n━━━━━━━━━━━━━━━━━━━\n📌 Examples:\n.groupstatus Hello everyone!\n━━━━━━━━━━━━━━━━━━━\n📎 Or quote a message with caption\n━━━━━━━━━━━━━━━━━━━\n🎯 Or reply to a button with text`
        }, { quoted: ctx.msg });
        return false;
    }

    try {
        // Check for media in quoted message or current message
        let content = {};
        let hasMedia = false;
        let mediaBuffer = null;
        let mediaType = null;

        // Check quoted message for media
        if (quoted) {
            // Image
            if (quoted?.imageMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'image';
                    hasMedia = true;
                } catch (e) {
                    console.error('[groupstatus] Image download failed:', e);
                }
            }
            // Video
            else if (quoted?.videoMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'video';
                    hasMedia = true;
                } catch (e) {
                    console.error('[groupstatus] Video download failed:', e);
                }
            }
            // Document
            else if (quoted?.documentMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'document';
                    hasMedia = true;
                } catch (e) {
                    console.error('[groupstatus] Document download failed:', e);
                }
            }
        }

        // Check current message for media
        if (!hasMedia) {
            const msgMedia = msg?.message;
            if (msgMedia?.imageMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(msg);
                    mediaType = 'image';
                    hasMedia = true;
                } catch (e) {
                    console.error('[groupstatus] Image download failed:', e);
                }
            } else if (msgMedia?.videoMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(msg);
                    mediaType = 'video';
                    hasMedia = true;
                } catch (e) {
                    console.error('[groupstatus] Video download failed:', e);
                }
            }
        }

        // Build content
        if (hasMedia && mediaBuffer) {
            // Prepare caption with input
            const caption = input || '📷 Group Status';
            
            // Build media message
            const mediaContent = {
                [mediaType]: mediaBuffer,
                caption: caption,
                contextInfo: {
                    statusAudienceMetadata: {
                        audienceType: 1,
                        listName: msg?.pushName || 'User',
                        listEmoji: "🏷️"
                    }
                }
            };
            
            // Add groupStatus flag for WhatsApp
            if (mediaType === 'image' || mediaType === 'video') {
                mediaContent.groupStatus = true;
            }
            
            content = mediaContent;
        } else {
            // Text only
            content = {
                text: input,
                contextInfo: {
                    statusAudienceMetadata: {
                        audienceType: 1,
                        listName: msg?.pushName || 'User',
                        listEmoji: "🏷️"
                    }
                }
            };
        }

        // Send the group status
        await sock.sendMessage(target, content, { quoted: ctx.msg });

        // Send confirmation with buttons
        try {
            // Send confirmation with interactive buttons
            const confirmText = `✅ Group status sent successfully!\n━━━━━━━━━━━━━━━━━━━\n📝 "${input}"`;

            // Try to send with buttons (interactive message)
            await sock.sendMessage(target, {
                text: confirmText,
                buttons: [
                    {
                        buttonId: 'groupstatus_view',
                        buttonText: { displayText: '👁️ View' },
                        type: 1
                    },
                    {
                        buttonId: 'groupstatus_delete',
                        buttonText: { displayText: '🗑️ Delete' },
                        type: 1
                    }
                ],
                headerType: 1,
                viewOnce: false,
                contextInfo: {
                    mentionedJid: [target]
                }
            }, { quoted: ctx.msg });
        } catch (buttonError) {
            // Fallback if buttons not supported
            console.log('[groupstatus] Buttons not supported, sending plain confirmation');
            await sock.sendMessage(target, {
                text: `✅ Group status sent successfully!\n━━━━━━━━━━━━━━━━━━━\n📝 "${input}"`
            }, { quoted: ctx.msg });
        }

        return true;

    } catch (error) {
        console.error('[groupstatus] Error:', error?.message || error);
        
        try {
            await sock.sendMessage(target, {
                text: `❌ Failed to send group status\n━━━━━━━━━━━━━━━━━━━\n⚠️ Error: ${error?.message || 'Unknown error'}\n━━━━━━━━━━━━━━━━━━━\nTry again later.`
            }, { quoted: ctx.msg });
        } catch (sendErr) {
            console.error('[groupstatus] Fallback failed:', sendErr?.message || sendErr);
        }
        return false;
    }
};

groupStatusCommand.name = 'groupstatus';
groupStatusCommand.aliases = ['gcsw', 'swgc', 'upgcsw', 'upswgc', 'gs'];
groupStatusCommand.category = 'group';
groupStatusCommand.description = '📝 Send group status with text or media + buttons';
groupStatusCommand.permissions = {
    admin: false,
    group: true
};

module.exports = groupStatusCommand;