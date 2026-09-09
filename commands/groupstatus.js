const { createCtx } = require('../../lib/messageBuilder');

const groupStatusCommand = async (sock, chatId, msg, args = []) => {
    try {
        const ctx = createCtx(sock, chatId, msg, { args });
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
        if (args && args.length > 0) {
            input = args.join(' ');
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

        // If no input, show usage
        if (!input) {
            await sock.sendMessage(target, {
                text: `📝 GROUP STATUS\n━━━━━━━━━━━━━━━━━━━\n⚠️ Please provide a message!\n━━━━━━━━━━━━━━━━━━━\n📌 Examples:\n.groupstatus Hello everyone!\n━━━━━━━━━━━━━━━━━━━\n📎 Or quote a message with caption`
            }, { quoted: msg });
            return true;
        }

        // Check for media in quoted message
        let hasMedia = false;
        let mediaBuffer = null;
        let mediaType = null;

        const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage;
        
        if (quoted) {
            // Check for image
            if (quoted?.imageMessage) {
                try {
                    mediaBuffer = await sock.downloadMediaMessage(quoted);
                    mediaType = 'image';
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
                    hasMedia = true;
                    console.log('[groupstatus] Document downloaded');
                } catch (e) {
                    console.error('[groupstatus] Document download failed:', e);
                }
            }
        }

        // Build and send content
        let content = {};

        if (hasMedia && mediaBuffer) {
            // Send with media
            content = {
                [mediaType]: mediaBuffer,
                caption: input,
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
                content.groupStatus = true;
            }
        } else {
            // Send as text
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
        console.log('[groupstatus] Sending status:', input);
        await sock.sendMessage(target, content, { quoted: msg });

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