const { createCtx } = require('../lib/messageBuilder');

const COMMANDS = [
    'uploadstatus',
    'upload-status',
    'status',
    'gstatus',
    'gcsw',
    'swgc',
    'upgcsw',
    'upswgc'
];

/**
 * Get quoted message safely
 */
function getQuoted(ctx) {
    return ctx?.quoted || ctx?.msg?.msg?.contextInfo?.quotedMessage || null;
}

/**
 * Get text from quoted message
 */
function getQuotedText(quoted) {
    if (!quoted) return '';

    const msg = quoted?.message || quoted;

    return String(
        msg?.conversation ||
        msg?.extendedTextMessage?.text ||
        msg?.imageMessage?.caption ||
        msg?.videoMessage?.caption ||
        msg?.documentMessage?.caption ||
        msg?.audioMessage?.caption ||
        ''
    ).trim();
}

/**
 * Remove the command itself.
 *
 * Example:
 * .uploadstatus Hello group
 *
 * becomes:
 * Hello group
 */
function cleanCommandText(text) {
    if (!text) return '';

    let value = String(text).trim();

    const commandRegex = new RegExp(
        `^[.!/#]?(${COMMANDS.join('|')})(?:\\s+|$)`,
        'i'
    );

    value = value.replace(commandRegex, '').trim();

    return value;
}

/**
 * Detect media from current message or quoted message
 */
function getMediaType(ctx) {
    const current = ctx?.msg?.message || {};
    const quoted = ctx?.quoted?.message || ctx?.quoted || {};

    if (current.imageMessage || quoted.imageMessage) {
        return 'image';
    }

    if (current.videoMessage || quoted.videoMessage) {
        return 'video';
    }

    return null;
}

/**
 * Get the actual media message
 */
function getMediaMessage(ctx, type) {
    if (!type) return null;

    const key = `${type}Message`;

    const current = ctx?.msg?.message?.[key];
    if (current) return current;

    const quoted = ctx?.quoted?.message?.[key];
    if (quoted) return quoted;

    const quotedRaw = ctx?.quoted?.[key];
    if (quotedRaw) return quotedRaw;

    return null;
}

/**
 * Download media using the bot's existing media system first.
 *
 * This is important because the working command already uses
 * ctx.msg.media.download() / ctx.quoted.media.download().
 */
async function downloadMedia(ctx, type) {
    let lastError = null;

    // 1. Current message media
    try {
        if (
            ctx?.msg?.media &&
            typeof ctx.msg.media.download === 'function'
        ) {
            const buffer = await ctx.msg.media.download();

            if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) {
                return buffer;
            }
        }
    } catch (error) {
        lastError = error;
    }

    // 2. Quoted media
    try {
        if (
            ctx?.quoted?.media &&
            typeof ctx.quoted.media.download === 'function'
        ) {
            const buffer = await ctx.quoted.media.download();

            if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) {
                return buffer;
            }
        }
    } catch (error) {
        lastError = error;
    }

    // 3. Baileys fallback
    try {
        if (
            ctx?.sock &&
            typeof ctx.sock.downloadMediaMessage === 'function'
        ) {
            if (ctx?.msg?.message) {
                const buffer = await ctx.sock.downloadMediaMessage(ctx.msg);

                if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) {
                    return buffer;
                }
            }

            if (ctx?.quoted?.message) {
                const buffer = await ctx.sock.downloadMediaMessage(ctx.quoted);

                if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) {
                    return buffer;
                }
            }
        }
    } catch (error) {
        lastError = error;
    }

    // Return null instead of crashing
    return null;
}

const uploadStatusCommand = {
    name: 'uploadstatus',

    aliases: [
        'status',
        'upload-status',
        'gstatus',
        'gcsw',
        'swgc',
        'upgcsw',
        'upswgc'
    ],

    category: 'group',

    permissions: {
        admin: true,
        group: true
    },

    description:
        'Post text, image or video as WhatsApp Group Status',

    code: async (ctx) => {
        try {
            /*
             * Must be used inside a group
             */
            const chatId =
                ctx?.chatId ||
                ctx?.msg?.key?.remoteJid ||
                '';

            if (!chatId || !chatId.endsWith('@g.us')) {
                return ctx.reply(
                    '❌ Command hii inaweza kutumika ndani ya group tu.'
                );
            }

            /*
             * ================================
             * TEXT
             * ================================
             *
             * ctx.text inaweza kuwa:
             *
             * .uploadstatus Hello group
             *
             * So we remove .uploadstatus first.
             */
            const commandText = cleanCommandText(ctx?.text || '');

            /*
             * If replying to a message, get its caption/text.
             */
            const quoted = getQuoted(ctx);

            const quotedText = getQuotedText(quoted);

            const input = commandText || quotedText || '';

            /*
             * ================================
             * MEDIA
             * ================================
             */
            let mediaType = getMediaType(ctx);
            let buffer = null;

            if (mediaType) {
                buffer = await downloadMedia(ctx, mediaType);

                if (!buffer) {
                    return ctx.reply(
                        '❌ Imeshindikana kupakua media.\n\n' +
                        'Jaribu ku-reply picha/video tena kisha tumia:\n' +
                        '.uploadstatus\n\n' +
                        'Au hakikisha media bado inaweza kufunguliwa WhatsApp.'
                    );
                }
            }

            /*
             * Nothing supplied
             */
            if (!input && !buffer) {
                return ctx.reply(
                    '📤 *GROUP STATUS*\n\n' +
                    'Tuma text:\n' +
                    '.uploadstatus Hello group\n\n' +
                    'Au reply *image/video* kisha tumia:\n' +
                    '.uploadstatus'
                );
            }

            /*
             * ================================
             * MEDIA INFORMATION
             * ================================
             */
            const mediaMessage = getMediaMessage(ctx, mediaType);

            const contextInfo = {
                statusAudienceMetadata: {
                    audienceType: 1,

                    listName:
                        ctx?.sender?.pushName ||
                        'Group Status',

                    listEmoji: '🏷️'
                }
            };

            /*
             * ================================
             * BUILD STATUS CONTENT
             * ================================
             */
            let content;

            if (buffer && mediaType) {
                content = {
                    [mediaType]: buffer,

                    ...(mediaMessage?.mimetype
                        ? {
                              mimetype: mediaMessage.mimetype
                          }
                        : {}),

                    ...(mediaType !== 'audio'
                        ? {
                              caption: input
                          }
                        : {}),

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

            /*
             * ================================
             * IMPORTANT
             * ================================
             *
             * DO NOT use:
             *
             * status@broadcast
             * statusJidList
             * ctx.sock.sendMessage(...)
             *
             * We use the same Group Status mechanism
             * as the working command.
             */
            await ctx.reply(content);

            /*
             * Normal confirmation in the group.
             * The actual status above is the Group Status.
             */
            return ctx.reply(
                ctx?.format?.info
                    ? ctx.format.info(
                          `Group status sent successfully!`
                      )
                    : `✅ Group status sent successfully!`
            );

        } catch (error) {
            console.error(
                '[UPLOADSTATUS ERROR]',
                error
            );

            if (
                ctx?.helper &&
                typeof ctx.helper.handleError === 'function'
            ) {
                return ctx.helper.handleError(
                    ctx,
                    error,
                    false
                );
            }

            return ctx.reply(
                '❌ Imeshindikana kuweka Group Status.\n' +
                'Jaribu tena.'
            );
        }
    }
};

module.exports = uploadStatusCommand;