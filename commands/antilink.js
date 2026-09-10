const {
    setAntilink,
    getAntilink,
    removeAntilink
} = require('../lib/index');

/**
 * ================================
 * ANTILINK COMMAND
 * ================================
 */
async function handleAntilinkCommand(
    sock,
    chatId,
    userMessage,
    senderId,
    isSenderAdmin,
    message
) {
    try {
        // Only group admins
        if (!isSenderAdmin) {
            await sock.sendMessage(
                chatId,
                {
                    text: '```😞ᴏɴʟʏ ꜰᴏʀ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ!```'
                },
                { quoted: message }
            );
            return;
        }

        const prefix = '.';

        // Make sure message is a string
        const text = String(userMessage || '').trim();

        // Remove ".antilink"
        const commandText = text
            .replace(/^\.antilink\b/i, '')
            .trim();

        // Parse arguments safely
        const args = commandText
            ? commandText.split(/\s+/).map(arg => arg.toLowerCase())
            : [];

        const action = args[0];

        // ================================
        // USAGE
        // ================================
        if (!action) {
            const usage = `\`\`\`
ANTILINK SETUP

${prefix}antilink on
${prefix}antilink set delete
${prefix}antilink set kick
${prefix}antilink set warn
${prefix}antilink off
${prefix}antilink get
\`\`\``;

            await sock.sendMessage(
                chatId,
                { text: usage },
                { quoted: message }
            );

            return;
        }

        // ================================
        // ON
        // ================================
        if (action === 'on') {
            const existingConfig = await getAntilink(chatId);

            if (existingConfig && existingConfig.enabled) {
                await sock.sendMessage(
                    chatId,
                    {
                        text: '*_Antilink is already ON_*'
                    },
                    { quoted: message }
                );
                return;
            }

            const result = await setAntilink(
                chatId,
                'on',
                'delete'
            );

            await sock.sendMessage(
                chatId,
                {
                    text: result
                        ? '*_⚡ɴᴏ ᴀɴʏ ʟɪɴᴋ ᴀʟʟᴏᴡᴇᴅ ʜᴇʀᴇ_*'
                        : '*_Failed to turn ON Antilink_*'
                },
                { quoted: message }
            );

            return;
        }

        // ================================
        // OFF
        // ================================
        if (action === 'off') {
            const result = await removeAntilink(chatId);

            await sock.sendMessage(
                chatId,
                {
                    text: result !== false
                        ? '*_Antilink has been turned OFF_*'
                        : '*_Failed to turn OFF Antilink_*'
                },
                { quoted: message }
            );

            return;
        }

        // ================================
        // SET ACTION
        // ================================
        if (action === 'set') {
            const setAction = args[1];

            if (!setAction) {
                await sock.sendMessage(
                    chatId,
                    {
                        text:
                            `*_Please specify an action:_*\n\n` +
                            `${prefix}antilink set delete\n` +
                            `${prefix}antilink set kick\n` +
                            `${prefix}antilink set warn`
                    },
                    { quoted: message }
                );

                return;
            }

            if (!['delete', 'kick', 'warn'].includes(setAction)) {
                await sock.sendMessage(
                    chatId,
                    {
                        text:
                            '*_Invalid action._*\n\n' +
                            'Choose: delete, kick, or warn.'
                    },
                    { quoted: message }
                );

                return;
            }

            const setResult = await setAntilink(
                chatId,
                'on',
                setAction
            );

            await sock.sendMessage(
                chatId,
                {
                    text: setResult
                        ? `*_Antilink action set to ${setAction}_*`
                        : '*_Failed to set Antilink action_*'
                },
                { quoted: message }
            );

            return;
        }

        // ================================
        // GET STATUS
        // ================================
        if (action === 'get') {
            const config = await getAntilink(chatId);

            const enabled = Boolean(config?.enabled);
            const configuredAction =
                config?.action ||
                config?.mode ||
                'delete';

            await sock.sendMessage(
                chatId,
                {
                    text:
                        `*_Antilink Configuration:_*\n\n` +
                        `Status: ${enabled ? 'ON' : 'OFF'}\n` +
                        `Action: ${enabled ? configuredAction : 'Not set'}`
                },
                { quoted: message }
            );

            return;
        }

        // ================================
        // INVALID COMMAND
        // ================================
        await sock.sendMessage(
            chatId,
            {
                text:
                    `*_Unknown Antilink command._*\n\n` +
                    `Use ${prefix}antilink get\n` +
                    `or ${prefix}antilink for setup.`
            },
            { quoted: message }
        );

    } catch (error) {
        console.error(
            '[ANTILINK COMMAND ERROR]',
            error?.stack || error
        );

        try {
            await sock.sendMessage(
                chatId,
                {
                    text:
                        '*_❌ Error processing antilink command._*\n\n' +
                        'Check the bot console for the actual error.'
                },
                { quoted: message }
            );
        } catch (sendError) {
            console.error(
                '[ANTILINK ERROR MESSAGE FAILED]',
                sendError?.stack || sendError
            );
        }
    }
}


/**
 * ================================
 * LINK DETECTION
 * ================================
 */
async function handleLinkDetection(
    sock,
    chatId,
    message,
    userMessage,
    senderId
) {
    try {
        const antilinkSetting = await getAntilink(chatId);

        if (!antilinkSetting || !antilinkSetting.enabled) {
            return;
        }

        const mode =
            antilinkSetting.mode === 'on'
                ? 'allLinks'
                : (antilinkSetting.mode || 'allLinks');

        const text = String(userMessage || '');

        console.log(
            `[ANTILINK] ${chatId}`,
            antilinkSetting
        );

        const linkPatterns = {
            whatsappGroup:
                /chat\.whatsapp\.com\/[A-Za-z0-9]{10,}/i,

            whatsappChannel:
                /wa\.me\/channel\/[A-Za-z0-9_-]{5,}/i,

            telegram:
                /(?:https?:\/\/)?t\.me\/[A-Za-z0-9_]+/i,

            allLinks:
                /(?:https?:\/\/|www\.)\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i
        };

        let shouldDelete = false;

        // ================================
        // CHECK LINK TYPE
        // ================================
        if (
            mode === 'whatsappGroup' &&
            linkPatterns.whatsappGroup.test(text)
        ) {
            shouldDelete = true;
        }

        else if (
            mode === 'whatsappChannel' &&
            linkPatterns.whatsappChannel.test(text)
        ) {
            shouldDelete = true;
        }

        else if (
            mode === 'telegram' &&
            linkPatterns.telegram.test(text)
        ) {
            shouldDelete = true;
        }

        else if (
            mode === 'allLinks' &&
            linkPatterns.allLinks.test(text)
        ) {
            shouldDelete = true;
        }

        if (!shouldDelete) {
            return;
        }

        // ================================
        // MESSAGE INFORMATION
        // ================================
        const messageId = message?.key?.id;

        if (!messageId) {
            console.warn(
                '[ANTILINK] Message ID missing. Cannot delete message.'
            );
            return;
        }

        const participant =
            message?.key?.participant ||
            senderId;

        console.log(
            `[ANTILINK] Link detected from ${participant}`
        );

        // ================================
        // DELETE MESSAGE
        // ================================
        try {
            await sock.sendMessage(
                chatId,
                {
                    delete: {
                        remoteJid: chatId,
                        fromMe: false,
                        id: messageId,
                        participant
                    }
                }
            );

            console.log(
                `[ANTILINK] Message ${messageId} deleted successfully.`
            );

        } catch (deleteError) {
            console.error(
                '[ANTILINK DELETE ERROR]',
                deleteError?.stack || deleteError
            );
        }

        // ================================
        // KICK USER
        // ================================
        if (
            antilinkSetting.action === 'kick' &&
            senderId
        ) {
            try {
                await sock.groupParticipantsUpdate(
                    chatId,
                    [senderId],
                    'remove'
                );

                console.log(
                    `[ANTILINK] ${senderId} removed from group.`
                );

            } catch (kickError) {
                console.error(
                    '[ANTILINK KICK ERROR]',
                    kickError?.stack || kickError
                );
            }
        }

        // ================================
        // WARNING
        // ================================
        if (senderId) {
            try {
                await sock.sendMessage(
                    chatId,
                    {
                        text:
                            `⚠️ @${senderId.split('@')[0]}, ` +
                            `posting links is not allowed.`,
                        mentions: [senderId]
                    }
                );

            } catch (warningError) {
                console.error(
                    '[ANTILINK WARNING ERROR]',
                    warningError?.stack || warningError
                );
            }
        }

    } catch (error) {
        console.error(
            '[ANTILINK DETECTION ERROR]',
            error?.stack || error
        );
    }
}


module.exports = {
    handleAntilinkCommand,
    handleLinkDetection
};