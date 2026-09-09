const { createCtx } = require('../../lib/messageBuilder');

const groupStatusCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    // Check if in group
    const isGroup = msg?.key?.remoteJid?.includes('@g.us') || chatId?.includes('@g.us');
    if (!isGroup) {
        await sock.sendMessage(target, {
            text: '❌ This command can only be used in groups!'
        }, { quoted: ctx.msg });
        return false;
    }

    // Get input text
    const input = args.join(' ') || msg?.body || msg?.text || '';

    if (!input) {
        await sock.sendMessage(target, {
            text: `📝 GROUP STATUS\n━━━━━━━━━━━━━━━━━━━\n⚠️ Please provide a message!\n━━━━━━━━━━━━━━━━━━━\n📌 Example:\n.groupstatus Hello everyone!\n━━━━━━━━━━━━━━━━━━━\n📎 Or send image/video with caption`
        }, { quoted: ctx.msg });
        return false;
    }

    try {
        // Check if message contains media (image/video)
        const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage;
        const isImage = quoted?.imageMessage || msg?.message?.imageMessage;
        const isVideo = quoted?.videoMessage || msg?.message?.videoMessage;
        
        let content = {};

        // If media exists in quoted message
        if (isImage || isVideo) {
            try {
                // Download media from quoted message
                const mediaType = isImage ? 'image' : 'video';
                const mediaMsg = isImage ? quoted.imageMessage : quoted.videoMessage;
                
                // Get media buffer
                const buffer = await sock.downloadMediaMessage(quoted);
                
                content = {
                    [mediaType]: buffer,
                    caption: input,
                    contextInfo: {
                        statusAudienceMetadata: {
                            audienceType: 1,
                            listName: msg?.pushName || 'User',
                            listEmoji: "🏷️"
                        }
                    },
                    groupStatus: true
                };
            } catch (mediaError) {
                console.error('[groupstatus] Media download failed:', mediaError);
                // Fallback to text
                content = {
                    text: input
                };
            }
        } else {
            // Text only
            content = {
                text: input
            };
        }

        // Send group status
        await sock.sendMessage(target, content, { quoted: ctx.msg });
        
        // Send confirmation
        await sock.sendMessage(target, {
            text: `✅ Group status sent successfully!\n━━━━━━━━━━━━━━━━━━━\n📝 "${input}"`
        }, { quoted: ctx.msg });

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
groupStatusCommand.description = '📝 Send group status with text or media';
groupStatusCommand.permissions = {
    admin: false,
    group: true
};

module.exports = groupStatusCommand;