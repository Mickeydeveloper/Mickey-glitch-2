const { createCtx } = require('../lib/messageBuilder');

async function test1Command(sock, chatId, message) {
    const ctx = createCtx(sock, chatId, message, { command: 'test1' });

    try {
        const response = [
            '✅ *Test1 command is working*',
            '',
            'This command was created to verify the feature works correctly.',
            '',
            'Usage: .test1',
            'Alias: .t1'
        ].join('\n');

        return await ctx.reply(response, { secureMetaServiceLabel: true });
    } catch (error) {
        console.error('[TEST1 ERROR]', error?.message || error);
        return await ctx.reply('❌ *Test1 failed.* Please try again.');
    }
}

test1Command.name = 'test1';
test1Command.description = 'Simple test command to verify feature usage';
test1Command.category = 'UTILITY';
test1Command.aliases = ['t1'];

module.exports = test1Command;
