const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');

const messageStore = new Map();
const CONFIG_PATH = path.join(__dirname, '../data/antidelete.json');
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');

const toBold = (text) => {
    const boldChars = {
        'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
        'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
        '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
    };
    return text.split('').map(c => boldChars[c] || c).join('');
};

// Ensure tmp dir exists
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// Function to get folder size in MB
const getFolderSizeInMB = (folderPath) => {
    try {
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) {
                totalSize += fs.statSync(filePath).size;
            }
        }
        return totalSize / (1024 * 1024);
    } catch (err) {
        return 0;
    }
};

// Function to clean temp folder if size exceeds 100MB
const cleanTempFolderIfLarge = () => {
    try {
        if (getFolderSizeInMB(TEMP_MEDIA_DIR) > 100) {
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) {
                fs.unlinkSync(path.join(TEMP_MEDIA_DIR, file));
            }
        }
    } catch (err) {}
};

setInterval(cleanTempFolderIfLarge, 60 * 1000);

function loadAntideleteConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return { enabled: false };
        return JSON.parse(fs.readFileSync(CONFIG_PATH));
    } catch {
        return { enabled: false };
    }
}

function saveAntideleteConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (err) {}
}

async function handleAntideleteCommand(sock, chatId, message, isAdmin, botData, saveBotData, userId, args) {
    const config = loadAntideleteConfig();
    const match = args[0]?.toLowerCase();

    if (!match) {
        return sock.sendMessage(chatId, {
            text: `╭━━━〔 ${toBold("ANTI-DELETE SETUP")} 〕━━━┈⊷\n` +
                   `┃ ⋄ ${toBold("Status:")} ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                   `┃\n` +
                   `┃ ⋄ ${toBold(".antidelete on")} - Enable\n` +
                   `┃ ⋄ ${toBold(".antidelete off")} - Disable\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷`
        }, {quoted: message});
    }

    if (match === 'on') {
        config.enabled = true;
    } else if (match === 'off') {
        config.enabled = false;
    } else {
        return sock.sendMessage(chatId, { text: '*Invalid command. Use .antidelete to see usage.*' }, {quoted:message});
    }

    saveAntideleteConfig(config);
    return sock.sendMessage(chatId, { text: `*Antidelete ${match === 'on' ? 'enabled' : 'disabled'}*` }, {quoted:message});
}

async function storeMessage(message) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled || !message.key?.id) return;

        const messageId = message.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';
        const sender = message.key.participant || message.key.remoteJid;

        const msg = message.message?.ephemeralMessage?.message || 
                    message.message?.viewOnceMessage?.message || 
                    message.message?.viewOnceMessageV2?.message || 
                    message.message;

        if (!msg) return;

        if (msg.conversation) {
            content = msg.conversation;
        } else if (msg.extendedTextMessage?.text) {
            content = msg.extendedTextMessage.text;
        } else if (msg.imageMessage) {
            mediaType = 'image';
            content = msg.imageMessage.caption || '';
            const buffer = await downloadContentFromMessage(msg.imageMessage, 'image');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
            await writeFile(mediaPath, buffer);
        } else if (msg.stickerMessage) {
            mediaType = 'sticker';
            const buffer = await downloadContentFromMessage(msg.stickerMessage, 'sticker');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
            await writeFile(mediaPath, buffer);
        } else if (msg.videoMessage) {
            mediaType = 'video';
            content = msg.videoMessage.caption || '';
            const buffer = await downloadContentFromMessage(msg.videoMessage, 'video');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            await writeFile(mediaPath, buffer);
        } else if (msg.audioMessage) {
            mediaType = 'audio';
            const buffer = await downloadContentFromMessage(msg.audioMessage, 'audio');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp3`);
            await writeFile(mediaPath, buffer);
        }

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
            timestamp: new Date().toISOString()
        });
    } catch (err) {}
}

async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return;

        const messageId = revocationMessage.message.protocolMessage.key.id;
        const deletedBy = revocationMessage.participant || revocationMessage.key.participant || revocationMessage.key.remoteJid;
        const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        if (deletedBy.includes(sock.user.id) || deletedBy === ownerNumber) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const sender = original.sender;
        const senderName = sender.split('@')[0];
        
        let report = `╭━━━〔 ${toBold("ANTI-DELETE REPORT")} 〕━━━┈⊷\n` +
                     `┃ 👤 ${toBold("Sender:")} @${senderName}\n` +
                     `┃ 🗑️ ${toBold("Deleted By:")} @${deletedBy.split('@')[0]}\n` +
                     `┃ 🕒 ${toBold("Time:")} ${new Date().toLocaleTimeString()}\n` +
                     `┃ 📂 ${toBold("Type:")} ${original.mediaType || 'Text'}\n` +
                     `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n`;

        if (original.content) {
            report += `📝 ${toBold("Message Content:")}\n${original.content}`;
        }

        await sock.sendMessage(ownerNumber, { text: report, mentions: [deletedBy, sender] });

        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaOptions = { caption: `*Deleted ${original.mediaType}* from @${senderName}`, mentions: [sender] };
            if (original.mediaType === 'image') await sock.sendMessage(ownerNumber, { image: { url: original.mediaPath }, ...mediaOptions });
            else if (original.mediaType === 'sticker') await sock.sendMessage(ownerNumber, { sticker: { url: original.mediaPath }, ...mediaOptions });
            else if (original.mediaType === 'video') await sock.sendMessage(ownerNumber, { video: { url: original.mediaPath }, ...mediaOptions });
            else if (original.mediaType === 'audio') await sock.sendMessage(ownerNumber, { audio: { url: original.mediaPath }, mimetype: 'audio/mp4', ...mediaOptions });
            
            // Delete file after sending
            setTimeout(() => {
                try { if (fs.existsSync(original.mediaPath)) fs.unlinkSync(original.mediaPath); } catch (err) {}
            }, 5000);
        }
        messageStore.delete(messageId);
    } catch (err) {}
}

// Store for snipe functionality
const snipedMessages = new Map();

function handleSnipe(message) {
    try {
        const from = message.key.remoteJid;
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '[Media/Message]';
        const sender = message.key.participant || message.key.remoteJid;
        
        if (!snipedMessages.has(from)) snipedMessages.set(from, []);
        snipedMessages.get(from).unshift({ text, sender, time: Date.now() });
        if (snipedMessages.get(from).length > 10) snipedMessages.get(from).pop();
    } catch (e) {}
}

module.exports = handleAntideleteCommand;
module.exports.storeMessage = storeMessage;
module.exports.handleMessageRevocation = handleMessageRevocation;
module.exports.handleSnipe = handleSnipe;
