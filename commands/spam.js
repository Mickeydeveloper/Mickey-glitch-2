const fs = require('fs-extra');
const path = require('path');
const settings = require('../settings');
const { AIRich } = require('../lib/messageBuilder');
const SPAM_FILE = path.join(__dirname, '..', 'spam.txt');

function onlyDigits(s = '') { 
    return String(s).replace(/\D/g, ''); 
}

function getOwners() {
    const raw = settings.ownerNumber;
    const owners = Array.isArray(raw) ? raw : String(raw).split ? String(raw).split(',') : [raw];
    return owners.map(o => onlyDigits(o));
}

module.exports = async function(sock, chatId, message, q) {
    try {
        const sender = onlyDigits(message.key?.participant || message.key?.remoteJid || '');
        if (!getOwners().includes(sender) && !message.key?.fromMe) {
            const builder = AIRich.error(sock, settings.botName, 'Owner only.', 'Spam command');
            return await builder.send(chatId, { quoted: message });
        }

        if (!fs.existsSync(SPAM_FILE)) {
            const builder = AIRich.warning(sock, settings.botName, 'spam.txt not found! Create it first.', 'Spam command');
            return await builder.send(chatId, { quoted: message });
        }

        const spamText = fs.readFileSync(SPAM_FILE, 'utf8').trim();
        if (!spamText) {
            const builder = AIRich.warning(sock, settings.botName, 'spam.txt is empty!', 'Spam command');
            return await builder.send(chatId, { quoted: message });
        }

        let count = 50;
        if (q && !isNaN(parseInt(q))) count = Math.min(parseInt(q), 100);

        const startBuilder = AIRich.createBotCard(sock, {
            title: settings.botName,
            body: 'Shadow spam session',
            footer: 'Ultra speed mode',
            items: [
                { label: 'File', value: 'spam.txt' },
                { label: 'Count', value: String(count) },
                { label: 'Status', value: 'Starting' },
            ],
        });
        await startBuilder.send(chatId, { quoted: message });

        let sent = 0;
        for (let i = 0; i < count; i++) {
            try { 
                await sock.sendMessage(chatId, { text: `${spamText}\n\n🔥 ${i+1}/${count}` });
                sent++;
            } catch(e) {}
            if (i % 5 === 0) await new Promise(r => setTimeout(r, 50));
        }

        const done = AIRich.success(sock, settings.botName, 'Spamming completed', 'Spam command');
        done.addList([
            { label: 'Sent', value: `${sent}/${count}` },
            { label: 'Speed', value: 'Ultra fast' },
            { label: 'Status', value: 'Completed' },
        ]);
        await done.send(chatId, { quoted: message });
    } catch(err) { 
        const builder = AIRich.error(sock, settings.botName, `Error: ${err.message || String(err)}`, 'Spam command');
        await builder.send(chatId, { quoted: message });
    }
};
