const settings = require('../settings');

class AIRich {
    constructor(sock) {
        this.sock = sock;
        this.title = settings.botName || 'MICKEY GLITCH 2';
        this.body = '';
        this.footer = '';
        this.textLines = [];
        this.widgets = [];
        this.footerActions = [];
    }

    static botInfo() {
        return settings.getBotIdentity ? settings.getBotIdentity() : {
            name: settings.botName || 'HASEEB MINI BOT',
            prefix: settings.prefix || '.',
            owner: settings.ownerName || 'HASEEB',
            ownerNumber: settings.ownerNumber || '',
            timezone: settings.timezone || 'Africa/Dar_es_Salaam',
            version: settings.version || '3.0.0',
        };
    }

    static createBotCard(sock, { title, body, footer, lines = [], items = [], actions = [] } = {}) {
        const builder = new AIRich(sock)
            .setTitle(title || settings.botName || 'HASEEB MINI BOT')
            .setBody(body || '')
            .setFooter(footer || 'Powered by HASEEB MINI BOT');

        for (const line of lines) builder.addText(line);
        if (Array.isArray(items) && items.length) {
            builder.addWidget({
                title: 'Bot info',
                sections: [{ title: 'Details', items }],
            });
        }
        for (const action of actions) builder.addFooterAction(action);
        return builder;
    }

    static success(sock, title, body, footer = 'Success') {
        return new AIRich(sock)
            .setTitle(title || settings.botName || 'HASEEB MINI BOT')
            .setBody(body || '')
            .setFooter(footer)
            .addText('✅ Success');
    }

    static warning(sock, title, body, footer = 'Warning') {
        return new AIRich(sock)
            .setTitle(title || settings.botName || 'HASEEB MINI BOT')
            .setBody(body || '')
            .setFooter(footer)
            .addText('⚠️ Warning');
    }

    static error(sock, title, body, footer = 'Error') {
        return new AIRich(sock)
            .setTitle(title || settings.botName || 'HASEEB MINI BOT')
            .setBody(body || '')
            .setFooter(footer)
            .addText('❌ Error');
    }

    setTitle(title) {
        this.title = title || this.title;
        return this;
    }

    setBody(body) {
        this.body = body || '';
        return this;
    }

    setFooter(footer) {
        this.footer = footer || '';
        return this;
    }

    addText(text) {
        if (text && String(text).trim()) this.textLines.push(String(text).trim());
        return this;
    }

    addWidget(widget) {
        if (widget) this.widgets.push(widget);
        return this;
    }

    addFooterAction(action) {
        if (action) this.footerActions.push(action);
        return this;
    }

    addList(items = []) {
        if (Array.isArray(items)) {
            for (const item of items) {
                if (item && (item.label || item.value || item.text)) {
                    const label = item.label || item.text || 'Item';
                    const value = item.value || '';
                    this.addText(`${label}${value ? `: ${value}` : ''}`);
                }
            }
        }
        return this;
    }

    async send(chatId, options = {}) {
        if (!this.sock || !chatId) {
            throw new Error('Chat context is required');
        }

        const content = this.buildMessage();
        return this.sock.sendMessage(chatId, content, options);
    }

    buildMessage() {
        const sections = [];

        if (this.body) {
            sections.push({ title: this.title, rows: [{ title: this.body }] });
        }

        if (this.textLines.length) {
            sections.push({ title: 'Details', rows: this.textLines.map((line) => ({ title: line })) });
        }

        for (const widget of this.widgets) {
            sections.push({ title: widget.title || 'Options', rows: [
                ...(widget.sections || []).flatMap((section) => (section.items || []).map((item) => ({
                    title: `${item.label}: ${item.value}`,
                }))),
            ] });
        }

        if (this.footerActions.length) {
            sections.push({ title: this.footer || 'Action', rows: this.footerActions.map((action) => ({
                title: action.text,
                url: action.url,
                type: action.type,
            })) });
        }

        const textMessage = [
            `*${this.title}*`,
            this.body ? `\n${this.body}` : '',
            this.textLines.length ? `\n${this.textLines.join('\n')}` : '',
            this.footer ? `\n\n_${this.footer}_` : '',
        ].join('');

        return { text: textMessage.trim() };
    }
}

function normalizeArgs(args) {
    return Array.isArray(args) ? args.map((arg) => String(arg).trim()).filter(Boolean) : [];
}

function getContext(sockOrCtx, chatIdParam, msgParam, argsParam) {
    if (sockOrCtx && (sockOrCtx.sock || sockOrCtx.core)) {
        return {
            sock: sockOrCtx.sock || sockOrCtx.core,
            chatId: sockOrCtx.chatId || sockOrCtx.msg?.key?.remoteJid,
            msg: sockOrCtx.msg || sockOrCtx.quoted,
            args: sockOrCtx.args || [],
            reply: sockOrCtx.reply,
        };
    }

    return {
        sock: sockOrCtx,
        chatId: chatIdParam,
        msg: msgParam,
        args: argsParam || [],
    };
}

function createCalendarUrl(appointment) {
    const start = new Date(appointment.date);
    const tz = settings.calendar?.timezone || 'Africa/Dar_es_Salaam';
    const defaultHour = 7;
    start.setHours(defaultHour, 0, 0, 0);
    const end = new Date(start.getTime() + (settings.calendar?.defaultDurationMinutes || 60) * 60 * 1000);

    const format = (value) => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

    const title = encodeURIComponent(appointment.title || settings.defaultTitle || settings.botName || 'Appointment');
    const details = encodeURIComponent(`Created by ${settings.aiBrand || settings.botName || 'Mickey AI'} Calendar`);

    return `${settings.calendar?.googleCalendarUrlBase || 'https://calendar.google.com/calendar/render?action=TEMPLATE'}&text=${title}&dates=${format(start)}/${format(end)}&details=${details}&ctz=${encodeURIComponent(tz)}`;
}

module.exports = {
    AIRich,
    createCalendarUrl,
    getContext,
    normalizeArgs,
};
