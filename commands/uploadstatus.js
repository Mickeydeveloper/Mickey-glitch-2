const { createCtx } = require('../lib/messageBuilder');

const STATUS_JID = 'status@broadcast';

function getQuotedMessage(msg) {
    return msg?.quoted || msg?.msg?.contextInfo?.quotedMessage || null;
}

function getQuotedBody(quoted) {
    const message = quoted?.message || quoted;
    return message?.conversation || message?.extendedTextMessage?.text || message?.imageMessage?.caption || message?.videoMessage?.caption || message?.documentMessage?.caption || message?.audioMessage?.caption || '';
}

async function getGroupAudience(sock, groupJid) {
    const metadata = await sock.groupMetadata(groupJid);
    const audience = (metadata?.participants || []).map((participant) => participant?.id).filter(Boolean);
    if (!audience.length) throw new Error('No group members found for status audience');
    return audience;
}

function getMediaType(ctx) {
    const current = ctx.msg?.message || {};
    const quoted = ctx.quoted?.message || ctx.quoted || {};
    if (current.imageMessage || quoted.imageMessage) return 'image';
    if (current.videoMessage || quoted.videoMessage) return 'video';
    if (current.audioMessage || quoted.audioMessage) return 'audio';
    return null;
}

async function downloadMedia(ctx, mediaType) {
    if (ctx.msg?.message?.[`${mediaType}Message`] && typeof ctx.sock.downloadMediaMessage === 'function') {
        return ctx.sock.downloadMediaMessage(ctx.msg);
    }
    if (ctx.quoted?.message?.[`${mediaType}Message`] && typeof ctx.sock.downloadMediaMessage === 'function') {
        return ctx.sock.downloadMediaMessage(ctx.quoted);
    }
    if (ctx.msg?.media?.download) return ctx.msg.media.download();
    if (ctx.quoted?.media?.download) return ctx.quoted.media.download();
    return null;
}

const uploadStatusCommand = {
    name: 'uploadstatus',
    aliases: ['status', 'upload-status'],
    category: 'group',
    permissions: { admin: true, group: true },
    description: 'Upload text, image, video, or audio to status for this group',
    code: async (ctx) => {
        const target = ctx.chatId || ctx.msg?.key?.remoteJid;
        if (!target || !target.endsWith('@g.us')) {
            return ctx.reply('❌ .uploadstatus inaweza kutumika ndani ya group tu.');
        }

        const input = String(ctx.text || '').replace(/^\.?(?:uploadstatus|status)\s*/i, '').trim() || getQuotedBody(ctx.quoted);
        const mediaType = getMediaType(ctx);
        const buffer = mediaType ? await downloadMedia(ctx, mediaType) : null;

        if (!input && !buffer) {
            return ctx.reply('📤 Reply picha, video au audio kisha tumia .uploadstatus, au weka caption ya text.\n\nMfano: .uploadstatus Habari za group');
        }

        const contextInfo = {
            isGroupStatus: true,
            pairedMediaType: 'NOT_PAIRED_MEDIA',
            statusAudienceMetadata: {
                audienceType: 1,
                listName: ctx.sender?.pushName || 'Group Status',
                listEmoji: '🏷️'
            }
        };
        const quotedContent = ctx.quoted?.message || ctx.quoted || {};
        const mediaMessage = quotedContent[`${mediaType}Message`] || ctx.msg?.message?.[`${mediaType}Message`] || {};
        const content = buffer
            ? {
                [mediaType]: buffer,
                ...(mediaMessage.mimetype ? { mimetype: mediaMessage.mimetype } : {}),
                ...(mediaType !== 'audio' ? { caption: input } : {}),
                contextInfo
            }
            : { text: input, contextInfo };

        const statusAudience = await getGroupAudience(ctx.sock, target);
        await ctx.sock.sendMessage(STATUS_JID, content, { statusJidList: statusAudience });
        return ctx.reply(`✅ Status imewekwa kwa members wa group.\n📤 Aina: ${mediaType || 'text'}\n📝 Caption: ${input || 'Hakuna'}`);
    }
};

module.exports = uploadStatusCommand;
