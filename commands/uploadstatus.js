const { createCtx } = require('../lib/messageBuilder');

const STATUS_JID = 'status@broadcast';

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════

const COMMAND_NAMES = [
    'uploadstatus',
    'upload-status',
    'groupstatus',
    'gstatus',
    'gcsw',
    'swgc',
    'upgcsw',
    'upswgc',
    'gs'
];

const COMMAND_REGEX = new RegExp(
    `^[\\\\/\\.!?#$%^&*\\-+=](${COMMAND_NAMES.join('|')})(?:\\s|$)`,
    'i'
);

// ═══════════════════════════════════════════════════════════
// SAFE HELPERS
// ═══════════════════════════════════════════════════════════

function parseArgs(args) {
    if (Array.isArray(args)) {
        return args
            .map(x => String(x ?? '').trim())
            .filter(Boolean);
    }

    if (typeof args === 'string') {
        return args
            .trim()
            .split(/\s+/)
            .filter(Boolean);
    }

    if (args && typeof args === 'object') {
        if (Array.isArray(args.args)) {
            return args.args
                .map(x => String(x ?? '').trim())
                .filter(Boolean);
        }

        if (typeof args.text === 'string') {
            return args.text
                .trim()
                .split(/\s+/)
                .filter(Boolean);
        }
    }

    return [];
}

function getMsgObject(msg) {
    if (msg && typeof msg === 'object' && msg.key) {
        return msg;
    }

    return {
        key: {
            remoteJid: typeof msg === 'string' ? msg : '',
            fromMe: false
        },
        message: {},
        body: '',
        text: '',
        pushName: 'User'
    };
}

function isGroupJid(jid) {
    return (
        typeof jid === 'string' &&
        jid.endsWith('@g.us')
    );
}

function isValidJid(jid) {
    return (
        typeof jid === 'string' &&
        jid.length > 5 &&
        jid.includes('@') &&
        !jid.startsWith('status@') &&
        !jid.startsWith('broadcast')
    );
}

// ═══════════════════════════════════════════════════════════
// COMMAND TEXT
// ═══════════════════════════════════════════════════════════

function removeCommand(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .replace(
            /^[\/.!?#$%^&*\-+=](?:uploadstatus|upload-status|groupstatus|gstatus|gcsw|swgc|upgcsw|upswgc|gs)\s*/i,
            ''
        )
        .trim();
}

function getBody(msg) {
    return String(
        msg?.body ||
        msg?.text ||
        msg?.message?.conversation ||
        msg?.message?.extendedTextMessage?.text ||
        ''
    ).trim();
}

function isStatusCommand(msg) {
    const body = getBody(msg);
    return COMMAND_REGEX.test(body);
}

// ═══════════════════════════════════════════════════════════
// QUOTED MESSAGE HELPERS
// ═══════════════════════════════════════════════════════════

function getQuotedMessage(msg) {
    if (!msg || typeof msg !== 'object') {
        return null;
    }

    const quoted =
        msg.quoted ||
        msg?.msg?.contextInfo?.quotedMessage ||
        msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
        msg?.message?.imageMessage?.contextInfo?.quotedMessage ||
        msg?.message?.videoMessage?.contextInfo?.quotedMessage ||
        msg?.message?.documentMessage?.contextInfo?.quotedMessage ||
        msg?.message?.audioMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
        return null;
    }

    if (quoted.message) {
        return quoted;
    }

    return {
        message: quoted
    };
}

function getMessageContent(msg) {
    return msg?.message || {};
}

function getQuotedContent(msg) {
    const quoted = getQuotedMessage(msg);
    return quoted?.message || {};
}

// ═══════════════════════════════════════════════════════════
// MEDIA DETECTION
// ═══════════════════════════════════════════════════════════

function getMediaType(msg) {
    const current = getMessageContent(msg);
    const quoted = getQuotedContent(msg);

    if (
        current.imageMessage ||
        quoted.imageMessage
    ) {
        return 'image';
    }

    if (
        current.videoMessage ||
        quoted.videoMessage
    ) {
        return 'video';
    }

    if (
        current.audioMessage ||
        quoted.audioMessage
    ) {
        return 'audio';
    }

    if (
        current.documentMessage ||
        quoted.documentMessage
    ) {
        return 'document';
    }

    return null;
}

function getMediaMessageObject(msg, mediaType) {
    if (!mediaType) {
        return {};
    }

    const current = getMessageContent(msg);
    const quoted = getQuotedContent(msg);

    return (
        current[`${mediaType}Message`] ||
        quoted[`${mediaType}Message`] ||
        {}
    );
}

// ═══════════════════════════════════════════════════════════
// CAPTION / TEXT
// ═══════════════════════════════════════════════════════════

function getInputText(msg, args) {
    const safeMsg = getMsgObject(msg);
    const safeArgs = parseArgs(args);

    // -------------------------------------------------------
    // 1. Command arguments
    // -------------------------------------------------------

    if (safeArgs.length > 0) {
        const joined = safeArgs.join(' ');
        const cleaned = removeCommand(joined);

        if (cleaned) {
            return cleaned;
        }
    }

    // -------------------------------------------------------
    // 2. Current message
    // -------------------------------------------------------

    const current = getMessageContent(safeMsg);

    const currentText =
        current?.conversation ||
        current?.extendedTextMessage?.text ||
        current?.imageMessage?.caption ||
        current?.videoMessage?.caption ||
        current?.documentMessage?.caption ||
        '';

    const cleanedCurrent = removeCommand(
        String(currentText || '').trim()
    );

    if (cleanedCurrent) {
        return cleanedCurrent;
    }

    // -------------------------------------------------------
    // 3. Quoted message
    // -------------------------------------------------------

    const quoted = getQuotedContent(safeMsg);

    const quotedText =
        quoted?.conversation ||
        quoted?.extendedTextMessage?.text ||
        quoted?.imageMessage?.caption ||
        quoted?.videoMessage?.caption ||
        quoted?.documentMessage?.caption ||
        '';

    if (quotedText) {
        return String(quotedText).trim();
    }

    // -------------------------------------------------------
    // 4. Wrapper body/text
    // -------------------------------------------------------

    const body = getBody(safeMsg);

    if (body) {
        return removeCommand(body);
    }

    return '';
}

// ═══════════════════════════════════════════════════════════
// DOWNLOAD MEDIA
// ═══════════════════════════════════════════════════════════

async function downloadMedia(sock, msg, mediaType) {
    if (!sock || !msg || !mediaType) {
        return null;
    }

    if (
        typeof sock.downloadMediaMessage !== 'function'
    ) {
        console.error(
            '[uploadstatus] downloadMediaMessage() is not available'
        );

        return null;
    }

    try {
        const current = getMessageContent(msg);
        const quoted = getQuotedMessage(msg);

        // ---------------------------------------------------
        // Current message
        // ---------------------------------------------------

        if (current?.[`${mediaType}Message`]) {
            try {
                console.log(
                    `[uploadstatus] Downloading current ${mediaType}...`
                );

                const buffer =
                    await sock.downloadMediaMessage(msg);

                if (
                    buffer &&
                    Buffer.isBuffer(buffer) &&
                    buffer.length > 0
                ) {
                    return buffer;
                }
            } catch (error) {
                console.error(
                    '[uploadstatus] Current media download failed:',
                    error?.message || error
                );
            }
        }

        // ---------------------------------------------------
        // Quoted message
        // ---------------------------------------------------

        if (
            quoted?.message?.[`${mediaType}Message`]
        ) {
            try {
                console.log(
                    `[uploadstatus] Downloading quoted ${mediaType}...`
                );

                const buffer =
                    await sock.downloadMediaMessage(quoted);

                if (
                    buffer &&
                    Buffer.isBuffer(buffer) &&
                    buffer.length > 0
                ) {
                    return buffer;
                }
            } catch (error) {
                console.error(
                    '[uploadstatus] Quoted media download failed:',
                    error?.message || error
                );
            }
        }

        return null;

    } catch (error) {
        console.error(
            '[uploadstatus] Media download error:',
            error?.message || error
        );

        return null;
    }
}

// ═══════════════════════════════════════════════════════════
// GROUP AUDIENCE
// ═══════════════════════════════════════════════════════════

async function getGroupAudience(sock, groupJid) {
    try {
        if (!isGroupJid(groupJid)) {
            return [];
        }

        if (
            !sock ||
            typeof sock.groupMetadata !== 'function'
        ) {
            console.error(
                '[uploadstatus] groupMetadata() unavailable'
            );

            return [];
        }

        const metadata =
            await sock.groupMetadata(groupJid);

        const participants =
            Array.isArray(metadata?.participants)
                ? metadata.participants
                : [];

        const audience = [
            ...new Set(
                participants
                    .map(participant => {
                        return (
                            participant?.id ||
                            participant?.jid ||
                            ''
                        );
                    })
                    .filter(isValidJid)
                    .filter(jid => jid !== STATUS_JID)
            )
        ];

        console.log(
            `[uploadstatus] Group: ${metadata?.subject || groupJid}`
        );

        console.log(
            `[uploadstatus] Audience: ${audience.length} members`
        );

        return audience;

    } catch (error) {
        console.error(
            '[uploadstatus] Failed to get group members:',
            error?.message || error
        );

        return [];
    }
}

// ═══════════════════════════════════════════════════════════
// STATUS CONTENT
// ═══════════════════════════════════════════════════════════

function buildStatusContent(
    mediaType,
    buffer,
    mediaMessage,
    caption
) {
    const cleanCaption =
        typeof caption === 'string'
            ? caption.trim()
            : '';

    // -------------------------------------------------------
    // IMAGE
    // -------------------------------------------------------

    if (
        mediaType === 'image' &&
        buffer
    ) {
        return {
            image: buffer,
            caption: cleanCaption || undefined
        };
    }

    // -------------------------------------------------------
    // VIDEO
    // -------------------------------------------------------

    if (
        mediaType === 'video' &&
        buffer
    ) {
        return {
            video: buffer,
            caption: cleanCaption || undefined
        };
    }

    // -------------------------------------------------------
    // AUDIO
    // -------------------------------------------------------

    if (
        mediaType === 'audio' &&
        buffer
    ) {
        return {
            audio: buffer,
            mimetype:
                mediaMessage?.mimetype ||
                'audio/mp4',
            ptt:
                mediaMessage?.ptt === true
        };
    }

    // -------------------------------------------------------
    // DOCUMENT
    // -------------------------------------------------------

    if (
        mediaType === 'document' &&
        buffer
    ) {
        return {
            document: buffer,
            mimetype:
                mediaMessage?.mimetype ||
                'application/octet-stream',
            fileName:
                mediaMessage?.fileName ||
                'status-file',
            caption:
                cleanCaption || undefined
        };
    }

    // -------------------------------------------------------
    // TEXT
    // -------------------------------------------------------

    return {
        text:
            cleanCaption ||
            ' '
    };
}

// ═══════════════════════════════════════════════════════════
// SEND STATUS
// ═══════════════════════════════════════════════════════════

async function sendGroupStatus(
    sock,
    audience,
    content
) {
    if (
        !sock ||
        !Array.isArray(audience) ||
        audience.length === 0
    ) {
        return false;
    }

    if (
        !content ||
        typeof content !== 'object'
    ) {
        return false;
    }

    try {
        console.log(
            `[uploadstatus] Posting status to ${audience.length} members...`
        );

        // Baileys status audience
        await sock.sendMessage(
            STATUS_JID,
            content,
            {
                statusJidList: audience
            }
        );

        console.log(
            '[uploadstatus] ✅ Status posted successfully'
        );

        return true;

    } catch (error) {
        console.error(
            '[uploadstatus] ❌ Status send failed:',
            error?.message || error
        );

        return false;
    }
}

// ═══════════════════════════════════════════════════════════
// MAIN COMMAND
// ═══════════════════════════════════════════════════════════

const uploadStatusCommand = async (
    sock,
    chatId,
    msg,
    args = []
) => {
    try {
        // ---------------------------------------------------
        // Safety
        // ---------------------------------------------------

        if (!sock) {
            console.error(
                '[uploadstatus] Socket unavailable'
            );

            return false;
        }

        const safeMsg =
            getMsgObject(msg);

        const safeArgs =
            parseArgs(args);

        // ---------------------------------------------------
        // Resolve chat
        // ---------------------------------------------------

        let target =
            typeof chatId === 'string'
                ? chatId
                : '';

        if (!target) {
            target =
                safeMsg?.key?.remoteJid || '';
        }

        // createCtx
        try {
            const ctx = createCtx(
                sock,
                target,
                safeMsg,
                {
                    args: safeArgs
                }
            );

            target =
                ctx?.chatId ||
                target ||
                safeMsg?.key?.remoteJid ||
                '';
        } catch (ctxError) {
            console.error(
                '[uploadstatus] createCtx warning:',
                ctxError?.message || ctxError
            );
        }

        // ---------------------------------------------------
        // Must be group
        // ---------------------------------------------------

        if (!isGroupJid(target)) {
            console.log(
                '[uploadstatus] ❌ Command must be used inside a group'
            );

            return false;
        }

        // ---------------------------------------------------
        // Detect media
        // ---------------------------------------------------

        const mediaType =
            getMediaType(safeMsg);

        // ---------------------------------------------------
        // Get caption/text
        // ---------------------------------------------------

        const input =
            getInputText(
                safeMsg,
                safeArgs
            );

        // ---------------------------------------------------
        // Download media
        // ---------------------------------------------------

        let buffer = null;

        if (mediaType) {
            buffer =
                await downloadMedia(
                    sock,
                    safeMsg,
                    mediaType
                );

            if (buffer) {
                console.log(
                    `[uploadstatus] Media downloaded: ${mediaType} (${buffer.length} bytes)`
                );
            } else {
                console.log(
                    `[uploadstatus] ⚠️ Could not download ${mediaType}`
                );
            }
        }

        // ---------------------------------------------------
        // Nothing to post
        // ---------------------------------------------------

        if (!input && !buffer) {

            if (isStatusCommand(safeMsg)) {
                try {
                    await sock.sendMessage(
                        target,
                        {
                            text:
`📤 *UPLOAD STATUS*

━━━━━━━━━━━━━━━━━━
⚠️ *Nothing to post*
━━━━━━━━━━━━━━━━━━

📌 *Text:*
.uploadstatus Hello everyone!

📷 *Image/Video:*
Reply to an image or video:
.uploadstatus

📝 *With caption:*
.uploadstatus My status today ❤️

━━━━━━━━━━━━━━━━━━
👥 The status will be visible to the members of this group.`
                        },
                        {
                            quoted: safeMsg
                        }
                    );
                } catch (sendHelpError) {
                    console.error(
                        '[uploadstatus] Help message failed:',
                        sendHelpError?.message || sendHelpError
                    );
                }
            }

            return false;
        }

        // ---------------------------------------------------
        // Get group members
        // ---------------------------------------------------

        const audience =
            await getGroupAudience(
                sock,
                target
            );

        if (!audience.length) {

            try {
                await sock.sendMessage(
                    target,
                    {
                        text:
`❌ *UPLOAD STATUS FAILED*

No group members were found.

Make sure the bot is still a member of this group and try again.`
                    },
                    {
                        quoted: safeMsg
                    }
                );
            } catch (_) {}

            return false;
        }

        // ---------------------------------------------------
        // Get original media object
        // ---------------------------------------------------

        const mediaMessage =
            getMediaMessageObject(
                safeMsg,
                mediaType
            );

        // ---------------------------------------------------
        // Build status
        // ---------------------------------------------------

        const content =
            buildStatusContent(
                mediaType,
                buffer,
                mediaMessage,
                input
            );

        // ---------------------------------------------------
        // Send status
        // ---------------------------------------------------

        const sent =
            await sendGroupStatus(
                sock,
                audience,
                content
            );

        // ---------------------------------------------------
        // Success
        // ---------------------------------------------------

        if (sent) {

            const type =
                buffer && mediaType
                    ? mediaType
                    : 'text';

            const caption =
                input ||
                (
                    type === 'audio'
                        ? 'Audio status'
                        : 'No caption'
                );

            try {
                await sock.sendMessage(
                    target,
                    {
                        text:
`✅ *STATUS POSTED SUCCESSFULLY*

━━━━━━━━━━━━━━━━━━
📤 *Type:* ${type}
📝 *Caption:* ${caption}
👥 *Group Members:* ${audience.length}
━━━━━━━━━━━━━━━━━━

🚀 Status uploaded successfully.`
                    },
                    {
                        quoted: safeMsg
                    }
                );
            } catch (confirmationError) {
                console.error(
                    '[uploadstatus] Confirmation message failed:',
                    confirmationError?.message || confirmationError
                );
            }

            console.log(
                `[uploadstatus] ✅ SUCCESS | ${type} | ${audience.length} members`
            );

            return true;
        }

        // ---------------------------------------------------
        // Failed
        // ---------------------------------------------------

        try {
            await sock.sendMessage(
                target,
                {
                    text:
`❌ *STATUS UPLOAD FAILED*

WhatsApp could not publish the status.

Please try again.

💡 If you are posting media, make sure the media can be downloaded correctly.`
                },
                {
                    quoted: safeMsg
                }
            );
        } catch (_) {}

        return false;

    } catch (error) {

        console.error(
            '[uploadstatus] ❌ MAIN ERROR:',
            error?.stack ||
            error?.message ||
            error
        );

        // ---------------------------------------------------
        // Safe fallback
        // ---------------------------------------------------

        try {
            const fallbackTarget =
                typeof chatId === 'string'
                    ? chatId
                    : safeMsg?.key?.remoteJid;

            if (
                fallbackTarget &&
                fallbackTarget.endsWith('@g.us')
            ) {
                await sock.sendMessage(
                    fallbackTarget,
                    {
                        text:
`❌ *UPLOAD STATUS ERROR*

Something went wrong while posting the status.

⚠️ ${
    error?.message ||
    'Unknown error'
}

Please try again.`
                    },
                    {
                        quoted: safeMsg
                    }
                );
            }
        } catch (fallbackError) {
            console.error(
                '[uploadstatus] Fallback failed:',
                fallbackError?.message || fallbackError
            );
        }

        return false;
    }
};

// ═══════════════════════════════════════════════════════════
// COMMAND METADATA
// ═══════════════════════════════════════════════════════════

uploadStatusCommand.name = 'uploadstatus';

uploadStatusCommand.aliases = [
    'upload-status',
    'groupstatus',
    'gstatus',
    'gcsw',
    'swgc',
    'upgcsw',
    'upswgc',
    'gs'
];

uploadStatusCommand.category = 'group';

uploadStatusCommand.description =
    '📤 Post text or media to WhatsApp Status using group members as audience';

uploadStatusCommand.permissions = {
    admin: false,
    group: true
};

module.exports = uploadStatusCommand;