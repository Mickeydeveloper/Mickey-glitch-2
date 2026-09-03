require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs-extra');
const path = require('path');
const { randomBytes } = require('crypto');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadContentFromMessage, jidNormalizedUser, Browsers, delay } = require('@whiskeysockets/baileys');
const P = require('pino');
const { OpenAI } = require('openai');
const os = require('os');
const { isSudo } = require('./lib');

function loadCommandRegistry() {
    const registry = {};
    const commandsDir = path.join(__dirname, 'commands');
    const ignoredFiles = new Set([
        'a2uitest', 'antibadword', 'antidelete', 'antisticker', 'buy', 'coin', 'donate',
        'emojimix', 'getpp', 'imagine', 'instagram', 'pair', 'status',
        'telebot', 'unpair', 'uploadstatus', 'url', 'sudo'
    ]);

    if (!fs.existsSync(commandsDir)) return registry;

    for (const entry of fs.readdirSync(commandsDir)) {
        if (entry === 'lib' || entry === 'Mickey' || entry.startsWith('.')) continue;
        const fullPath = path.join(commandsDir, entry);
        if (!fs.statSync(fullPath).isFile() || !entry.endsWith('.js')) continue;

        const commandName = path.basename(entry, '.js');
        if (ignoredFiles.has(commandName)) continue;

        try {
            const mod = require(fullPath);
            const exportedFunctions = Object.entries(mod || {}).filter(([, value]) => typeof value === 'function');

            let handler = null;

            if (typeof mod === 'function') {
                const modName = (mod.name || '').toLowerCase();
                if (modName.includes(commandName.toLowerCase()) || modName.includes('command') || modName.includes('handler')) {
                    handler = mod;
                }
            }

            if (!handler) {
                const preferred = exportedFunctions.find(([key]) => {
                    const lowerKey = key.toLowerCase();
                    return lowerKey.includes(commandName.toLowerCase()) || lowerKey.includes('command') || lowerKey.includes('handler');
                });

                handler = preferred ? preferred[1] : (exportedFunctions[0] ? exportedFunctions[0][1] : null);
            }

            if (handler) {
                registry[commandName] = handler;
            }

            if (mod && typeof mod === 'object') {
                for (const [key, value] of Object.entries(mod)) {
                    if (typeof value === 'function' && !['default', 'handler', 'command'].includes(key)) {
                        registry[key] = value;
                    }
                }
            }
        } catch (error) {
            const message = error && error.message ? error.message : String(error);
            const isLegacyMissingModule = /Cannot find module|Invalid or unexpected token|require is not defined in ES module scope|is not a function|Unexpected token/i.test(message);
            if (!isLegacyMissingModule) {
                console.warn(`[Command Loader] Failed to load ${entry}:`, message);
            }
        }
    }

    registry.get = (sock, from, msg) => sock.sendMessage(from, { text: "❌ The 'get' command is not implemented yet." }, { quoted: msg });
    return registry;
}

const commands = loadCommandRegistry();

const { invokeCommand: invokeCompatibleCommand } = require('./lib/commandInvoker');

async function invokeCommand(commandHandler, sock, from, msg, isAdmin, q, session, args, botData, saveBotData, userId) {
    return invokeCompatibleCommand(commandHandler, sock, from, msg, isAdmin, q, session, args, botData, saveBotData, userId);
}

const { handleAutoread } = require('./commands/autoread');
const { handleStatusUpdate } = require('./commands/autostatus');

const app = express();
const server = http.createServer(app);

// Telegram Bot Setup
const tgToken = process.env.TELEGRAM_BOT_TOKEN;
if (!tgToken) {
    console.error('TELEGRAM_BOT_TOKEN not set in environment variables!');
}

const tgBot = tgToken ? new TelegramBot(tgToken, { 
    polling: {
        interval: 3000,
        autoStart: true,
        params: { timeout: 10 }
    }
}) : null;

if (tgBot) {
    tgBot.on('polling_error', (error) => {
        console.log('Telegram polling error:', error.message);
        if (error.message && (error.message.includes('409') || error.message.includes('Conflict'))) {
            console.log('Another instance detected. Stopping this instance...');
            tgBot.stopPolling();
        }
        if (error.message && error.message.includes('401')) {
            console.log('Telegram Token is invalid (401 Unauthorized).');
            tgBot.stopPolling();
        }
    });
}

// Import settings
const settings = require('./settings');
const botBrandName = settings.botName || settings.appBrand || 'MICKEY GLITCH 2';
const botOwnerName = settings.ownerName || 'MICKEY';
const botOwnerNumber = settings.ownerNumber || '255615944741';
const botVersion = settings.version || '3.0.0';
const botNewsletterJid = settings.newsletterJid || '120363398106360290@newsletter';
const botNewsletterName = settings.newsletterName || botBrandName;

function addBotMessageContext(content) {
    if (!content || typeof content !== 'object' || Array.isArray(content)) return content;
    if (content.react || content.delete || content.protocolMessage) return content;

    return {
        ...content,
        messageContextInfo: {
            ...(content.messageContextInfo || {}),
            messageSecret: randomBytes(32),
            supportPayload: JSON.stringify({
                version: 1,
                is_ai_message: true,
                should_show_system_message: true,
                ticket_id: '1669945700536053'
            })
        }
    };
}

function addBotRelayNodes(options = {}) {
    const nodes = Array.isArray(options.additionalNodes) ? [...options.additionalNodes] : [];
    const hasNode = (tag) => nodes.some((node) => node?.tag === tag);
    if (!hasNode('bot')) nodes.push({ attrs: { biz_bot: '1' }, tag: 'bot' });
    if (!hasNode('biz')) nodes.push({ attrs: {}, tag: 'biz' });
    return { ...options, additionalNodes: nodes };
}

// Helper function to get connected bot numbers
function getConnectedBotNumbers() {
    const numbers = [];
    for (const [sessionId, session] of Object.entries(sessions)) {
        if (session.sock && session.sock.user) {
            const num = jidNormalizedUser(session.sock.user.id).split('@')[0];
            numbers.push(num);
        }
    }
    return numbers;
}

// Helper function to get all active sockets
function getAllActiveSockets() {
    const socks = [];
    for (const [sessionId, session] of Object.entries(sessions)) {
        if (session.sock && session.isConnected) {
            socks.push({ sock: session.sock, sessionId, phoneNumber: session.phoneNumber });
        }
    }
    return socks;
}

// Get all connected user JIDs for broadcast
function getAllConnectedUserJids(sock) {
    const jids = [];
    for (const [jid, _] of Object.entries(sock.chats || {})) {
        if (typeof jid === 'string' && (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us'))) {
            jids.push(jid);
        }
    }
    return jids;
}

// Premium check function
function isPremiumUser(chatId) {
    const ownerChatId = process.env.OWNER_TELEGRAM_ID || settings.tgOwnerId;
    if (chatId.toString() === ownerChatId) return true;
    if (settings.premiumUsers && settings.premiumUsers.includes(chatId.toString())) return true;
    return false;
}

// Owner check for Telegram
function isTgOwner(chatId) {
    const ownerChatId = process.env.OWNER_TELEGRAM_ID || settings.tgOwnerId;
    return chatId.toString() === ownerChatId;
}

// =================== TELEGRAM BOT (ONLY PAIRING + PREMIUM + OWNER-ONLY STATUS) ===================
if (tgBot) {
    tgBot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const isOwner = isTgOwner(chatId);

        const welcomeMessage = 
            `\u{25EC}\u{2501}\u{2501}\u{2501}\u{3008} *${botBrandName}* \u{3009}\u{2501}\u{2501}\u{2501}\u{25EC}\n\n` +
            `*\u{1F311} Mickey Glitch Pair Function* \u{1F311}\n\n` +
            `Welcome to the most premium WhatsApp bot experience.\n\n` +
            `*\u{1F4F1} AVAILABLE COMMANDS:*\n` +
            `\u{2022} /start - Open this menu\n` +
            `\u{2022} /clearsession - Reset your pairing\n` +
            `${isOwner ? `\u{2022} /status - Bot overall status\n` : ''}` +
            `${isOwner ? `\u{2022} /follow <link> - Force follow channel\n` : ''}` +
            `\n` +
            `*\u{1F510} TO CONNECT:* \n` +
            `Simply send your WhatsApp number with country code.\n` +
            `Example: \`255615944741\`\n\n` +
            `> © POWERED BY ${botBrandName} v${botVersion}`;

        try {
            await tgBot.sendPhoto(chatId, settings.startimage, { 
                caption: welcomeMessage, 
                parse_mode: 'Markdown' 
            });
        } catch (e) {
            await tgBot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
        }
    });

    // Clear Session Command
    tgBot.onText(/\/clearsession/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = `tg_${chatId}`;

        if (sessions[userId]) {
            if (sessions[userId].sock) {
                try { await sessions[userId].sock.logout(); } catch(e) {}
            }
            const authPath = sessions[userId].authPath;
            if (fs.existsSync(authPath)) {
                fs.removeSync(authPath);
            }
            delete sessions[userId];
            await tgBot.sendMessage(chatId, `\u{1F5D1}\u{FE0F} *Session cleared!* You can now pair a new number.`, { parse_mode: 'Markdown' });
        } else {
            await tgBot.sendMessage(chatId, `\u{26A0}\u{FE0F} No active session found to clear.`, { parse_mode: 'Markdown' });
        }
    });

    // Follow Command - OWNER ONLY
    tgBot.onText(/\/follow (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        if (!isTgOwner(chatId)) return;

        const channelLink = match[1].trim();
        const activeSocks = getAllActiveSockets();

        await tgBot.sendMessage(chatId, `\u{1F504} *Initiating Mass Follow...*\nTarget: ${channelLink}\nBots: ${activeSocks.length}`, { parse_mode: 'Markdown' });

        let success = 0;
        for (const { sock } of activeSocks) {
            try {
                const channelKey = channelLink.split('/channel/')[1] || channelLink.split('/').pop();
                const metadata = await sock.newsletterMetadata('invite', channelKey, 'GUEST');
                if (metadata && metadata.id) {
                    await sock.newsletterFollow(metadata.id);
                    success++;
                }
            } catch (e) {}
        }

        await tgBot.sendMessage(chatId, `\u{2705} *Mass Follow Complete!*\nSuccessfully followed: ${success}/${activeSocks.length}`, { parse_mode: 'Markdown' });
    });

    // Status command - OWNER ONLY
    tgBot.onText(/\/status/, async (msg) => {
        const chatId = msg.chat.id;

        if (!isTgOwner(chatId)) {
            return tgBot.sendMessage(chatId, "\u{274C} *Owner only command!*", { parse_mode: 'Markdown' });
        }

        const connectedCount = Object.values(sessions).filter(s => s.isConnected).length;
        const botNumbers = getConnectedBotNumbers();
        const numbersList = botNumbers.length > 0 ? botNumbers.join('\n') : 'None';

        const statusMsg = 
            `\u{25EC}\u{2501}\u{2501}\u{2501}\u{3008} *HASEEB MINI STATUS* \u{3009}\u{2501}\u{2501}\u{2501}\u{25EC}\n\n` +
            `\u{1F4F1} *Connected Bots:* ${connectedCount}\n` +
            `\u{26A1} *Total Sessions:* ${Object.keys(sessions).length}\n\n` +
            `\u{1F522} *Active Numbers:*\n\`${numbersList}\`\n\n` +
            `> © POWERED BY HASEEB MINI BOT v3.0`;

        await tgBot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
    });

    tgBot.onText(/\/addpremium (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        if (!isTgOwner(chatId)) {
            return tgBot.sendMessage(chatId, "\u{274C} *Owner only command!*", { parse_mode: 'Markdown' });
        }
        const targetId = match[1].trim();
        if (!settings.premiumUsers.includes(targetId)) {
            settings.premiumUsers.push(targetId);
            await tgBot.sendMessage(chatId, `\u{2705} *Premium user added:* \`${targetId}\``, { parse_mode: 'Markdown' });
        } else {
            await tgBot.sendMessage(chatId, `\u{26A0}\u{FE0F} User already premium: \`${targetId}\``, { parse_mode: 'Markdown' });
        }
    });

    tgBot.onText(/\/removepremium (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        if (!isTgOwner(chatId)) {
            return tgBot.sendMessage(chatId, "\u{274C} *Owner only command!*", { parse_mode: 'Markdown' });
        }
        const targetId = match[1].trim();
        const idx = settings.premiumUsers.indexOf(targetId);
        if (idx > -1) {
            settings.premiumUsers.splice(idx, 1);
            await tgBot.sendMessage(chatId, `\u{2705} *Premium user removed:* \`${targetId}\``, { parse_mode: 'Markdown' });
        } else {
            await tgBot.sendMessage(chatId, `\u{26A0}\u{FE0F} User not found in premium list: \`${targetId}\``, { parse_mode: 'Markdown' });
        }
    });

    tgBot.onText(/\/listpremium/, async (msg) => {
        const chatId = msg.chat.id;
        if (!isTgOwner(chatId)) {
            return tgBot.sendMessage(chatId, "\u{274C} *Owner only command!*", { parse_mode: 'Markdown' });
        }
        const list = settings.premiumUsers.length > 0 ? settings.premiumUsers.join('\n') : 'None';
        await tgBot.sendMessage(chatId, `\u{1F451} *Premium Users:*\n\n${list}`, { parse_mode: 'Markdown' });
    });

    // Pairing handler - when user sends a number
    tgBot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text || text.startsWith('/')) return;

        if (/^\d+$/.test(text)) {
            const userId = chatId.toString();
            if (!sessions[userId]) {
                sessions[userId] = new BotSession(userId);
            }

            if (!botData.statusSettings[userId]) {
                botData.statusSettings[userId] = { 
                    autoStatus: false,
                    autoSeen: false,
                    autoLike: false,
                    autoDownload: false,
                    isPublic: false
                };
                saveBotData();
            }

            const initMsg = 
                `\u{25EC}\u{2501}\u{2501}\u{2501}\u{3008} *HASEEB MINI PAIRING* \u{3009}\u{2501}\u{2501}\u{2501}\u{25EC}\n\n` +
                `*\u{1F504} REQUESTING CODE...*\n` +
                `Target Number: \`${text}\`\n\n` +
                `_Please wait a few seconds..._`;

            await tgBot.sendMessage(chatId, initMsg, { parse_mode: 'Markdown' });
            sessions[userId].tgChatId = chatId;
            await sessions[userId].initialize(text);
        }
    });
}


// =================== WEB DASHBOARD SOCKET.IO ===================
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

let openai = null;
if (process.env.OPENAI_API_KEY) {
    try {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1"
        });
    } catch (e) {}
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/api/server-info', (req, res) => {
    const forwardedProto = req.get('x-forwarded-proto');
    const protocol = (forwardedProto ? forwardedProto.split(',')[0] : req.protocol).trim();
    const host = req.get('host');

    res.json({
        name: botBrandName,
        protocol,
        host,
        url: `${protocol}://${host}`,
        port: PORT
    });
});

const AUTH_DIR = './auth_info';
const DATA_FILE = './data/bot_data.json';
fs.ensureDirSync(AUTH_DIR);
fs.ensureDirSync('./data');

let botData = { antilinkGroups: {}, totalBots: 0, registeredBots: [], statusSettings: {}, antiDelete: {}, userNames: {}, antiCall: {}, broadcastHistory: [] };
if (fs.existsSync(DATA_FILE)) {
    try { botData = fs.readJsonSync(DATA_FILE); } catch (e) {}
}

function saveBotData() {
    fs.writeJsonSync(DATA_FILE, botData);
}

const sessions = {}; 
const userSockets = {}; 
const messageLogs = {}; 

// Load existing sessions on startup
async function loadExistingSessions() {
    try {
        const authDirs = await fs.readdir(AUTH_DIR);
        for (const userId of authDirs) {
            const authPath = path.join(AUTH_DIR, userId);
            const stats = await fs.stat(authPath);
            if (stats.isDirectory()) {
                const credsFile = path.join(authPath, 'creds.json');
                if (fs.existsSync(credsFile)) {
                    console.log(`[System] Found existing session for: ${userId}. Initializing...`);
                    if (!sessions[userId]) {
                        sessions[userId] = new BotSession(userId);
                        sessions[userId].initialize().catch(err => {
                            console.error(`[System] Failed to auto-initialize session ${userId}:`, err.message);
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('[System] Error loading existing sessions:', err.message);
    }
}

// Bold font converter
const toBold = (text) => {
    const boldChars = {
        'a': '\u{1D5EE}', 'b': '\u{1D5EF}', 'c': '\u{1D5F0}', 'd': '\u{1D5F1}', 'e': '\u{1D5F2}', 'f': '\u{1D5F3}', 'g': '\u{1D5F4}', 'h': '\u{1D5F5}', 'i': '\u{1D5F6}', 'j': '\u{1D5F7}', 'k': '\u{1D5F8}', 'l': '\u{1D5F9}', 'm': '\u{1D5FA}', 'n': '\u{1D5FB}', 'o': '\u{1D5FC}', 'p': '\u{1D5FD}', 'q': '\u{1D5FE}', 'r': '\u{1D5FF}', 's': '\u{1D600}', 't': '\u{1D601}', 'u': '\u{1D602}', 'v': '\u{1D603}', 'w': '\u{1D604}', 'x': '\u{1D605}', 'y': '\u{1D606}', 'z': '\u{1D607}',
        'A': '\u{1D5D4}', 'B': '\u{1D5D5}', 'C': '\u{1D5D6}', 'D': '\u{1D5D7}', 'E': '\u{1D5D8}', 'F': '\u{1D5D9}', 'G': '\u{1D5DA}', 'H': '\u{1D5DB}', 'I': '\u{1D5DC}', 'J': '\u{1D5DD}', 'K': '\u{1D5DE}', 'L': '\u{1D5DF}', 'M': '\u{1D5E0}', 'N': '\u{1D5E1}', 'O': '\u{1D5E2}', 'P': '\u{1D5E3}', 'Q': '\u{1D5E4}', 'R': '\u{1D5E5}', 'S': '\u{1D5E6}', 'T': '\u{1D5E7}', 'U': '\u{1D5E8}', 'V': '\u{1D5E9}', 'W': '\u{1D5EA}', 'X': '\u{1D5EB}', 'Y': '\u{1D5EC}', 'Z': '\u{1D5ED}',
        '0': '\u{1D7EC}', '1': '\u{1D7ED}', '2': '\u{1D7EE}', '3': '\u{1D7EF}', '4': '\u{1D7F0}', '5': '\u{1D7F1}', '6': '\u{1D7F2}', '7': '\u{1D7F3}', '8': '\u{1D7F4}', '9': '\u{1D7F5}'
    };
    return text.split('').map(c => boldChars[c] || c).join('');
};

// Italic font converter
const toItalic = (text) => {
    const italicChars = {
        'a': '\u{1D608}', 'b': '\u{1D609}', 'c': '\u{1D60A}', 'd': '\u{1D60B}', 'e': '\u{1D60C}', 'f': '\u{1D60D}', 'g': '\u{1D60E}', 'h': '\u{1D60F}', 'i': '\u{1D610}', 'j': '\u{1D611}', 'k': '\u{1D612}', 'l': '\u{1D613}', 'm': '\u{1D614}', 'n': '\u{1D615}', 'o': '\u{1D616}', 'p': '\u{1D617}', 'q': '\u{1D618}', 'r': '\u{1D619}', 's': '\u{1D61A}', 't': '\u{1D61B}', 'u': '\u{1D61C}', 'v': '\u{1D61D}', 'w': '\u{1D61E}', 'x': '\u{1D61F}', 'y': '\u{1D620}', 'z': '\u{1D621}',
        'A': '\u{1D5CE}', 'B': '\u{1D5CF}', 'C': '\u{1D5D0}', 'D': '\u{1D5D1}', 'E': '\u{1D5D2}', 'F': '\u{1D5D3}'
    };
    return text.split('').map(c => italicChars[c] || c).join('');
};

class BotSession {
    constructor(userId) {
        this.userId = userId;
        this.sock = null;
        this.isConnected = false;
        this.aiEnabled = false; 
        this.autoReact = botData.statusSettings[userId]?.autoReact || false;
        this.isPublic = botData.statusSettings[userId]?.isPublic !== undefined ? botData.statusSettings[userId].isPublic : true; 
        this.authPath = path.join(AUTH_DIR, userId);
        this.processedMessages = new Set();
        this.activeInterval = null;
        this.isInitializing = false;
        this.reconnectTimer = null;
        this.connectionGeneration = 0;
        this.userChats = {}; 
        this.lastConnectMessageTime = null;
        this.phoneNumber = null;
        this.ghostMode = false;
    }

    sendLog(message, type = 'info') {
        const logEntry = { timestamp: new Date().toLocaleTimeString(), message, type };
        const socketId = userSockets[this.userId];
        if (socketId) io.to(socketId).emit('console', logEntry);
        console.log(`[${this.userId}] ${message}`);
    }

    sendConnectionStatus() {
        const socketId = userSockets[this.userId];
        if (socketId) {
            io.to(socketId).emit('connection-status', {
                connected: this.isConnected,
                user: this.userId
            });
        }
        io.emit('total-active', Object.values(sessions).filter(s => s.isConnected).length);
    }

    async getAIResponse(userJid, userMessage, systemPrompt = "Helpful assistant.") {
        try {
            // Using a more reliable AI API endpoint
            const apiUrl = `https://api.siputzx.my.id/api/ai/chatgpt?prompt=${encodeURIComponent(systemPrompt)}&text=${encodeURIComponent(userMessage)}`;
            const response = await axios.get(apiUrl);

            if (response.data && response.data.status) {
                return response.data.data;
            } else {
                // Fallback to another API if the first one fails
                const fallbackUrl = `https://widipe.com/openai?text=${encodeURIComponent(userMessage)}`;
                const fallbackRes = await axios.get(fallbackUrl);
                if (fallbackRes.data && fallbackRes.data.result) {
                    return fallbackRes.data.result;
                }
                throw new Error("Invalid API response from all sources");
            }
        } catch (error) {
            return "\u{274C} AI Error: " + error.message;
        }
    }

    startActiveCheck() {
        if (this.activeInterval) clearInterval(this.activeInterval);
        this.activeInterval = setInterval(async () => {
            if (this.isConnected && this.sock?.user) {
                try {
                    const botNumber = jidNormalizedUser(this.sock.user.id);
                    await this.sock.sendMessage(botNumber, { 
                        text: "HASEEB \u{1D5D4}\u{1D5E5}\u{1D5D8}-\u{1D5D3}\u{1D5E6}\u{1D601} \u{1D5F1}\u{1D600} \u{1D603}\u{1D608}\u{1D5F1}\u{1D5F1}\u{1D5F2}\u{1D5F7}\u{1D5F2} \u{1F680}\n\n_24/7 Active System Working..._" 
                    });
                    this.sendLog("24/7 Keep-alive message sent to own DM. \u{2705}", "success");
                } catch (e) {
                    this.sendLog("Keep-alive failed: " + e.message, "error");
                }
            }
        }, 60 * 60 * 1000);
    }

    async initialize(pairingNumber = null) {
        if (this.isInitializing) {
            this.sendLog("Initialization already in progress...", "info");
            return;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        const generation = ++this.connectionGeneration;
        const previousSocket = this.sock;
        if (previousSocket && typeof previousSocket.end === 'function') {
            try { previousSocket.end(new Error('Replacing stale connection')); } catch (_) {}
        }
        this.sock = null;
        this.isInitializing = true;
        try {
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState(this.authPath);

            this.sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' })),
                },
                printQRInTerminal: false,
                logger: P({ level: 'fatal' }),
                browser: Browsers.ubuntu('Chrome'),
                syncFullHistory: false,
                shouldSyncHistoryMessage: () => false,
                markOnlineOnConnect: true,
                keepSyedveIntervalMs: 30000,
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                emitOwnEvents: true,
                retryRequestDelayMs: 5000,
                maxMsgRetryCount: 5,
                linkPreviewImageThumbnailWidth: 192,
                transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
                getMessage: async (key) => {
                    if (messageLogs[key.id]) {
                        return { conversation: messageLogs[key.id].text };
                    }
                    return { conversation: 'Bot is active' };
                },
                patchMessageBeforeSending: (message) => {
                    const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
                    if (requiresPatch) {
                        return {
                            viewOnceMessage: {
                                message: {
                                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                    ...message
                                }
                            }
                        };
                    }
                    return message;
                },
                generateHighQualityLinkPreview: true,
            });

            // Ignore events from a socket replaced by a newer connection attempt.
            const activeSocket = this.sock;

            // =================== JID & QUOTED FIXER WRAPPER ===================
            // Inafix JID pamoja na TypeError: Cannot read properties of undefined (reading 'fromMe')
            if (this.sock && this.sock.sendMessage) {
                const rawSendMessage = this.sock.sendMessage.bind(this.sock);
                const rawRelayMessage = typeof this.sock.relayMessage === 'function'
                    ? this.sock.relayMessage.bind(this.sock)
                    : null;
                this.sock.sendMessage = async (jid, content, options = {}) => {
                    // 1. Safe JID Check
                    let safeJid = jid;
                    if (typeof jid === 'object' && jid !== null) {
                        safeJid = jid.chatId || jid.from || jid.remoteJid || jid.key?.remoteJid || '';
                    }
                    safeJid = String(safeJid || '').trim();
                    if (!safeJid) {
                        console.error('⚠️ [JID Guard] Invalid JID passed to sendMessage:', jid);
                        return;
                    }

                    // 2. Safe Quoted Message Check (Fixes 'fromMe' error)
                    let safeOptions = { ...options };
                    if (safeOptions.quoted) {
                        if (!safeOptions.quoted.key) {
                            safeOptions.quoted.key = {
                                remoteJid: safeJid,
                                fromMe: false,
                                id: 'DUMMY_KEY_' + Date.now()
                            };
                        } else if (typeof safeOptions.quoted.key.fromMe === 'undefined') {
                            safeOptions.quoted.key.fromMe = false;
                        }
                    }

                    return await rawSendMessage(safeJid, addBotMessageContext(content), safeOptions);
                };

                if (rawRelayMessage) {
                    this.sock.relayMessage = async (jid, content, options = {}) => {
                        const safeJid = String(jid || '').trim();
                        if (!safeJid) {
                            console.error('⚠️ [JID Guard] Invalid JID passed to relayMessage:', jid);
                            return;
                        }

                        return await rawRelayMessage(
                            safeJid,
                            addBotMessageContext(content),
                            addBotRelayNodes(options)
                        );
                    };
                }
            }

            if (pairingNumber && !state.creds.registered) {
                if (!this.sock.authState.creds.registered) {
                    await delay(3000);
                    try {
                        let code = await this.sock.requestPairingCode(pairingNumber);
                        code = code?.match(/.{1,4}/g)?.join("-") || code;
                        this.sendLog(`\u{1F511} Pairing Code: ${code}`, 'success');

                        if (this.tgChatId && tgBot) {
                            const codeMsg = 
                                `\u{25EC}\u{2501}\u{2501}\u{2501}\u{3008} *MICKEY GLITCH* \u{3009}\u{2501}\u{2501}\u{2501}\u{25EC}\n\n` +
                                `*\u{1F511} YOUR PAIRING CODE:* \`${code}\`\n\n` +
                                `_Enter this code in your WhatsApp Linked Devices section._\n\n` +
                                `> © MICKEY GLITCH BOT `;
                            await tgBot.sendMessage(this.tgChatId, codeMsg, { parse_mode: 'Markdown' });
                        }

                        const socketId = userSockets[this.userId];
                        if (socketId) io.to(socketId).emit('pairing-code', code);
                    } catch (err) {
                        this.sendLog(`\u{274C} Pairing error: ${err.message}`, 'error');
                        if (this.tgChatId && tgBot) {
                            await tgBot.sendMessage(this.tgChatId, "\u{274C} Pairing Error: " + err.message);
                        }
                    }
                }
            }

            this.sock.ev.on('creds.update', saveCreds);

            this.sock.ev.on('call', async (calls) => {
                if (botData.antiCall[this.userId]) {
                    for (const call of calls) {
                        if (call.status === 'offer') {
                            try {
                                // Properly reject call
                                await this.sock.rejectCall(call.id, call.from);

                                // Send professional rejection message
                                await this.sock.sendMessage(call.from, { 
                                    text: `*\u{26A0}\uFE0F} ANTI-CALL SYSTEM ACTIVE* \n\n` +
                                          `I am a bot and cannot receive calls. \n` +
                                          `Please send a text message instead. \n\n` +
                                          `> © POWERED BY ${botBrandName} v${botVersion}`
                                });
                            } catch (e) {}
                        }
                    }
                }
            });

            this.sock.ev.on('messages.upsert', async (m) => {
                if (generation !== this.connectionGeneration || this.sock !== activeSocket) return;
                if (m.type !== 'notify') return;

                await Promise.all(m.messages.map(async (msg) => {
                    if (msg.messageStubType === 1 || msg.messageStubType === 2) {
                        this.sendLog('Received an undecryptable message. This might be due to a session conflict.', 'warning');
                    }

                    try {
                        const from = String(msg.key.remoteJid || '');
                        const isMe = msg.key.fromMe;
                        const isGroup = from.endsWith('@g.us');
                        const isStatus = from === 'status@broadcast';

                        if (msg.messageStubType === 1 || msg.messageStubType === 2) {
                            this.sendLog('Received an undecryptable message. This is usually a stale session/auth conflict; ignoring it.', 'warning');
                            return;
                        }

                        const messageContent = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message;
                        if (!messageContent) return;

                        let type = Object.keys(messageContent)[0];
                        const text = (messageContent.conversation || messageContent.extendedTextMessage?.text || messageContent.imageMessage?.caption || messageContent.videoMessage?.caption || '').trim();

                        // Antidelete feature has been disabled.
                        if (!isMe && !isStatus) {
                            await handleAutoread(this.sock, msg);
                        }

                        const msgId = msg.key.id;
                        if (this.processedMessages.has(msgId)) return;
                        this.processedMessages.add(msgId);
                        if (this.processedMessages.size > 1000) this.processedMessages.delete(this.processedMessages.values().next().value);

                        if (!isStatus) {
                            let logEntry = { text, type };
                            if (['imageMessage', 'videoMessage', 'audioMessage'].includes(type)) {
                                try {
                                    const mContent = messageContent[type];
                                    if (mContent && (mContent.directPath || mContent.url)) {
                                        const stream = await downloadContentFromMessage(mContent, type.replace('Message', ''));
                                        let buffer = Buffer.from([]);
                                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                                        logEntry.buffer = buffer;
                                    }
                                } catch (e) {}
                            }
                            logEntry.pushName = msg.pushName || 'User';
                            messageLogs[msgId] = logEntry;
                            if (Object.keys(messageLogs).length > 2000) delete messageLogs[Object.keys(messageLogs)[0]];
                        }

                        // Auto-react
                        if (this.autoReact && !isMe && !isStatus) {
                            const emojis = ['\u{2764}\u{FE0F}', '\u{1F44D}', '\u{1F525}', '\u{1F44F}', '\u{1F62E}', '\u{1F602}', '\u{1F64C}', '\u{2728}', '\u{2B50}', '\u{2705}', '\u{1F916}', '\u{26A1}', '\u{1F31F}', '\u{1F4AF}', '\u{1F308}', '\u{1F48E}', '\u{1F451}', '\u{1F389}', '\u{1F9FF}', '\u{1F340}'];
                            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                            try { await this.sock.sendMessage(from, { react: { text: randomEmoji, key: msg.key } }); } catch (e) {}
                        }

                        // AI auto-reply
                        if (this.aiEnabled && !isMe && !isGroup && text && !text.startsWith('.')) {
                            try {
                                const aiResponse = await this.getAIResponse(from, text);
                                await this.sock.sendMessage(from, { text: aiResponse }, { quoted: msg });
                            } catch (e) {
                                console.error("AI Auto-Reply Error:", e);
                            }
                        }

                        // Status handling
                        if (isStatus && !isMe) {
                            await handleStatusUpdate(this.sock, m, botData, this.userId);
                            return;
                        }

                        // =================== AUTHORIZATION FIX ===================
                        const botNumber = jidNormalizedUser(this.sock.user.id);
                        const botNumberClean = botNumber.split('@')[0];

                        const sender = String(msg.key.participant || from);
                        const senderClean = sender.split('@')[0];
                        const normalizeNumber = (value) => String(value || '').replace(/\D/g, '');
                        const senderNumber = normalizeNumber(senderClean);
                        const botNumberNumber = normalizeNumber(botNumberClean);
                        const ownerNumbers = String(settings.ownerNumber || '')
                            .split(',')
                            .map(normalizeNumber)
                            .filter(Boolean);

                        const isOwner = isMe || ownerNumbers.includes(senderNumber) || senderNumber === botNumberNumber;
                        const isSudoUser = await isSudo(sender).catch(() => false);

                        const isSessionUser = senderNumber === normalizeNumber(this.phoneNumber || '') || senderNumber === normalizeNumber(this.userId || '') || senderNumber === botNumberNumber;

                        const isAuthorized = this.isPublic || isOwner || isSudoUser || isSessionUser || isMe;

                        if (!this.isPublic && isGroup) {
                            return;
                        }

                        let isAdmin = isOwner;
                        if (!isAdmin && isGroup) {
                            try {
                                const groupMetadata = await this.sock.groupMetadata(from);
                                const participant = groupMetadata.participants.find(p => p.id === sender);
                                isAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
                            } catch (e) {
                                isAdmin = false;
                            }
                        }

                        // Anti-status in groups
                        if (isGroup && botData.antiStatusGroups && botData.antiStatusGroups[from] && !isAdmin) {
                            const isStatusMsg = msg.message?.protocolMessage?.type === 0 || 
                                           msg.message?.viewOnceMessage || 
                                           msg.message?.viewOnceMessageV2 ||
                                           msg.message?.viewOnceMessageV2Extension ||
                                           (text && (text.includes('whatsapp.com/channel/') || text.includes('status@broadcast')));

                            if (msg.message?.forwardingScore > 0 || isStatusMsg) {
                                try {
                                    await this.sock.sendMessage(from, { delete: msg.key });
                                    return;
                                } catch (e) {}
                            }
                        }

                        // Antilink
                        if (isGroup && botData.antilinkGroups[from] && !isAdmin) {
                            const linkPatterns = [/chat.whatsapp.com\//i, /http:\/\//i, /https:\/\//i, /www\./i, /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i];
                            if (linkPatterns.some(pattern => pattern.test(text))) {
                                try {
                                    const mode = botData.antilinkGroups[from];
                                    await this.sock.sendMessage(from, { delete: msg.key });
                                    if (mode === 'kick') await this.sock.groupParticipantsUpdate(from, [sender], "remove");
                                } catch (e) {}
                                return;
                            }
                        }

                        // Ghost mode
                        if (this.ghostMode && !isOwner && !isSessionUser) {
                            return;
                        }

                        const commandNameForGuard = text.startsWith('.') ? text.toLowerCase().slice(1).split(' ')[0] : '';
                        const isModeCommand = ['mode', 'private', 'public'].includes(commandNameForGuard);
                        const isMenuCommand = commandNameForGuard === 'menu';
                        const canUseModeCommand = isOwner || isSudoUser || isMe;

                        if (!this.isPublic && !isAuthorized && !(isModeCommand && canUseModeCommand) && !isMenuCommand) {
                            return;
                        }

                        // Command processing
                        if (text.startsWith('.')) {
                            const cmd = text.toLowerCase();
                            const args = text.split(' ').slice(1);
                            const q = args.join(' ');
                            const commandName = cmd.slice(1).split(' ')[0];

                            if (['mode', 'private', 'public'].includes(commandName)) {
                                const allowed = isOwner || isSudoUser || isMe;
                                if (!allowed) {
                                    await this.sock.sendMessage(from, {
                                        text: '❌ Only owner or sudo can change bot mode.'
                                    }, { quoted: msg });
                                    return;
                                }

                                if (commandName === 'private') {
                                    const shouldEnablePrivate = !args.length || ['on', 'enable', 'true', '1', 'yes'].includes((args[0] || '').toLowerCase());
                                    this.isPublic = !shouldEnablePrivate;
                                    if (!botData.statusSettings[this.userId]) {
                                        botData.statusSettings[this.userId] = { autoStatus: false, autoSeen: false, autoLike: false, autoDownload: false, isPublic: true };
                                    }
                                    botData.statusSettings[this.userId].isPublic = this.isPublic;
                                    saveBotData();

                                    const response = shouldEnablePrivate
                                        ? '✅ Private mode ON. Bot will only answer in private chats and only to owner/sudo.'
                                        : '✅ Private mode OFF. Bot is back to public mode.';
                                    await this.sock.sendMessage(from, { text: response }, { quoted: msg });
                                    return;
                                }

                                if (commandName === 'public') {
                                    this.isPublic = true;
                                    if (!botData.statusSettings[this.userId]) {
                                        botData.statusSettings[this.userId] = { autoStatus: false, autoSeen: false, autoLike: false, autoDownload: false, isPublic: true };
                                    }
                                    botData.statusSettings[this.userId].isPublic = true;
                                    saveBotData();
                                    await this.sock.sendMessage(from, { text: '✅ Public mode ON. Bot will respond normally.' }, { quoted: msg });
                                    return;
                                }

                                if (!args.length) {
                                    const status = this.isPublic ? 'PUBLIC' : 'PRIVATE';
                                    await this.sock.sendMessage(from, {
                                        text: `*BOT MODE:* ${status}\n\nUsage:\n.mode private on\n.mode private off\n.mode public\n.private on\n.public`
                                    }, { quoted: msg });
                                    return;
                                }

                                const modeType = args[0].toLowerCase();
                                const modeState = (args[1] || '').toLowerCase();

                                if (modeType === 'private') {
                                    const shouldEnablePrivate = ['on', 'enable', 'true', '1', 'yes'].includes(modeState);
                                    this.isPublic = !shouldEnablePrivate;
                                    if (!botData.statusSettings[this.userId]) {
                                        botData.statusSettings[this.userId] = { autoStatus: false, autoSeen: false, autoLike: false, autoDownload: false, isPublic: true };
                                    }
                                    botData.statusSettings[this.userId].isPublic = this.isPublic;
                                    saveBotData();

                                    const response = shouldEnablePrivate
                                        ? '✅ Private mode ON. Bot will only answer in private chats and only to owner/sudo.'
                                        : '✅ Private mode OFF. Bot is back to public mode.';
                                    await this.sock.sendMessage(from, { text: response }, { quoted: msg });
                                    return;
                                }

                                if (modeType === 'public') {
                                    this.isPublic = true;
                                    if (!botData.statusSettings[this.userId]) {
                                        botData.statusSettings[this.userId] = { autoStatus: false, autoSeen: false, autoLike: false, autoDownload: false, isPublic: true };
                                    }
                                    botData.statusSettings[this.userId].isPublic = true;
                                    saveBotData();
                                    await this.sock.sendMessage(from, { text: '✅ Public mode ON. Bot will respond normally.' }, { quoted: msg });
                                    return;
                                }

                                await this.sock.sendMessage(from, {
                                    text: '⚠️ Usage: .mode private on | .mode private off | .mode public | .private on | .public'
                                }, { quoted: msg });
                                return;
                            }

                            const commandHandler = commands[commandName];
                            if (typeof commandHandler === 'function') {
                                try {
                                    await invokeCommand(commandHandler, this.sock, from, msg, isAdmin, q, this, args, botData, saveBotData, this.userId);
                                } catch (handlerError) {
                                    this.sendLog(`Command error (${commandName}): ` + (handlerError && handlerError.message ? handlerError.message : String(handlerError)), 'error');
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Message Processing Error:', e);
                    }
                }));
            });

            this.sock.ev.on('connection.update', async (update) => {
                if (generation !== this.connectionGeneration || this.sock !== activeSocket) return;
                const { connection, lastDisconnect, qr } = update;
                if (qr) {
                    const socketId = userSockets[this.userId];
                    if (socketId) io.to(socketId).emit('qr', qr);
                }

                if (connection === 'close') {
                    const disconnectError = lastDisconnect?.error;
                    const shouldReconnect = disconnectError?.output?.statusCode !== DisconnectReason.loggedOut;
                    this.isConnected = false;
                    this.isInitializing = false;
                    this.sendLog(`Connection closed. Reconnecting: ${shouldReconnect}`, 'warning');
                    this.sendConnectionStatus();
                    const statusCode = disconnectError?.output?.statusCode;

                    if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                        this.sendLog('Session expired or logged out. Clearing auth data...', 'error');
                        try {
                            if (fs.existsSync(this.authPath)) {
                                const backupPath = `${this.authPath}_backup_${Date.now()}`;
                                fs.moveSync(this.authPath, backupPath);
                                this.sendLog(`Corrupted session backed up to ${backupPath}`, 'info');
                            }
                        } catch (e) {
                            if (fs.existsSync(this.authPath)) fs.removeSync(this.authPath);
                        }
                        delete sessions[this.userId];
                        this.sendConnectionStatus();
                    } else if (statusCode === DisconnectReason.restartRequired || statusCode === DisconnectReason.connectionLost || statusCode === 428) {
                        this.sendLog(`Connection issue (${statusCode}). Restarting in 3s...`, 'warning');
                        this.reconnectTimer = setTimeout(() => {
                            this.reconnectTimer = null;
                            this.initialize();
                        }, 3000);
                    } else if (statusCode === 515) {
                        this.sendLog('Stream error. Reconnecting immediately...', 'warning');
                        this.initialize();
                    } else {
                        this.sendLog(`Connection closed (${statusCode}). Reconnecting in 5s...`, 'info');
                        this.reconnectTimer = setTimeout(() => {
                            this.reconnectTimer = null;
                            this.initialize();
                        }, 5000);
                    }
                } else if (connection === 'open') {
                    this.isConnected = true;
                    this.isInitializing = false;
                    this.sendLog('Connected successfully! \u{2705}', 'success');
                    this.sendConnectionStatus();

                    try {
                        const { handleConnection } = require('./commands/connection');
                        await handleConnection(this.sock, {
                            success: (msg) => this.sendLog(msg, 'success'),
                            warning: (msg) => this.sendLog(msg, 'warning')
                        });
                    } catch (err) {
                        this.sendLog('Connection notification failed: ' + (err.message || err), 'warning');
                    }

                    const botNumber = jidNormalizedUser(this.sock.user.id);
                    const botNumberClean = botNumber.split('@')[0];
                    this.phoneNumber = botNumberClean;

                    if (!settings.connectedBots.includes(botNumberClean)) {
                        settings.connectedBots.push(botNumberClean);
                    }

                    const botName = botData.userNames[this.userId] || (this.sock.user && this.sock.user.name) || this.userId;

                    this.sendLog(`Bot ${botName} is online.`, 'success');
                    this.lastConnectMessageTime = Date.now();
                }
            });

        } catch (err) {
            this.isInitializing = false;
            this.sendLog(`Initialization failed: ${err.message}. Retrying in 10s...`, 'error');
            if (generation === this.connectionGeneration) {
                this.reconnectTimer = setTimeout(() => {
                    this.reconnectTimer = null;
                    this.initialize();
                }, 10000);
            }
        }
    }
}


// =================== SOCKET.IO ===================
io.on('connection', (socket) => {
    // Admin auth
    socket.on('admin-auth', (password) => {
        const adminPass = process.env.ADMIN_PASSWORD || 'MICKEY_TECH';
        if (password === adminPass) {
            socket.authenticated = true;
            socket.emit('admin-auth-success');
        } else {
            socket.emit('admin-auth-fail');
        }
    });

    socket.on('set-user', (userId) => {
        userSockets[userId] = socket.id;
        if (!sessions[userId]) sessions[userId] = new BotSession(userId);
        sessions[userId].sendConnectionStatus();
    });

    // Pair request
    socket.on('pair-request', async ({ userId, number }) => {
        if (sessions[userId]) {
            if (!botData.statusSettings[userId]) {
                botData.statusSettings[userId] = { 
                    autoStatus: false,
                    autoSeen: false,
                    autoLike: false,
                    autoDownload: false,
                    isPublic: true
                };
                saveBotData();
            }
            sessions[userId].tgChatId = null;
            await sessions[userId].initialize(number);
        } else {
            sessions[userId] = new BotSession(userId);
            if (!botData.statusSettings[userId]) {
                botData.statusSettings[userId] = { 
                    autoStatus: false,
                    autoSeen: false,
                    autoLike: false,
                    autoDownload: false,
                    isPublic: true
                };
                saveBotData();
            }
            sessions[userId].tgChatId = null;
            await sessions[userId].initialize(number);
        }
    });

    // BROADCAST MESSAGE
    socket.on('broadcast', async ({ message }) => {
        if (!socket.authenticated) return;

        const activeBots = getAllActiveSockets();
        let totalSent = 0;
        let totalChats = 0;

        for (const bot of activeBots) {
            try {
                const allChats = Object.keys(bot.sock.chats || {});
                const personalChats = allChats.filter(jid => typeof jid === 'string' && (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us')));

                for (const jid of personalChats) {
                    try {
                        await bot.sock.sendMessage(jid, { 
                            text: `\u{1F4E2} *BROADCAST MESSAGE* \u{1F4E2}\n\n${message}\n\n_From: ${botOwnerName} Bot Admin_` 
                        });
                        totalSent++;
                    } catch (e) {}
                }
                totalChats += personalChats.length;
            } catch (e) {
                console.error('Broadcast error:', e.message);
            }
        }

        botData.broadcastHistory.unshift({
            message,
            timestamp: new Date().toISOString(),
            totalSent,
            totalBots: activeBots.length
        });
        if (botData.broadcastHistory.length > 50) botData.broadcastHistory.pop();
        saveBotData();

        socket.emit('broadcast-result', { totalSent, totalBots: activeBots.length, totalChats });
    });

    // STOP BOT
    socket.on('stop-bot', async ({ sessionId }) => {
        if (!socket.authenticated) return;

        if (sessions[sessionId] && sessions[sessionId].sock) {
            try {
                await sessions[sessionId].sock.logout();
                sessions[sessionId].isConnected = false;
                delete sessions[sessionId];
                socket.emit('bot-stopped', { sessionId, success: true });
            } catch (e) {
                socket.emit('bot-stopped', { sessionId, success: false, error: e.message });
            }
        }
    });

    // STOP ALL BOTS
    socket.on('stop-all-bots', async () => {
        if (!socket.authenticated) return;

        let stopped = 0;
        for (const [sessionId, session] of Object.entries(sessions)) {
            try {
                if (session.sock) {
                    await session.sock.logout();
                    session.isConnected = false;
                    stopped++;
                }
            } catch (e) {}
        }
        socket.emit('all-bots-stopped', { stopped });
    });

    // GET CONNECTED BOTS LIST
    socket.on('get-bots-list', () => {
        if (!socket.authenticated) return;

        const bots = [];
        for (const [sessionId, session] of Object.entries(sessions)) {
            if (session.sock && session.sock.user) {
                bots.push({
                    sessionId,
                    phoneNumber: session.phoneNumber,
                    isConnected: session.isConnected,
                    userName: botData.userNames[sessionId] || 'Unknown'
                });
            }
        }
        socket.emit('bots-list', bots);
    });

    // GET BROADCAST HISTORY
    socket.on('get-broadcast-history', () => {
        if (!socket.authenticated) return;
        socket.emit('broadcast-history', botData.broadcastHistory || []);
    });

    socket.on('disconnect', () => {
        for (const [userId, socketId] of Object.entries(userSockets)) {
            if (socketId === socket.id) {
                delete userSockets[userId];
                break;
            }
        }
    });
});

// Start server
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 25569);

server.listen(PORT, HOST, async () => {
    const displayHost = process.env.SERVER_IP || process.env.P_SERVER_IP || (HOST === '0.0.0.0' ? 'localhost' : HOST);
    const displayPort = process.env.SERVER_PORT || process.env.P_SERVER_PORT || PORT;
    console.log(`\u{1F311} ${botBrandName} v${settings.version} Server running on ${HOST}:${PORT}`);
    console.log(`\u{1F4E1} Total commands loaded: 120+`);
    console.log(`\u{1F310} Web Dashboard: http://${displayHost}:${displayPort}`);
    await loadExistingSessions();
});
