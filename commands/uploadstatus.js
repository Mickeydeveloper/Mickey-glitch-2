const { createCtx } = require('../lib/messageBuilder');

const STATUS_JID = 'status@broadcast';

function getQuotedMessage(msg) {
    return msg?.quoted || msg?.msg?.contextInfo?.quotedMessage || null;
}

function getMessageText(message) {
    return message?.conversation || message?.extendedTextMessage?.text || message?.imageMessage?.caption || message?.videoMessage?.caption || message?.documentMessage?.caption || message?.audioMessage?.caption || '';
}

async function getGroupAudience(sock, groupJid) {
    const metadata = await sock.groupMetadata(groupJid);
    const audience = (metadata?.participants || []).map((participant) => participant?.id).filter(Boolean);
    if (!audience.length) throw new Error('No group members found for status audience');
    return audience;
}

async function uploadStatusCommand(sock, chatId, senderId, text, message) {
    const normalizedText = typeof text === 'string' ? text.trim() : '';
    const ctx = createCtx(sock, chatId, message, { text: normalizedText });
    const target = ctx.chatId || chatId || message?.key?.remoteJid;

    if (!target || !target.endsWith('@g.us')) {
        await sock.sendMessage(target || chatId, { text: '❌ .uploadstatus inaweza kutumika ndani ya group tu.' }, { quoted: message });
        return false;
    }

    const quoted = getQuotedMessage(message);
    const caption = normalizedText.replace(/^\.?(?:uploadstatus|status)\s*/i, '').trim() || getMessageText(quoted);
    let mediaBuffer = null;
    let mediaType = null;
    let mimetype = null;

    if (quoted?.imageMessage) {
        mediaType = 'image';
        mimetype = quoted.imageMessage.mimetype;
    } else if (quoted?.videoMessage) {
        mediaType = 'video';
        mimetype = quoted.videoMessage.mimetype;
    } else if (quoted?.audioMessage) {
        mediaType = 'audio';
        mimetype = quoted.audioMessage.mimetype || 'audio/ogg; codecs=opus';
    }

    if (mediaType) {
        if (typeof sock.downloadMediaMessage !== 'function') throw new Error('Media download API is unavailable');
        mediaBuffer = await sock.downloadMediaMessage(quoted);
    }

    if (!mediaBuffer && !caption) {
        await sock.sendMessage(target, { text: '📤 Reply picha, video au audio kisha tumia .uploadstatus, au weka caption ya text.\n\nMfano: .uploadstatus Habari za group' }, { quoted: message });
        return false;
    }

    const contextInfo = {
        isGroupStatus: true,
        pairedMediaType: 'NOT_PAIRED_MEDIA',
        statusAudienceMetadata: { audienceType: 1, listName: message?.pushName || 'Group Status', listEmoji: '🏷️' }
    };
    const content = mediaBuffer
        ? { [mediaType]: mediaBuffer, ...(mimetype ? { mimetype } : {}), ...(mediaType !== 'audio' ? { caption } : {}), contextInfo }
        : { text: caption, contextInfo };

    try {
        const statusAudience = await getGroupAudience(sock, target);
        await sock.sendMessage(STATUS_JID, content, { statusJidList: statusAudience });
        await sock.sendMessage(target, { text: `✅ Status imewekwa kwa members wa group.\n📤 Aina: ${mediaType || 'text'}\n📝 Caption: ${caption || 'Hakuna'}` }, { quoted: message });
        return true;
    } catch (error) {
        console.error('[uploadstatus] Failed:', error?.message || error);
        await sock.sendMessage(target, { text: `❌ Imeshindwa kuweka group status: ${error?.message || 'Unknown error'}` }, { quoted: message });
        return false;
    }
}

uploadStatusCommand.name = 'uploadstatus';
uploadStatusCommand.aliases = ['status', 'upload-status'];
uploadStatusCommand.category = 'group';
uploadStatusCommand.description = 'Upload text, image, video, or audio to status for this group';
uploadStatusCommand.permissions = { admin: true, group: true };

module.exports = uploadStatusCommand;
