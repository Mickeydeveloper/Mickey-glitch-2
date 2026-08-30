const settings = require('../settings');
const { AIRich, createCalendarUrl, getContext, normalizeArgs } = require('../lib/messageBuilder');

const appointments = new Map();

function getDateLabel(date = new Date()) {
    return new Date(date).toLocaleDateString(settings.locale || 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: settings.timezone || 'Africa/Dar_es_Salaam',
    });
}

function sendReply(sock, chatId, msg, text, reply) {
    if (typeof reply === 'function') return reply(text);
    if (sock && chatId) return sock.sendMessage(chatId, { text }, { quoted: msg });
    return null;
}

async function aiCalendarCommand(sockOrCtx, chatIdParam, msgParam, argsParam) {
    const { sock, chatId, msg, args, reply } = getContext(sockOrCtx, chatIdParam, msgParam, argsParam);
    const inputArgs = normalizeArgs(args);
    const action = inputArgs[0]?.toLowerCase();
    const title = (action === 'confirm' || action === 'cancel')
        ? appointments.get(chatId)?.title || settings.defaultTitle || 'Mickey AI Appointment'
        : inputArgs.join(' ') || settings.defaultTitle || 'Mickey AI Appointment';

    if (!sock || !chatId) {
        throw new Error('Chat context is required');
    }

    if (action === 'confirm' || action === 'cancel') {
        const appointment = appointments.get(chatId);
        if (!appointment) {
            return sendReply(sock, chatId, msg, '📅 Hakuna appointment inayosubiri confirmation. Tumia `.aicalendar <jina la appointment>` kwanza.', reply);
        }

        if (action === 'cancel') {
            appointments.delete(chatId);
            return sendReply(sock, chatId, msg, `❌ Appointment *${appointment.title}* imefutwa.`, reply);
        }

        appointment.status = 'Confirmed';
        const text = `✅ Appointment *${appointment.title}* imethibitishwa.\n\n🔗 Ongeza kwenye Google Calendar:\n${createCalendarUrl(appointment)}`;
        return sendReply(sock, chatId, msg, text, reply);
    }

    const appointment = {
        title,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'Pending confirmation',
    };
    appointments.set(chatId, appointment);

    try {
        const dateLabel = getDateLabel(appointment.date);
        const builder = new AIRich(sock)
            .setTitle(settings.botName || 'MICKEY AI CALENDAR')
            .setBody(`Appointment: ${title}`)
            .setFooter('Choose an action below')
            .addText(`📅 *${title}*\n\nDate: ${dateLabel}\nTime: 10:00 AM\nTimezone: East Africa Time`)
            .addWidget({
                title,
                sections: [{
                    title: 'Appointment details',
                    items: [
                        { label: 'Date', value: dateLabel },
                        { label: 'Time', value: '10:00 AM EAT' },
                        { label: 'Status', value: 'Pending confirmation' },
                    ],
                }],
                actions: [
                    {
                        label: 'Confirm appointment',
                        id: '.aicalendar confirm',
                        kind: 'CONFIRM',
                        state: 'PENDING',
                        toast: { label: 'Appointment confirmed' },
                    },
                    {
                        label: 'Cancel appointment',
                        id: '.aicalendar cancel',
                        kind: 'CANCEL',
                        state: 'PENDING',
                        toast: { label: 'Appointment cancelled' },
                    },
                ],
            })
            .addFooterAction({
                text: 'View calendar',
                type: 'OPEN_URL',
                url: createCalendarUrl(appointment),
            });

        await builder.send(chatId, { quoted: msg });
    } catch (error) {
        console.error('AI Calendar Error:', error.message);
        const fallback = `📅 *${title}*\n\nDate: ${getDateLabel()}\nTime: 10:00 AM EAT\n\nReply with *confirm* or *cancel*.`;
        return sendReply(sock, chatId, msg, fallback, reply);
    }
}

module.exports = aiCalendarCommand;
module.exports.name = 'aicalendar';
module.exports.aliases = ['calendar', 'event'];
module.exports.category = 'ai';
module.exports.desc = 'AI calendar event with interactive confirmation buttons';
module.exports.run = aiCalendarCommand;
module.exports.handler = aiCalendarCommand;
module.exports.execute = aiCalendarCommand;
