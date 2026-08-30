module.exports = {
    startimage: 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/menu.png',
    ownerNumber: process.env.OWNER_NUMBER || '255615944741',
    botName: 'MICKEY GLITCH 2',
    ownerName: 'MICKEY',
    whatsappChannel: 'https://whatsapp.com/channel/0029VaGiJKfIiRoybPBMTy38',
    tgOwnerId: process.env.OWNER_TELEGRAM_ID || '8488081516',
    premiumUsers: [],
    connectedBots: [],
    version: '3.0.0',
    prefix: '.',
    timezone: 'Africa/Dar_es_Salaam',
    locale: 'en-GB',
    defaultTitle: 'Mickey AI Appointment',
    aiBrand: 'Mickey AI',
    appBrand: 'MICKEY GLITCH 2',
    brandColor: '#2ECC71',
    calendar: {
        defaultTime: '10:00 AM',
        defaultDurationMinutes: 60,
        googleCalendarUrlBase: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
        timezone: 'Africa/Dar_es_Salaam',
        label: 'East Africa Time'
    },
    getBotIdentity() {
        return {
            name: this.botName || this.appBrand || 'MICKEY GLITCH 2',
            prefix: this.prefix || '.',
            owner: this.ownerName || 'MICKEY',
            ownerNumber: this.ownerNumber,
            timezone: this.timezone || 'Africa/Dar_es_Salaam',
            version: this.version || '3.0.0',
        };
    }
};
