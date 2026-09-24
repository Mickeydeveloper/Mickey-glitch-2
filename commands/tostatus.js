const { createCtx } = require('../lib/messageBuilder');
const uploadStatusCommand = require('./uploadstatus');

// Keep the legacy entry point on the working Group Status implementation.
const tostatusCommand = async (sock, chatId, senderId, text, msg) => {
    const commandText = typeof text === 'string' ? text : '';
    const args = commandText.trim().split(/\s+/).filter(Boolean);
    const ctx = createCtx(sock, chatId, msg, {
        args,
        text: commandText,
        command: 'tostatus'
    });

    return uploadStatusCommand.code(ctx);
};

tostatusCommand.name = 'tostatus';
tostatusCommand.aliases = [
    'tostatus',
    'status',
    'gstatus',
    'gcsw',
    'swgc',
    'upgcsw',
    'upswgc',
    'gs',
    'togroupstatus',
    'groupstatus',
    'statusgroup',
    'togcstatus'
];
tostatusCommand.category = 'group';
tostatusCommand.description = 'Post text, image or video as WhatsApp Group Status';
tostatusCommand.permissions = {
    group: true
};

module.exports = tostatusCommand;
