require('dotenv').config();

const nativeConsoleLog = console.log.bind(console);
const nativeConsoleInfo = console.info.bind(console);
const isSignalSessionDump = (args) => {
    const firstValue = args[0];
    return typeof firstValue === 'string' &&
        firstValue.startsWith('Closing session:');
};

console.log = (...args) => {
    if (!isSignalSessionDump(args)) nativeConsoleLog(...args);
};

console.info = (...args) => {
    if (!isSignalSessionDump(args)) nativeConsoleInfo(...args);
};

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    downloadContentFromMessage,
    normalizeMessageContent,
    jidNormalizedUser,
    Browsers,
    delay
} = require('@whiskeysockets/baileys');

const P = require('pino');
const { OpenAI } = require('openai');
const { isSudo } = require('./lib');
const {
    isSessionRepairableError,
    backupSignalState
} = require('./lib/sessionRecovery');
const { createCtx } = require('./lib/messageBuilder');


/* =========================================================
   CONTEXT COMMAND ADAPTER
========================================================= */

function adaptContextCommand(commandModule) {
    if (!commandModule || typeof commandModule.code !== 'function') {
        return null;
    }

    return async function objectCommandAdapter(
        sock,
        chatId,
        senderId,
        text,
        message
    ) {
        const args = String(text || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        const ctx = createCtx(
            sock,
            chatId,
            message,
            {
                args,
                text,
                command: commandModule.name
            }
        );

        const quotedMessage =
            message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        const quoted =
            message?.quoted ||
            message?.msg?.contextInfo?.quotedMessage ||
            (quotedMessage
                ? {
                    message: quotedMessage,
                    body:
                        quotedMessage.conversation ||
                        quotedMessage.extendedTextMessage?.text ||
                        quotedMessage.imageMessage?.caption ||
                        quotedMessage.videoMessage?.caption ||
                        ''
                }
                : null);

        ctx.quoted = quoted;

        ctx.sender = {
            pushName:
                message?.pushName ||
                message?.key?.pushName ||
                ''
        };

        ctx.isMedia = (types = []) => {
            const source = message?.message || {};
            const quotedSource = quoted?.message || quoted || {};

            if (
                types.includes('image') &&
                (source.imageMessage || quotedSource.imageMessage)
            ) {
                return 'image';
            }

            if (
                types.includes('video') &&
                (source.videoMessage || quotedSource.videoMessage)
            ) {
                return 'video';
            }

            if (
                types.includes('audio') &&
                (source.audioMessage || quotedSource.audioMessage)
            ) {
                return 'audio';
            }

            return null;
        };

        ctx.format = {
            generateInstruction: () =>
                'Tuma message au reply media',

            generateCmdExample: (_used, example) =>
                `Mfano: .${commandModule.name} ${example}`,

            info: (value) =>
                `✅ ${value}`
        };

        ctx.helper = {
            handleError: async (_ctx, error) => {
                return ctx.reply(
                    `❌ ${error?.message || error}`
                );
            }
        };

        return commandModule.code(ctx);
    };
}


/* =========================================================
   COMMAND LOADER
========================================================= */

function loadCommandRegistry() {
    const registry = {};

    const commandsDir = path.join(
        __dirname,
        'commands'
    );

    const ignoredFiles = new Set([
        'a2uitest',
        'antibadword',
        'antidelete',
        'antisticker',
        'buy',
        'coin',
        'donate',
        'emojimix',
        'getpp',
        'imagine',
        'instagram',
        'pair',
        'status',
        'telebot',
        'unpair',
        'url',
        'sudo'
    ]);

    if (!fs.existsSync(commandsDir)) {
        return registry;
    }

    for (const entry of fs.readdirSync(commandsDir)) {
        if (
            entry === 'lib' ||
            entry === 'Mickey' ||
            entry.startsWith('.')
        ) {
            continue;
        }

        const fullPath = path.join(
            commandsDir,
            entry
        );

        if (
            !fs.statSync(fullPath).isFile() ||
            !entry.endsWith('.js')
        ) {
            continue;
        }

        const commandName = path
            .basename(entry, '.js');

        if (ignoredFiles.has(commandName)) {
            continue;
        }

        try {
            const mod = require(fullPath);

            const exportedFunctions =
                Object.entries(mod || {})
                    .filter(
                        ([, value]) =>
                            typeof value === 'function'
                    );

            let handler = null;

            if (
                mod &&
                typeof mod === 'object' &&
                typeof mod.code === 'function'
            ) {
                handler = adaptContextCommand(mod);
            }

            if (typeof mod === 'function') {
                const modName =
                    (mod.name || '').toLowerCase();

                if (
                    modName.includes(
                        commandName.toLowerCase()
                    ) ||
                    modName.includes('command') ||
                    modName.includes('handler')
                ) {
                    handler = mod;
                }
            }

            if (!handler) {
                const preferred =
                    exportedFunctions.find(([key]) => {
                        const lowerKey =
                            key.toLowerCase();

                        return (
                            lowerKey.includes(
                                commandName.toLowerCase()
                            ) ||
                            lowerKey.includes('command') ||
                            lowerKey.includes('handler')
                        );
                    });

                handler =
                    preferred
                        ? preferred[1]
                        : exportedFunctions[0]
                            ? exportedFunctions[0][1]
                            : null;
            }

            if (handler) {
                registry[commandName] = handler;

                if (
                    mod?.aliases &&
                    Array.isArray(mod.aliases)
                ) {
                    for (const alias of mod.aliases) {
                        registry[
                            String(alias)
                                .replace(/^\./, '')
                                .toLowerCase()
                        ] = handler;
                    }
                }
            }

            if (mod && typeof mod === 'object') {
                for (const [key, value] of Object.entries(mod)) {
                    if (
                        typeof value === 'function' &&
                        ![
                            'default',
                            'handler',
                            'command'
                        ].includes(key)
                    ) {
                        registry[key] = value;
                        registry[key.toLowerCase()] = value;
                    }
                }
            }

        } catch (error) {
            const message =
                error?.message ||
                String(error);

            const isLegacyMissingModule =
                /Cannot find module|Invalid or unexpected token|require is not defined in ES module scope|is not a function|Unexpected token/i
                    .test(message);

            if (!isLegacyMissingModule) {
                console.warn(
                    `[Command Loader] Failed to load ${entry}:`,
                    message
                );
            }
        }
    }

    registry.get = async (
        sock,
        from,
        msg
    ) => {
        return sock.sendMessage(
            from,
            {
                text:
                    "❌ The 'get' command is not implemented yet."
            },
            {
                quoted: msg
            }
        );
    };

    return registry;
}

const commands = loadCommandRegistry();


/* =========================================================
   COMMAND / BUTTON SYSTEM
========================================================= */

const {
    invokeCommand: invokeCompatibleCommand
} = require('./lib/commandInvoker');

const {
    getButtonId,
    isButtonResponse,
    isCommandId,
    autoDetectButtonCommand,
    executeButtonHandler,
    loadButtonHandlers
} = require('./lib/buttonLoader');

const buttonHandlersPromise =
    loadButtonHandlers();

async function invokeCommand(
    commandHandler,
    sock,
    from,
    msg,
    isAdmin,
    q,
    session,
    args,
    botData,
    saveBotData,
    userId
) {
    return invokeCompatibleCommand(
        commandHandler,
        sock,
        from,
        msg,
        isAdmin,
        q,
        session,
        args,
        botData,
        saveBotData,
        userId
    );
}


/* =========================================================
   FEATURE HANDLERS
========================================================= */

const {
    handleAutoread
} = require('./commands/autoread');

const {
    handleStatusUpdate,
    handleAutoStatus
} = require('./commands/autostatus');

const {
    handleAutorecordingForMessage,
    isAutorecordingEnabled
} = require('./commands/autorecording');

const {
    handleAutotypingForMessage,
    isAutotypingEnabled
} = require('./commands/autotyping');

const {
    handleChatbotMessage
} = require('./commands/chatbot');

const {
    handleConnection
} = require('./commands/connection');


/* =========================================================
   EXPRESS / SOCKET.IO
========================================================= */

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: '*'
    },
    transports: [
        'websocket',
        'polling'
    ]
});


/* =========================================================
   TELEGRAM
========================================================= */

const tgToken =
    process.env.TELEGRAM_BOT_TOKEN;

if (!tgToken) {
    console.error(
        'TELEGRAM_BOT_TOKEN not set in environment variables!'
    );
}

const tgBot = tgToken
    ? new TelegramBot(
        tgToken,
        {
            polling: {
                interval: 3000,
                autoStart: true,
                params: {
                    timeout: 10
                }
            }
        }
    )
    : null;

if (tgBot) {
    tgBot.on(
        'polling_error',
        (error) => {
            console.log(
                'Telegram polling error:',
                error.message
            );

            if (
                error.message &&
                (
                    error.message.includes('409') ||
                    error.message.includes('Conflict')
                )
            ) {
                console.log(
                    'Another instance detected. Stopping this instance...'
                );

                tgBot.stopPolling();
            }

            if (
                error.message &&
                error.message.includes('401')
            ) {
                console.log(
                    'Telegram Token is invalid (401 Unauthorized).'
                );

                tgBot.stopPolling();
            }
        }
    );
}


/* =========================================================
   SETTINGS
========================================================= */

const settings = require('./settings');

const botBrandName =
    settings.botName ||
    settings.appBrand ||
    'MICKEY GLITCH 2';

const botOwnerName =
    settings.ownerName ||
    'MICKEY';

const botOwnerNumber =
    settings.ownerNumber ||
    '255615944741';

const botVersion =
    settings.version ||
    '3.0.0';

const botNewsletterJid =
    settings.newsletterJid ||
    '120363398106360290@newsletter';

const botNewsletterName =
    settings.newsletterName ||
    botBrandName;


/* =========================================================
   MESSAGE CONTEXT
========================================================= */

function addBotMessageContext(content) {
    if (
        !content ||
        typeof content !== 'object' ||
        Array.isArray(content)
    ) {
        return content;
    }

    if (
        content.react ||
        content.delete ||
        content.protocolMessage
    ) {
        return content;
    }

    return {
        ...content,

        messageContextInfo: {
            ...(content.messageContextInfo || {}),

            messageSecret:
                crypto.randomBytes(32),

            supportPayload:
                JSON.stringify({
                    version: 1,
                    is_ai_message: true,
                    should_show_system_message: true,
                    ticket_id:
                        '1669945700536053'
                })
        }
    };
}


function addBotRelayNodes(options = {}) {
    const nodes =
        Array.isArray(options.additionalNodes)
            ? [...options.additionalNodes]
            : [];

    const hasNode = (tag) =>
        nodes.some(
            (node) => node?.tag === tag
        );

    if (!hasNode('bot')) {
        nodes.push({
            attrs: {
                biz_bot: '1'
            },
            tag: 'bot'
        });
    }

    if (!hasNode('biz')) {
        nodes.push({
            attrs: {},
            tag: 'biz'
        });
    }

    return {
        ...options,
        additionalNodes: nodes
    };
}


/* =========================================================
   GLOBAL DATA
========================================================= */

const AUTH_DIR = './auth_info';
const DATA_FILE = './data/bot_data.json';

fs.ensureDirSync(AUTH_DIR);
fs.ensureDirSync('./data');

let botData = {
    antilinkGroups: {},
    totalBots: 0,
    registeredBots: [],
    statusSettings: {},
    antiDelete: {},
    userNames: {},
    antiCall: {},
    broadcastHistory: {}
};

if (fs.existsSync(DATA_FILE)) {
    try {
        botData = fs.readJsonSync(
            DATA_FILE
        );
    } catch (e) {
        console.error(
            '[Data] Failed to read bot_data.json:',
            e.message
        );
    }
}

function saveBotData() {
    try {
        fs.writeJsonSync(
            DATA_FILE,
            botData,
            {
                spaces: 2
            }
        );
    } catch (error) {
        console.error(
            '[Data] Save failed:',
            error.message
        );
    }
}


const sessions = {};
const userSockets = {};
const messageLogs = {};

function getDashboardBotState() {
    const authEntries = fs.existsSync(AUTH_DIR)
        ? fs.readdirSync(AUTH_DIR)
        : [];
    const ids = new Set([
        ...authEntries.filter((entry) => {
            const entryPath = path.join(AUTH_DIR, entry);
            return fs.existsSync(entryPath) &&
                fs.statSync(entryPath).isDirectory() &&
                fs.existsSync(path.join(entryPath, 'creds.json'));
        }),
        ...Object.keys(sessions)
    ]);

    return [...ids].map((userId) => {
        const session = sessions[userId];
        const settingsForBot = botData.statusSettings?.[userId] || {};
        const phoneNumber = session?.phoneNumber ||
            session?.sock?.user?.id?.split(':')?.[0] || '';
        const name = botData.userNames?.[userId] ||
            session?.sock?.user?.name ||
            (phoneNumber ? `Bot ${phoneNumber}` : userId);

        return {
            id: userId,
            name,
            phoneNumber,
            paired: fs.existsSync(path.join(AUTH_DIR, userId, 'creds.json')),
            running: Boolean(session?.isConnected),
            connecting: Boolean(session?.isInitializing),
            settings: settingsForBot
        };
    });
}

function emitDashboardBotState() {
    io.emit('bot-state', {
        bots: getDashboardBotState(),
        active: Object.values(sessions).filter((session) => session.isConnected).length
    });
}


/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function getConnectedBotNumbers() {
    const numbers = [];

    for (
        const [sessionId, session]
        of Object.entries(sessions)
    ) {
        if (
            session.sock &&
            session.sock.user
        ) {
            const num =
                jidNormalizedUser(
                    session.sock.user.id
                ).split('@')[0];

            numbers.push(num);
        }
    }

    return numbers;
}


function getAllActiveSockets() {
    const socks = [];

    for (
        const [sessionId, session]
        of Object.entries(sessions)
    ) {
        if (
            session.sock &&
            session.isConnected
        ) {
            socks.push({
                sock: session.sock,
                sessionId,
                phoneNumber:
                    session.phoneNumber
            });
        }
    }

    return socks;
}


function getAllConnectedUserJids(sock) {
    const jids = [];

    for (
        const [jid]
        of Object.entries(sock.chats || {})
    ) {
        if (
            typeof jid === 'string' &&
            (
                jid.endsWith(
                    '@s.whatsapp.net'
                ) ||
                jid.endsWith('@g.us')
            )
        ) {
            jids.push(jid);
        }
    }

    return jids;
}


function isPremiumUser(chatId) {
    const ownerChatId =
        process.env.OWNER_TELEGRAM_ID ||
        settings.tgOwnerId;

    if (
        chatId.toString() ===
        String(ownerChatId)
    ) {
        return true;
    }

    if (
        Array.isArray(settings.premiumUsers) &&
        settings.premiumUsers.includes(
            chatId.toString()
        )
    ) {
        return true;
    }

    return false;
}


function isTgOwner(chatId) {
    const ownerChatId =
        process.env.OWNER_TELEGRAM_ID ||
        settings.tgOwnerId;

    return (
        chatId.toString() ===
        String(ownerChatId)
    );
}


/* =========================================================
   TELEGRAM COMMANDS
========================================================= */

if (tgBot) {

    tgBot.onText(
        /\/start/,
        async (msg) => {
            const chatId = msg.chat.id;
            const isOwner =
                isTgOwner(chatId);

            const welcomeMessage =
                `◬━━━〈 *${botBrandName}* 〉━━━◬\n\n` +
                `*🌑 Mickey Glitch Pair Function* 🌑\n\n` +
                `Welcome to the most premium WhatsApp bot experience.\n\n` +
                `*📱 AVAILABLE COMMANDS:*\n` +
                `• /start - Open this menu\n` +
                `• /clearsession - Reset your pairing\n` +
                `${isOwner ? `• /status - Bot overall status\n` : ''}` +
                `${isOwner ? `• /follow <link> - Force follow channel\n` : ''}` +
                `\n` +
                `*🔐 TO CONNECT:*\n` +
                `Simply send your WhatsApp number with country code.\n` +
                `Example: \`255615944741\`\n\n` +
                `> © POWERED BY ${botBrandName} v${botVersion}`;

            try {
                await tgBot.sendPhoto(
                    chatId,
                    settings.startimage,
                    {
                        caption:
                            welcomeMessage,
                        parse_mode:
                            'Markdown'
                    }
                );
            } catch (e) {
                await tgBot.sendMessage(
                    chatId,
                    welcomeMessage,
                    {
                        parse_mode:
                            'Markdown'
                    }
                );
            }
        }
    );


    tgBot.onText(
        /\/clearsession/,
        async (msg) => {
            const chatId = msg.chat.id;
            const userId =
                `tg_${chatId}`;

            if (sessions[userId]) {

                if (sessions[userId].sock) {
                    try {
                        await sessions[
                            userId
                        ].sock.logout();
                    } catch (e) {}
                }

                const authPath =
                    sessions[userId]
                        .authPath;

                if (
                    fs.existsSync(authPath)
                ) {
                    fs.removeSync(
                        authPath
                    );
                }

                delete sessions[userId];

                await tgBot.sendMessage(
                    chatId,
                    `🗑️ *Session cleared!* You can now pair a new number.`,
                    {
                        parse_mode:
                            'Markdown'
                    }
                );

            } else {

                await tgBot.sendMessage(
                    chatId,
                    `⚠️ No active session found to clear.`,
                    {
                        parse_mode:
                            'Markdown'
                    }
                );
            }
        }
    );


    tgBot.onText(
        /\/follow (.+)/,
        async (msg, match) => {

            const chatId =
                msg.chat.id;

            if (!isTgOwner(chatId)) {
                return;
            }

            const channelLink =
                match[1].trim();

            const activeSocks =
                getAllActiveSockets();

            await tgBot.sendMessage(
                chatId,
                `🔄 *Initiating Mass Follow...*\nTarget: ${channelLink}\nBots: ${activeSocks.length}`,
                {
                    parse_mode:
                        'Markdown'
                }
            );

            let success = 0;

            for (
                const { sock }
                of activeSocks
            ) {
                try {

                    const channelKey =
                        channelLink.split(
                            '/channel/'
                        )[1] ||
                        channelLink
                            .split('/')
                            .pop();

                    const metadata =
                        await sock.newsletterMetadata(
                            'invite',
                            channelKey,
                            'GUEST'
                        );

                    if (
                        metadata &&
                        metadata.id
                    ) {
                        await sock.newsletterFollow(
                            metadata.id
                        );

                        success++;
                    }

                } catch (e) {}
            }

            await tgBot.sendMessage(
                chatId,
                `✅ *Mass Follow Complete!*\nSuccessfully followed: ${success}/${activeSocks.length}`,
                {
                    parse_mode:
                        'Markdown'
                }
            );
        }
    );


    tgBot.onText(
        /\/status/,
        async (msg) => {

            const chatId =
                msg.chat.id;

            if (!isTgOwner(chatId)) {
                return tgBot.sendMessage(
                    chatId,
                    '❌ *Owner only command!*',
                    {
                        parse_mode:
                            'Markdown'
                    }
                );
            }

            const connectedCount =
                Object.values(
                    sessions
                ).filter(
                    s => s.isConnected
                ).length;

            const botNumbers =
                getConnectedBotNumbers();

            const numbersList =
                botNumbers.length > 0
                    ? botNumbers.join('\n')
                    : 'None';

            const statusMsg =
                `◬━━━〈 *MICKEY GLITCH STATUS* 〉━━━◬\n\n` +
                `📱 *Connected Bots:* ${connectedCount}\n` +
                `⚡ *Total Sessions:* ${Object.keys(sessions).length}\n\n` +
                `🔢 *Active Numbers:*\n\`${numbersList}\`\n\n` +
                `> © POWERED BY ${botBrandName} v${botVersion}`;

            await tgBot.sendMessage(
                chatId,
                statusMsg,
                {
                    parse_mode:
                        'Markdown'
                }
            );
        }
    );


    tgBot.onText(
        /\/addpremium (.+)/,
        async (msg, match) => {

            const chatId =
                msg.chat.id;

            if (!isTgOwner(chatId)) {
                return tgBot.sendMessage(
                    chatId,
                    '❌ *Owner only command!*',
                    {
                        parse_mode:
                            'Markdown'
                    }
                );
            }

            if (
                !Array.isArray(
                    settings.premiumUsers
                )
            ) {
                settings.premiumUsers = [];
            }

            const targetId =
                match[1].trim();

            if (
                !settings.premiumUsers.includes(
                    targetId
                )
            ) {
                settings.premiumUsers.push(
                    targetId
                );

                await tgBot.sendMessage(
                    chatId,
                    `✅ *Premium user added:* \`${targetId}\``,
                    {
                        parse_mode:
                            'Markdown'
                    }
                );

            } else {

                await tgBot.sendMessage(
                    chatId,
                    `⚠️ User already premium: \`${targetId}\``,
                    {
                        parse_mode:
                            'Markdown'
                    }
                );
            }
        }
    );


    tgBot.onText(
        /\/removepremium (.+)/,
        async (msg, match) => {

            const chatId =
                msg.chat.id;

            if (!isTgOwner(chatId)) {
                return tgBot.sendMessage(
                    chatId,
                    '❌ *Owner only command!*',
                    {
                        parse_mode:
                            'Markdown'
                    }
                );
            }

            if (
                !Array.isArray(
                    settings.premiumUsers
                )
            ) {
                settings.premiumUsers = [];
            }

            const targetId =
                match[1].trim();

            const idx =
                settings.premiumUsers.indexOf(
                    targetId
                );

            if (idx > -1) {

                settings.premiumUsers.splice(
                    idx,
                    1
                );

                await tgBot.sendMessage(
                    chatId,
                    `✅ *Premium user removed:* \`${targetId}\``,
                    {
                        parse_mode:
                            'Markdown'
                    }
                );

            } else {

                await tgBot.sendMessage(
                    chatId,
                    `⚠️ User not found in premium list: \`${targetId}\``,
                    {
                        parse_mode:
                            'Markdown'
                    }
                );
            }
        }
    );


    tgBot.onText(
        /\/listpremium/,
        async (msg) => {

            const chatId =
                msg.chat.id;

            if (!isTgOwner(chatId)) {
                return tgBot.sendMessage(
                    chatId,
                    '❌ *Owner only command!*',
                    {
                        parse_mode:
                            'Markdown'
                    }
                );
            }

            if (
                !Array.isArray(
                    settings.premiumUsers
                )
            ) {
                settings.premiumUsers = [];
            }

            const list =
                settings.premiumUsers.length > 0
                    ? settings.premiumUsers.join('\n')
                    : 'None';

            await tgBot.sendMessage(
                chatId,
                `👑 *Premium Users:*\n\n${list}`,
                {
                    parse_mode:
                        'Markdown'
                }
            );
        }
    );


    /* =====================================================
       TELEGRAM PAIRING
    ===================================================== */

    tgBot.on(
        'message',
        async (msg) => {

            const chatId =
                msg.chat.id;

            const text =
                msg.text;

            if (
                !text ||
                text.startsWith('/')
            ) {
                return;
            }

            if (/^\d+$/.test(text)) {

                const userId =
                    chatId.toString();

                if (!sessions[userId]) {
                    sessions[userId] =
                        new BotSession(
                            userId
                        );
                }

                if (
                    !botData.statusSettings[
                        userId
                    ]
                ) {
                    botData.statusSettings[
                        userId
                    ] = {
                        autoStatus: false,
                        autoSeen: false,
                        autoLike: false,
                        autoDownload: false,
                        autoReact: false,
                        isPublic: true
                    };

                    saveBotData();
                }

                const initMsg =
                    `◬━━━〈 *MICKEY GLITCH PAIRING* 〉━━━◬\n\n` +
                    `*🔄 REQUESTING CODE...*\n` +
                    `Target Number: \`${text}\`\n\n` +
                    `_Please wait a few seconds..._`;

                await tgBot.sendMessage(
                    chatId,
                    initMsg,
                    {
                        parse_mode:
                            'Markdown'
                    }
                );

                sessions[userId].tgChatId =
                    chatId;

                await sessions[
                    userId
                ].initialize(text);
            }
        }
    );
}


/* =========================================================
   OPENAI
========================================================= */

let openai = null;

if (process.env.OPENAI_API_KEY) {
    try {
        openai = new OpenAI({
            apiKey:
                process.env.OPENAI_API_KEY,

            baseURL:
                process.env.AI_BASE_URL ||
                'https://api.openai.com/v1'
        });
    } catch (e) {}
}


/* =========================================================
   EXPRESS
========================================================= */

app.use(express.json());
app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    express.static(__dirname)
);

app.get(
    '/',
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                'index.html'
            )
        );
    }
);

app.get(
    '/health',
    (req, res) => {
        res.status(200).send('OK');
    }
);

app.get(
    '/api/server-info',
    (req, res) => {

        const forwardedProto =
            req.get(
                'x-forwarded-proto'
            );

        const protocol =
            (
                forwardedProto
                    ? forwardedProto.split(',')[0]
                    : req.protocol
            ).trim();

        const host =
            req.get('host');

        res.json({
            name: botBrandName,
            protocol,
            host,
            url:
                `${protocol}://${host}`,
            port: PORT
        });
    }
);


/* =========================================================
   BOLD / ITALIC
========================================================= */

const toBold = (text) => {

    const boldChars = {
        a: '𝗮',
        b: '𝗯',
        c: '𝗰',
        d: '𝗱',
        e: '𝗲',
        f: '𝗳',
        g: '𝗴',
        h: '𝗵',
        i: '𝗶',
        j: '𝗷',
        k: '𝗸',
        l: '𝗹',
        m: '𝗺',
        n: '𝗻',
        o: '𝗼',
        p: '𝗽',
        q: '𝗾',
        r: '𝗿',
        s: '𝘀',
        t: '𝘁',
        u: '𝘂',
        v: '𝘃',
        w: '𝘄',
        x: '𝘅',
        y: '𝘆',
        z: '𝘇',

        A: '𝗔',
        B: '𝗕',
        C: '𝗖',
        D: '𝗗',
        E: '𝗘',
        F: '𝗙',
        G: '𝗚',
        H: '𝗛',
        I: '𝗜',
        J: '𝗝',
        K: '𝗞',
        L: '𝗟',
        M: '𝗠',
        N: '𝗡',
        O: '𝗢',
        P: '𝗣',
        Q: '𝗤',
        R: '𝗥',
        S: '𝗦',
        T: '𝗧',
        U: '𝗨',
        V: '𝗩',
        W: '𝗪',
        X: '𝗫',
        Y: '𝗬',
        Z: '𝗭'
    };

    return String(text)
        .split('')
        .map(
            c => boldChars[c] || c
        )
        .join('');
};


const toItalic = (text) => {

    const italicChars = {
        a: '𝘢',
        b: '𝘣',
        c: '𝘤',
        d: '𝘥',
        e: '𝘦',
        f: '𝘧',
        g: '𝘨',
        h: '𝘩',
        i: '𝘪',
        j: '𝘫',
        k: '𝘬',
        l: '𝘭',
        m: '𝘮',
        n: '𝘯',
        o: '𝘰',
        p: '𝘱',
        q: '𝘲',
        r: '𝘳',
        s: '𝘴',
        t: '𝘵',
        u: '𝘶',
        v: '𝘷',
        w: '𝘸',
        x: '𝘹',
        y: '𝘺',
        z: '𝘻',

        A: '𝘈',
        B: '𝘉',
        C: '𝘊',
        D: '𝘋',
        E: '𝘌',
        F: '𝘍'
    };

    return String(text)
        .split('')
        .map(
            c => italicChars[c] || c
        )
        .join('');
};


/* =========================================================
   BOT SESSION
========================================================= */

class BotSession {

    constructor(userId) {

        this.userId = userId;
        this.sock = null;
        this.isConnected = false;
        this.aiEnabled = false;

        this.autoReact =
            botData.statusSettings[userId]
                ?.autoReact || false;

        this.isPublic =
            botData.statusSettings[userId]
                ?.isPublic !== undefined
                ? botData.statusSettings[userId]
                    .isPublic
                : true;

        this.authPath =
            path.join(
                AUTH_DIR,
                userId
            );

        this.processedMessages =
            new Set();

        this.activeInterval = null;
        this.isInitializing = false;
        this.reconnectTimer = null;
        this.connectionGeneration = 0;
        this.userChats = {};
        this.lastConnectMessageTime =
            null;
        this.phoneNumber = null;
        this.ghostMode = false;
        this.sessionRepairInProgress =
            false;
        this.lastSessionRepairAt = 0;
        this.decryptErrorCount = 0;
        this.pairingCredentialsTelegramSent = false;
        this.pairingCredentialsWhatsAppSent = false;
    }


    sendLog(
        message,
        type = 'info'
    ) {

        const logEntry = {
            timestamp:
                new Date()
                    .toLocaleTimeString(),

            message,
            type
        };

        const socketId =
            userSockets[
                this.userId
            ];

        if (socketId) {
            io.to(socketId).emit(
                'console',
                logEntry
            );
        }

        console.log(
            `[${this.userId}] ${message}`
        );
    }


    sendConnectionStatus() {

        const socketId =
            userSockets[
                this.userId
            ];

        if (socketId) {
            io.to(socketId).emit(
                'connection-status',
                {
                    connected:
                        this.isConnected,
                    user:
                        this.userId
                }
            );
        }

        io.emit(
            'total-active',
            Object.values(
                sessions
            ).filter(
                s => s.isConnected
            ).length
        );

        emitDashboardBotState();
    }


    async sendPairingCredentials() {
        const credentialsPath = path.join(
            this.authPath,
            'creds.json'
        );

        if (
            !fs.existsSync(credentialsPath) ||
            (!this.tgChatId && !this.sock?.user?.id)
        ) {
            this.sendLog(
                'Pairing completed, but no credentials recipient or creds.json was found.',
                'warning'
            );
            return;
        }

        const caption =
            `✅ Pairing completed successfully.\n` +
            `🔐 creds.json for ${this.phoneNumber || this.userId}`;

        if (
            this.tgChatId &&
            tgBot &&
            !this.pairingCredentialsTelegramSent
        ) {
            try {
                await tgBot.sendDocument(
                    this.tgChatId,
                    credentialsPath,
                    { caption }
                );

                this.pairingCredentialsTelegramSent = true;
                this.sendLog(
                    'creds.json sent to the Telegram pairing user.',
                    'success'
                );
            } catch (error) {
                this.sendLog(
                    `Failed to send creds.json on Telegram: ${error.message}`,
                    'error'
                );
            }
        }

        if (
            this.sock?.user?.id &&
            !this.pairingCredentialsWhatsAppSent
        ) {
            try {
                await this.sock.sendMessage(
                    jidNormalizedUser(this.sock.user.id),
                    {
                        document: fs.readFileSync(credentialsPath),
                        mimetype: 'application/json',
                        fileName: 'creds.json',
                        caption
                    }
                );

                this.pairingCredentialsWhatsAppSent = true;
                this.sendLog(
                    'creds.json sent to WhatsApp.',
                    'success'
                );
            } catch (error) {
                this.sendLog(
                    `Failed to send creds.json on WhatsApp: ${error.message}`,
                    'error'
                );
            }
        }
    }


    async repairSignalSession(error) {

        if (
            !isSessionRepairableError(error) ||
            this.sessionRepairInProgress
        ) {
            return false;
        }

        const now =
            Date.now();

        if (
            now -
            this.lastSessionRepairAt <
            60000
        ) {
            return false;
        }

        this.sessionRepairInProgress =
            true;

        this.lastSessionRepairAt =
            now;

        this.isConnected = false;

        this.sendLog(
            'Bad MAC detected. Backing up stale Signal keys and rebuilding the session...',
            'warning'
        );

        try {

            const backupPath =
                backupSignalState(
                    this.authPath,
                    now
                );

            if (backupPath) {
                this.sendLog(
                    `Signal keys backed up to ${backupPath}`,
                    'info'
                );
            }

            if (
                this.sock &&
                typeof this.sock.end === 'function'
            ) {
                try {
                    this.sock.end(
                        new Error(
                            'Rebuilding stale Signal session'
                        )
                    );
                } catch (_) {}
            }

            await this.initialize();

            return true;

        } catch (repairError) {

            this.sendLog(
                `Automatic session repair failed: ${repairError.message}`,
                'error'
            );

            return false;

        } finally {
            this.sessionRepairInProgress =
                false;
        }
    }


    async getAIResponse(
        userJid,
        userMessage,
        systemPrompt =
            'Helpful assistant.'
    ) {

        try {

            const apiUrl =
                `https://api.siputzx.my.id/api/ai/chatgpt?prompt=${encodeURIComponent(systemPrompt)}&text=${encodeURIComponent(userMessage)}`;

            const response =
                await axios.get(
                    apiUrl
                );

            if (
                response.data &&
                response.data.status
            ) {
                return response.data.data;
            }

            const fallbackUrl =
                `https://widipe.com/openai?text=${encodeURIComponent(userMessage)}`;

            const fallbackRes =
                await axios.get(
                    fallbackUrl
                );

            if (
                fallbackRes.data &&
                fallbackRes.data.result
            ) {
                return fallbackRes.data.result;
            }

            throw new Error(
                'Invalid API response from all sources'
            );

        } catch (error) {

            return (
                '❌ AI Error: ' +
                error.message
            );
        }
    }


    /*
     * KEEP-ALIVE REMOVED
     *
     * Hapo awali function hii ilikuwa inatuma:
     * "24/7 Active System Working..."
     *
     * Imeondolewa kabisa.
     */


    async initialize(
        pairingNumber = null
    ) {

        if (this.isInitializing) {
            this.sendLog(
                'Initialization already in progress...',
                'info'
            );

            return;
        }

        if (this.reconnectTimer) {
            clearTimeout(
                this.reconnectTimer
            );

            this.reconnectTimer = null;
        }

        const generation =
            ++this.connectionGeneration;

        if (pairingNumber) {
            this.pairingCredentialsTelegramSent = false;
            this.pairingCredentialsWhatsAppSent = false;
        }

        const previousSocket =
            this.sock;

        if (
            previousSocket &&
            typeof previousSocket.end === 'function'
        ) {
            try {
                previousSocket.end(
                    new Error(
                        'Replacing stale connection'
                    )
                );
            } catch (_) {}
        }

        this.sock = null;
        this.isInitializing = true;

        try {

            const { version } =
                await fetchLatestBaileysVersion();

            const {
                state,
                saveCreds
            } =
                await useMultiFileAuthState(
                    this.authPath
                );

            this.sock =
                makeWASocket({

                    version,

                    auth: {
                        creds:
                            state.creds,

                        keys:
                            makeCacheableSignalKeyStore(
                                state.keys,
                                P({
                                    level:
                                        'silent'
                                })
                            )
                    },

                    printQRInTerminal:
                        false,

                    logger:
                        P({
                            level:
                                'silent'
                        }),

                    browser:
                        Browsers.ubuntu(
                            'Chrome'
                        ),

                    syncFullHistory:
                        false,

                    shouldSyncHistoryMessage:
                        () => false,

                    markOnlineOnConnect:
                        true,

                    keepAliveIntervalMs:
                        30000,

                    connectTimeoutMs:
                        60000,

                    defaultQueryTimeoutMs:
                        60000,

                    emitOwnEvents:
                        true,

                    retryRequestDelayMs:
                        5000,

                    maxMsgRetryCount:
                        5,

                    linkPreviewImageThumbnailWidth:
                        192,

                    transactionOpts: {
                        maxCommitRetries:
                            10,

                        delayBetweenTriesMs:
                            3000
                    },

                    /*
                     * IMPORTANT:
                     * Hakuna tena "Bot is active"
                     * fallback message.
                     */
                    getMessage:
                        async (key) => {

                            if (
                                messageLogs[key.id]
                            ) {
                                return {
                                    conversation:
                                        messageLogs[
                                            key.id
                                        ].text
                                };
                            }

                            return undefined;
                        },

                    patchMessageBeforeSending:
                        (message) => {

                            const requiresPatch =
                                !!(
                                    message.buttonsMessage ||
                                    message.templateMessage ||
                                    message.listMessage
                                );

                            if (
                                requiresPatch
                            ) {
                                return {
                                    viewOnceMessage: {
                                        message: {
                                            messageContextInfo: {
                                                deviceListMetadata: {},
                                                deviceListMetadataVersion: 2
                                            },

                                            ...message
                                        }
                                    }
                                };
                            }

                            return message;
                        },

                    generateHighQualityLinkPreview:
                        true
                });


            const activeSocket =
                this.sock;


            /* =================================================
               SAFE SEND MESSAGE
            ================================================= */

            if (
                this.sock &&
                this.sock.sendMessage
            ) {

                const rawSendMessage =
                    this.sock.sendMessage.bind(
                        this.sock
                    );

                const rawRelayMessage =
                    typeof this.sock.relayMessage ===
                    'function'
                        ? this.sock.relayMessage.bind(
                            this.sock
                        )
                        : null;


                this.sock.sendMessage =
                    async (
                        jid,
                        content,
                        options = {}
                    ) => {

                        let safeJid = jid;

                        if (
                            typeof jid ===
                            'object' &&
                            jid !== null
                        ) {
                            safeJid =
                                jid.chatId ||
                                jid.from ||
                                jid.remoteJid ||
                                jid.key?.remoteJid ||
                                '';
                        }

                        safeJid =
                            String(
                                safeJid || ''
                            ).trim();

                        if (!safeJid) {

                            console.error(
                                '⚠️ [JID Guard] Invalid JID passed to sendMessage:',
                                jid
                            );

                            return;
                        }


                        const safeOptions =
                            {
                                ...options
                            };

                        if (
                            safeOptions.quoted
                        ) {

                            if (
                                !safeOptions
                                    .quoted.key
                            ) {
                                safeOptions.quoted.key =
                                    {
                                        remoteJid:
                                            safeJid,

                                        fromMe:
                                            false,

                                        id:
                                            'DUMMY_KEY_' +
                                            Date.now()
                                    };

                            } else if (
                                typeof safeOptions
                                    .quoted.key
                                    .fromMe ===
                                'undefined'
                            ) {
                                safeOptions
                                    .quoted.key
                                    .fromMe =
                                    false;
                            }
                        }

                        return rawSendMessage(
                            safeJid,
                            addBotMessageContext(
                                content
                            ),
                            safeOptions
                        );
                    };


                if (rawRelayMessage) {

                    this.sock.relayMessage =
                        async (
                            jid,
                            content,
                            options = {}
                        ) => {

                            const safeJid =
                                String(
                                    jid || ''
                                ).trim();

                            if (!safeJid) {

                                console.error(
                                    '⚠️ [JID Guard] Invalid JID passed to relayMessage:',
                                    jid
                                );

                                return;
                            }

                            return rawRelayMessage(
                                safeJid,
                                addBotMessageContext(
                                    content
                                ),
                                addBotRelayNodes(
                                    options
                                )
                            );
                        };
                }
            }


            /* =================================================
               PAIRING CODE
            ================================================= */

            if (
                pairingNumber &&
                !state.creds.registered
            ) {

                if (
                    !this.sock
                        .authState
                        ?.creds
                        ?.registered
                ) {

                    await delay(3000);

                    try {

                        const customPairingCode =
                            'MICKDADY';

                        let code =
                            await this.sock.requestPairingCode(
                                pairingNumber,
                                customPairingCode
                            );

                        code =
                            code
                                ?.match(
                                    /.{1,4}/g
                                )
                                ?.join('-') ||
                            code;

                        console.log(
                            '🔗 Pairing code:',
                            code ||
                            customPairingCode
                        );

                        this.sendLog(
                            `🔑 Pairing Code: ${code}`,
                            'success'
                        );

                        if (
                            this.tgChatId &&
                            tgBot
                        ) {

                            const codeMsg =
                                `◬━━━〈 *MICKEY GLITCH* 〉━━━◬\n\n` +
                                `*🔑 YOUR PAIRING CODE:* \`${code}\`\n\n` +
                                `_Enter this code in your WhatsApp Linked Devices section._\n\n` +
                                `> © MICKEY GLITCH BOT`;

                            await tgBot.sendMessage(
                                this.tgChatId,
                                codeMsg,
                                {
                                    parse_mode:
                                        'Markdown'
                                }
                            );
                        }

                        const socketId =
                            userSockets[
                                this.userId
                            ];

                        if (socketId) {
                            io.to(socketId).emit(
                                'pairing-code',
                                code
                            );
                        }

                    } catch (err) {

                        this.sendLog(
                            `❌ Pairing error: ${err.message}`,
                            'error'
                        );

                        if (
                            this.tgChatId &&
                            tgBot
                        ) {
                            await tgBot.sendMessage(
                                this.tgChatId,
                                '❌ Pairing Error: ' +
                                err.message
                            );
                        }
                    }
                }
            }


            this.sock.ev.on(
                'creds.update',
                saveCreds
            );


            /* =================================================
               ANTICALL
            ================================================= */

            this.sock.ev.on(
                'call',
                async (calls) => {

                    if (
                        botData.antiCall[
                            this.userId
                        ]
                    ) {

                        for (
                            const call
                            of calls
                        ) {

                            if (
                                call.status ===
                                'offer'
                            ) {

                                try {

                                    await this.sock.rejectCall(
                                        call.id,
                                        call.from
                                    );

                                    await this.sock.sendMessage(
                                        call.from,
                                        {
                                            text:
                                                `*⚠️ ANTI-CALL SYSTEM ACTIVE*\n\n` +
                                                `I am a bot and cannot receive calls.\n` +
                                                `Please send a text message instead.\n\n` +
                                                `> © POWERED BY ${botBrandName} v${botVersion}`
                                        }
                                    );

                                } catch (e) {}
                            }
                        }
                    }
                }
            );


            /* =================================================
               MESSAGE HANDLER
            ================================================= */

            this.sock.ev.on(
                'messages.upsert',
                async (m) => {

                    if (
                        generation !==
                            this.connectionGeneration ||
                        this.sock !==
                            activeSocket
                    ) {
                        return;
                    }

                    if (
                        m.type !==
                        'notify'
                    ) {
                        return;
                    }

                    await Promise.all(
                        m.messages.map(
                            async (msg) => {

                                try {

                                    if (
                                        msg.messageStubType === 1 ||
                                        msg.messageStubType === 2
                                    ) {

                                        this.sendLog(
                                            'Received an undecryptable message. This might be due to a session conflict.',
                                            'warning'
                                        );

                                        this.decryptErrorCount++;

                                        if (
                                            this.decryptErrorCount >= 3
                                        ) {

                                            await this.repairSignalSession(
                                                new Error(
                                                    'Failed to decrypt message with any known session'
                                                )
                                            );

                                            this.decryptErrorCount = 0;
                                        }

                                        return;
                                    }

                                    this.decryptErrorCount = 0;


                                    const from =
                                        String(
                                            msg.key.remoteJid ||
                                            ''
                                        );

                                    const isMe =
                                        msg.key.fromMe;

                                    const isGroup =
                                        from.endsWith(
                                            '@g.us'
                                        );

                                    const isStatus =
                                        from ===
                                        'status@broadcast';


                                    const messageContent =
                                        normalizeMessageContent(
                                            msg.message
                                        ) ||
                                        msg.message;

                                    if (
                                        !messageContent
                                    ) {
                                        return;
                                    }


                                    const type =
                                        Object.keys(
                                            messageContent
                                        )[0];


                                    const buttonMessage =
                                        {
                                            ...msg,
                                            message:
                                                messageContent
                                        };

                                    const buttonId =
                                        getButtonId(
                                            buttonMessage
                                        );

                                    const buttonCommand =
                                        autoDetectButtonCommand(
                                            buttonMessage
                                        );


                                    const text =
                                        (
                                            messageContent.conversation ||
                                            messageContent.extendedTextMessage?.text ||
                                            messageContent.imageMessage?.caption ||
                                            messageContent.videoMessage?.caption ||
                                            buttonCommand ||
                                            ''
                                        ).trim();


                                    /* =========================
                                       AUTOREAD
                                    ========================= */

                                    if (
                                        !isMe &&
                                        !isStatus
                                    ) {
                                        await handleAutoread(
                                            this.sock,
                                            msg
                                        );
                                    }


                                    /* =========================
                                       DUPLICATE PROTECTION
                                    ========================= */

                                    const msgId =
                                        msg.key.id;

                                    if (
                                        this.processedMessages.has(
                                            msgId
                                        )
                                    ) {
                                        return;
                                    }

                                    this.processedMessages.add(
                                        msgId
                                    );

                                    if (
                                        this.processedMessages.size >
                                        1000
                                    ) {
                                        this.processedMessages.delete(
                                            this.processedMessages
                                                .values()
                                                .next()
                                                .value
                                        );
                                    }


                                    /* =========================
                                       MESSAGE LOG
                                    ========================= */

                                    if (!isStatus) {

                                        const logEntry = {
                                            text,
                                            type
                                        };

                                        if (
                                            [
                                                'imageMessage',
                                                'videoMessage',
                                                'audioMessage'
                                            ].includes(
                                                type
                                            )
                                        ) {

                                            try {

                                                const mContent =
                                                    messageContent[
                                                        type
                                                    ];

                                                if (
                                                    mContent &&
                                                    (
                                                        mContent.directPath ||
                                                        mContent.url
                                                    )
                                                ) {

                                                    const stream =
                                                        await downloadContentFromMessage(
                                                            mContent,
                                                            type.replace(
                                                                'Message',
                                                                ''
                                                            )
                                                        );

                                                    let buffer =
                                                        Buffer.from([]);

                                                    for await (
                                                        const chunk
                                                        of stream
                                                    ) {
                                                        buffer =
                                                            Buffer.concat(
                                                                [
                                                                    buffer,
                                                                    chunk
                                                                ]
                                                            );
                                                    }

                                                    logEntry.buffer =
                                                        buffer;
                                                }

                                            } catch (e) {}
                                        }

                                        logEntry.pushName =
                                            msg.pushName ||
                                            'User';

                                        messageLogs[
                                            msgId
                                        ] =
                                            logEntry;

                                        if (
                                            Object.keys(
                                                messageLogs
                                            ).length >
                                            2000
                                        ) {
                                            delete messageLogs[
                                                Object.keys(
                                                    messageLogs
                                                )[0]
                                            ];
                                        }
                                    }


                                    /* =========================
                                       AUTO REACT
                                    ========================= */

                                    if (
                                        this.autoReact &&
                                        !isMe &&
                                        !isStatus
                                    ) {

                                        const emojis = [
                                            '❤️',
                                            '👍',
                                            '🔥',
                                            '👏',
                                            '😮',
                                            '😂',
                                            '🙌',
                                            '✨',
                                            '⭐',
                                            '✅',
                                            '🤖',
                                            '⚡',
                                            '🌟',
                                            '💯',
                                            '🌈',
                                            '💎',
                                            '👑',
                                            '🎉',
                                            '🧿',
                                            '🍀'
                                        ];

                                        const randomEmoji =
                                            emojis[
                                                Math.floor(
                                                    Math.random() *
                                                    emojis.length
                                                )
                                            ];

                                        try {

                                            await this.sock.sendMessage(
                                                from,
                                                {
                                                    react: {
                                                        text:
                                                            randomEmoji,
                                                        key:
                                                            msg.key
                                                    }
                                                }
                                            );

                                        } catch (e) {}
                                    }


                                    /* =========================
                                       AUTO TYPING / RECORDING / CHATBOT
                                    ========================= */

                                    if (
                                        !isMe &&
                                        !isStatus &&
                                        text &&
                                        !text.startsWith('.')
                                    ) {

                                        const featureTasks =
                                            [];

                                        if (
                                            isAutotypingEnabled()
                                        ) {
                                            featureTasks.push(
                                                handleAutotypingForMessage(
                                                    this.sock,
                                                    from,
                                                    text
                                                )
                                            );
                                        }

                                        if (
                                            isAutorecordingEnabled()
                                        ) {
                                            featureTasks.push(
                                                handleAutorecordingForMessage(
                                                    this.sock,
                                                    from,
                                                    text
                                                )
                                            );
                                        }

                                        if (
                                            typeof handleChatbotMessage ===
                                            'function'
                                        ) {
                                            featureTasks.push(
                                                handleChatbotMessage(
                                                    this.sock,
                                                    from,
                                                    msg
                                                )
                                            );
                                        }

                                        if (
                                            featureTasks.length
                                        ) {
                                            await Promise.allSettled(
                                                featureTasks
                                            );
                                        }
                                    }


                                    /* =========================
                                       AI AUTO REPLY
                                    ========================= */

                                    if (
                                        this.aiEnabled &&
                                        !isMe &&
                                        !isGroup &&
                                        text &&
                                        !text.startsWith('.')
                                    ) {

                                        try {

                                            const aiResponse =
                                                await this.getAIResponse(
                                                    from,
                                                    text
                                                );

                                            await this.sock.sendMessage(
                                                from,
                                                {
                                                    text:
                                                        aiResponse
                                                },
                                                {
                                                    quoted:
                                                        msg
                                                }
                                            );

                                        } catch (e) {

                                            console.error(
                                                'AI Auto-Reply Error:',
                                                e
                                            );
                                        }
                                    }


                                    /* =========================
                                       STATUS
                                    ========================= */

                                    if (
                                        isStatus &&
                                        !isMe
                                    ) {

                                        const statusHandler =
                                            handleStatusUpdate ||
                                            handleAutoStatus;

                                        if (
                                            typeof statusHandler ===
                                            'function'
                                        ) {

                                            await statusHandler(
                                                this.sock,
                                                m,
                                                botData,
                                                this.userId
                                            );
                                        }

                                        return;
                                    }


                                    /* =========================
                                       AUTHORIZATION
                                    ========================= */

                                    const botNumber =
                                        jidNormalizedUser(
                                            this.sock.user.id
                                        );

                                    const botNumberClean =
                                        botNumber.split('@')[0];

                                    const sender =
                                        String(
                                            msg.key.participant ||
                                            from
                                        );

                                    const senderClean =
                                        sender.split('@')[0];

                                    const normalizeNumber =
                                        (value) =>
                                            String(
                                                value || ''
                                            ).replace(
                                                /\D/g,
                                                ''
                                            );

                                    const senderNumber =
                                        normalizeNumber(
                                            senderClean
                                        );

                                    const botNumberNumber =
                                        normalizeNumber(
                                            botNumberClean
                                        );

                                    const ownerNumbers =
                                        String(
                                            settings.ownerNumber ||
                                            ''
                                        )
                                            .split(',')
                                            .map(
                                                normalizeNumber
                                            )
                                            .filter(Boolean);

                                    const isOwner =
                                        isMe ||
                                        ownerNumbers.includes(
                                            senderNumber
                                        ) ||
                                        senderNumber ===
                                            botNumberNumber;

                                    const isSudoUser =
                                        await isSudo(
                                            sender
                                        ).catch(
                                            () => false
                                        );

                                    const isSessionUser =
                                        senderNumber ===
                                            normalizeNumber(
                                                this.phoneNumber ||
                                                ''
                                            ) ||
                                        senderNumber ===
                                            normalizeNumber(
                                                this.userId ||
                                                ''
                                            ) ||
                                        senderNumber ===
                                            botNumberNumber;

                                    const isAuthorized =
                                        this.isPublic ||
                                        isOwner ||
                                        isSudoUser ||
                                        isSessionUser ||
                                        isMe;


                                    /* =========================
                                       PRIVATE MODE
                                    ========================= */

                                    if (
                                        !this.isPublic &&
                                        isGroup
                                    ) {
                                        return;
                                    }


                                    let isAdmin =
                                        isOwner;

                                    if (
                                        !isAdmin &&
                                        isGroup
                                    ) {

                                        try {

                                            const groupMetadata =
                                                await this.sock.groupMetadata(
                                                    from
                                                );

                                            const participant =
                                                groupMetadata.participants.find(
                                                    p =>
                                                        p.id ===
                                                        sender
                                                );

                                            isAdmin =
                                                participant &&
                                                (
                                                    participant.admin ===
                                                        'admin' ||
                                                    participant.admin ===
                                                        'superadmin'
                                                );

                                        } catch (e) {
                                            isAdmin =
                                                false;
                                        }
                                    }


                                    /* =========================
                                       ANTI STATUS
                                    ========================= */

                                    if (
                                        isGroup &&
                                        botData.antiStatusGroups &&
                                        botData.antiStatusGroups[
                                            from
                                        ] &&
                                        !isAdmin
                                    ) {

                                        const isStatusMsg =
                                            msg.message
                                                ?.protocolMessage
                                                ?.type === 0 ||
                                            msg.message
                                                ?.viewOnceMessage ||
                                            msg.message
                                                ?.viewOnceMessageV2 ||
                                            msg.message
                                                ?.viewOnceMessageV2Extension ||
                                            (
                                                text &&
                                                (
                                                    text.includes(
                                                        'whatsapp.com/channel/'
                                                    ) ||
                                                    text.includes(
                                                        'status@broadcast'
                                                    )
                                                )
                                            );

                                        if (
                                            msg.message
                                                ?.forwardingScore >
                                                0 ||
                                            isStatusMsg
                                        ) {

                                            try {

                                                await this.sock.sendMessage(
                                                    from,
                                                    {
                                                        delete:
                                                            msg.key
                                                    }
                                                );

                                                return;

                                            } catch (e) {}
                                        }
                                    }


                                    /* =========================
                                       ANTILINK
                                    ========================= */

                                    if (
                                        isGroup &&
                                        botData.antilinkGroups[
                                            from
                                        ] &&
                                        !isAdmin
                                    ) {

                                        const linkPatterns = [
                                            /chat.whatsapp.com\//i,
                                            /http:\/\//i,
                                            /https:\/\//i,
                                            /www\./i,
                                            /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i
                                        ];

                                        if (
                                            linkPatterns.some(
                                                pattern =>
                                                    pattern.test(
                                                        text
                                                    )
                                            )
                                        ) {

                                            try {

                                                const mode =
                                                    botData
                                                        .antilinkGroups[
                                                            from
                                                        ];

                                                await this.sock.sendMessage(
                                                    from,
                                                    {
                                                        delete:
                                                            msg.key
                                                    }
                                                );

                                                if (
                                                    mode ===
                                                    'kick'
                                                ) {
                                                    await this.sock.groupParticipantsUpdate(
                                                        from,
                                                        [
                                                            sender
                                                        ],
                                                        'remove'
                                                    );
                                                }

                                            } catch (e) {}

                                            return;
                                        }
                                    }


                                    /* =========================
                                       GHOST MODE
                                    ========================= */

                                    if (
                                        this.ghostMode &&
                                        !isOwner &&
                                        !isSessionUser
                                    ) {
                                        return;
                                    }


                                    /* =================================================
                                       ONLY .MODE COMMAND
                                    ================================================= */

                                    const commandNameForGuard =
                                        text.startsWith('.')
                                            ? text
                                                .toLowerCase()
                                                .slice(1)
                                                .split(/\s+/)[0]
                                            : '';

                                    const isModeCommand =
                                        commandNameForGuard ===
                                        'mode';

                                    const canUseModeCommand =
                                        isOwner ||
                                        isSudoUser ||
                                        isMe;


                                    if (
                                        !this.isPublic &&
                                        !isAuthorized &&
                                        !(
                                            isModeCommand &&
                                            canUseModeCommand
                                        )
                                    ) {
                                        return;
                                    }


                                    /* =========================
                                       BUTTON HANDLER
                                    ========================= */

                                    if (
                                        isButtonResponse(
                                            buttonMessage
                                        ) &&
                                        buttonId &&
                                        !isCommandId(
                                            buttonId
                                        )
                                    ) {

                                        const buttonHandlers =
                                            await buttonHandlersPromise;

                                        const handled =
                                            await executeButtonHandler(
                                                buttonId,
                                                this.sock,
                                                from,
                                                msg,
                                                buttonHandlers
                                            );

                                        if (handled) {
                                            return;
                                        }
                                    }


                                    /* =================================================
                                       COMMAND PROCESSING
                                    ================================================= */

                                    if (
                                        !text.startsWith('.')
                                    ) {
                                        return;
                                    }

                                    const parts =
                                        text.trim()
                                            .split(/\s+/);

                                    const commandName =
                                        parts[0]
                                            .slice(1)
                                            .toLowerCase();

                                    const args =
                                        parts.slice(1);

                                    const q =
                                        args.join(' ');


                                    /* =================================================
                                       MODE COMMAND
                                    ================================================= */

                                    if (
                                        commandName ===
                                        'mode'
                                    ) {

                                        const allowed =
                                            isOwner ||
                                            isSudoUser ||
                                            isMe;

                                        if (!allowed) {

                                            await this.sock.sendMessage(
                                                from,
                                                {
                                                    text:
                                                        '❌ Only owner or sudo can change bot mode.'
                                                },
                                                {
                                                    quoted:
                                                        msg
                                                }
                                            );

                                            return;
                                        }


                                        /*
                                         * .mode
                                         * SHOW CURRENT MODE
                                         */

                                        if (
                                            args.length ===
                                            0
                                        ) {

                                            const currentMode =
                                                this.isPublic
                                                    ? 'PUBLIC'
                                                    : 'PRIVATE';

                                            await this.sock.sendMessage(
                                                from,
                                                {
                                                    text:
                                                        `🤖 *BOT MODE*\n\n` +
                                                        `Current mode: *${currentMode}*\n\n` +
                                                        `Usage:\n` +
                                                        `• .mode public\n` +
                                                        `• .mode private`
                                                },
                                                {
                                                    quoted:
                                                        msg
                                                }
                                            );

                                            return;
                                        }


                                        const requestedMode =
                                            String(
                                                args[0] ||
                                                ''
                                            ).toLowerCase();


                                        /*
                                         * PUBLIC
                                         */

                                        if (
                                            requestedMode ===
                                            'public'
                                        ) {

                                            this.isPublic =
                                                true;

                                            if (
                                                !botData
                                                    .statusSettings[
                                                        this.userId
                                                    ]
                                            ) {
                                                botData
                                                    .statusSettings[
                                                        this.userId
                                                    ] = {};
                                            }

                                            botData
                                                .statusSettings[
                                                    this.userId
                                                ]
                                                .isPublic =
                                                true;

                                            saveBotData();

                                            await this.sock.sendMessage(
                                                from,
                                                {
                                                    text:
                                                        '✅ *Public mode ON*\n\nBot will respond normally to users.'
                                                },
                                                {
                                                    quoted:
                                                        msg
                                                }
                                            );

                                            return;
                                        }


                                        /*
                                         * PRIVATE
                                         */

                                        if (
                                            requestedMode ===
                                            'private'
                                        ) {

                                            this.isPublic =
                                                false;

                                            if (
                                                !botData
                                                    .statusSettings[
                                                        this.userId
                                                    ]
                                            ) {
                                                botData
                                                    .statusSettings[
                                                        this.userId
                                                    ] = {};
                                            }

                                            botData
                                                .statusSettings[
                                                    this.userId
                                                ]
                                                .isPublic =
                                                false;

                                            saveBotData();

                                            await this.sock.sendMessage(
                                                from,
                                                {
                                                    text:
                                                        '🔒 *Private mode ON*\n\nBot will only respond to the owner/sudo in private chats.'
                                                },
                                                {
                                                    quoted:
                                                        msg
                                                }
                                            );

                                            return;
                                        }


                                        /*
                                         * INVALID MODE
                                         */

                                        await this.sock.sendMessage(
                                            from,
                                            {
                                                text:
                                                    '⚠️ *Invalid mode*\n\nUse only:\n• `.mode public`\n• `.mode private`'
                                            },
                                            {
                                                quoted:
                                                    msg
                                            }
                                        );

                                        return;
                                    }


                                    /*
                                     * IMPORTANT:
                                     * .public and .private are no longer
                                     * special commands.
                                     *
                                     * They are NOT handled here.
                                     */


                                    /* =========================
                                       NORMAL COMMANDS
                                    ========================= */

                                    const commandHandler =
                                        commands[
                                            commandName
                                        ];

                                    if (
                                        typeof commandHandler ===
                                        'function'
                                    ) {

                                        try {

                                            await invokeCommand(
                                                commandHandler,
                                                this.sock,
                                                from,
                                                buttonMessage,
                                                isAdmin,
                                                q,
                                                this,
                                                args,
                                                botData,
                                                saveBotData,
                                                this.userId
                                            );

                                        } catch (
                                            handlerError
                                        ) {

                                            this.sendLog(
                                                `Command error (${commandName}): ` +
                                                (
                                                    handlerError?.message ||
                                                    String(
                                                        handlerError
                                                    )
                                                ),
                                                'error'
                                            );
                                        }
                                    }

                                } catch (e) {

                                    console.error(
                                        'Message Processing Error:',
                                        e
                                    );
                                }
                            }
                        )
                    );
                }
            );


            /* =================================================
               CONNECTION UPDATE
            ================================================= */

            this.sock.ev.on(
                'connection.update',
                async (update) => {

                    if (
                        generation !==
                            this.connectionGeneration ||
                        this.sock !==
                            activeSocket
                    ) {
                        return;
                    }

                    const {
                        connection,
                        lastDisconnect,
                        qr
                    } = update;


                    if (qr) {

                        const socketId =
                            userSockets[
                                this.userId
                            ];

                        if (socketId) {
                            io.to(socketId).emit(
                                'qr',
                                qr
                            );
                        }
                    }


                    if (
                        connection ===
                        'close'
                    ) {

                        const disconnectError =
                            lastDisconnect?.error;

                        const shouldReconnect =
                            disconnectError
                                ?.output
                                ?.statusCode !==
                            DisconnectReason.loggedOut;

                        this.isConnected =
                            false;

                        this.isInitializing =
                            false;

                        this.sendLog(
                            `Connection closed. Reconnecting: ${shouldReconnect}`,
                            'warning'
                        );

                        this.sendConnectionStatus();

                        const statusCode =
                            disconnectError
                                ?.output
                                ?.statusCode;


                        if (
                            statusCode ===
                                DisconnectReason.loggedOut ||
                            statusCode === 401
                        ) {

                            this.sendLog(
                                'Session expired or logged out. Clearing auth data...',
                                'error'
                            );

                            try {

                                if (
                                    fs.existsSync(
                                        this.authPath
                                    )
                                ) {

                                    const backupPath =
                                        `${this.authPath}_backup_${Date.now()}`;

                                    fs.moveSync(
                                        this.authPath,
                                        backupPath
                                    );

                                    this.sendLog(
                                        `Corrupted session backed up to ${backupPath}`,
                                        'info'
                                    );
                                }

                            } catch (e) {

                                if (
                                    fs.existsSync(
                                        this.authPath
                                    )
                                ) {
                                    fs.removeSync(
                                        this.authPath
                                    );
                                }
                            }

                            delete sessions[
                                this.userId
                            ];

                            this.sendConnectionStatus();

                        } else if (
                            statusCode ===
                                DisconnectReason.restartRequired ||
                            statusCode ===
                                DisconnectReason.connectionLost ||
                            statusCode === 428
                        ) {

                            this.sendLog(
                                `Connection issue (${statusCode}). Restarting in 3s...`,
                                'warning'
                            );

                            this.reconnectTimer =
                                setTimeout(
                                    () => {

                                        this.reconnectTimer =
                                            null;

                                        this.initialize();
                                    },
                                    3000
                                );

                        } else if (
                            statusCode ===
                            515
                        ) {

                            this.sendLog(
                                'Stream error. Reconnecting immediately...',
                                'warning'
                            );

                            this.initialize();

                        } else {

                            this.sendLog(
                                `Connection closed (${statusCode}). Reconnecting in 5s...`,
                                'info'
                            );

                            this.reconnectTimer =
                                setTimeout(
                                    () => {

                                        this.reconnectTimer =
                                            null;

                                        this.initialize();
                                    },
                                    5000
                                );
                        }

                    } else if (
                        connection ===
                        'open'
                    ) {

                        this.isConnected =
                            true;

                        this.isInitializing =
                            false;

                        this.sendLog(
                            'Connected successfully! ✅',
                            'success'
                        );

                        this.sendConnectionStatus();


                        const botNumber =
                            jidNormalizedUser(
                                this.sock.user.id
                            );

                        const botNumberClean =
                            botNumber.split(
                                '@'
                            )[0];

                        this.phoneNumber =
                            botNumberClean;

                        try {
                            await handleConnection(
                                this.sock,
                                {
                                    success: (message) =>
                                        this.sendLog(message, 'success'),
                                    warning: (message) =>
                                        this.sendLog(message, 'warning')
                                }
                            );
                        } catch (error) {
                            this.sendLog(
                                `Connection notification failed: ${error.message}`,
                                'warning'
                            );
                        }

                        await this.sendPairingCredentials();


                        if (
                            !Array.isArray(
                                settings.connectedBots
                            )
                        ) {
                            settings.connectedBots =
                                [];
                        }

                        if (
                            !settings.connectedBots.includes(
                                botNumberClean
                            )
                        ) {
                            settings.connectedBots.push(
                                botNumberClean
                            );
                        }


                        const botName =
                            botData.userNames[
                                this.userId
                            ] ||
                            this.sock.user?.name ||
                            this.userId;

                        this.sendLog(
                            `Bot ${botName} is online.`,
                            'success'
                        );

                        this.lastConnectMessageTime =
                            Date.now();
                    }
                }
            );

        } catch (err) {

            this.isInitializing =
                false;

            this.sendLog(
                `Initialization failed: ${err.message}. Retrying in 10s...`,
                'error'
            );

            if (
                generation ===
                this.connectionGeneration
            ) {

                this.reconnectTimer =
                    setTimeout(
                        () => {

                            this.reconnectTimer =
                                null;

                            this.initialize();
                        },
                        10000
                    );
            }
        }
    }
}


/* =========================================================
   LOAD EXISTING SESSIONS
========================================================= */

async function loadExistingSessions() {

    try {

        const authDirs =
            await fs.readdir(
                AUTH_DIR
            );

        for (
            const userId
            of authDirs
        ) {

            const authPath =
                path.join(
                    AUTH_DIR,
                    userId
                );

            const stats =
                await fs.stat(
                    authPath
                );

            if (
                stats.isDirectory()
            ) {

                const credsFile =
                    path.join(
                        authPath,
                        'creds.json'
                    );

                if (
                    fs.existsSync(
                        credsFile
                    )
                ) {

                    console.log(
                        `[System] Found existing session for: ${userId}. Initializing...`
                    );

                    if (
                        !sessions[userId]
                    ) {

                        sessions[userId] =
                            new BotSession(
                                userId
                            );

                        sessions[userId]
                            .initialize()
                            .catch(
                                err => {
                                    console.error(
                                        `[System] Failed to auto-initialize session ${userId}:`,
                                        err.message
                                    );
                                }
                            );
                    }
                }
            }
        }

    } catch (err) {

        console.error(
            '[System] Error loading existing sessions:',
            err.message
        );
    }
}


/* =========================================================
   SOCKET.IO
========================================================= */

io.on(
    'connection',
    (socket) => {

        /* =========================
           ADMIN AUTH
        ========================= */

        socket.on(
            'admin-auth',
            (password) => {

                const adminPass =
                    process.env.ADMIN_PASSWORD ||
                    'MICKEY_TECH';

                if (
                    password ===
                    adminPass
                ) {

                    socket.authenticated =
                        true;

                    socket.emit(
                        'admin-auth-success'
                    );

                } else {

                    socket.emit(
                        'admin-auth-fail'
                    );
                }
            }
        );


        /* =========================
           SET USER
        ========================= */

        socket.on(
            'set-user',
            (userId) => {

                userSockets[userId] =
                    socket.id;

                if (
                    !sessions[userId]
                ) {
                    sessions[userId] =
                        new BotSession(
                            userId
                        );
                }

                sessions[userId]
                    .sendConnectionStatus();

                socket.emit('bot-state', {
                    bots: getDashboardBotState(),
                    active: Object.values(sessions).filter((session) => session.isConnected).length
                });
            }
        );

        socket.on(
            'request-bot-state',
            () => {
                socket.emit('bot-state', {
                    bots: getDashboardBotState(),
                    active: Object.values(sessions).filter((session) => session.isConnected).length
                });
            }
        );

        socket.on(
            'update-bot-settings',
            ({ userId, settings: incomingSettings } = {}) => {
                if (!userId || !incomingSettings || typeof incomingSettings !== 'object') {
                    return;
                }

                if (!botData.statusSettings[userId]) {
                    botData.statusSettings[userId] = {};
                }

                const allowedKeys = [
                    'autoReply',
                    'readReceipts',
                    'typingIndicator',
                    'autoReconnect',
                    'antiSpam',
                    'logMessages',
                    'prefix',
                    'isPublic'
                ];

                for (const key of allowedKeys) {
                    if (Object.prototype.hasOwnProperty.call(incomingSettings, key)) {
                        botData.statusSettings[userId][key] =
                            key === 'prefix'
                                ? String(incomingSettings[key] || '.').slice(0, 3)
                                : Boolean(incomingSettings[key]);
                    }
                }

                saveBotData();
                socket.emit('bot-settings-saved', {
                    userId,
                    settings: botData.statusSettings[userId]
                });
                emitDashboardBotState();
            }
        );


        /* =========================
           PAIR REQUEST
        ========================= */

        socket.on(
            'pair-request',
            async ({
                userId,
                number
            }) => {

                if (
                    !sessions[userId]
                ) {
                    sessions[userId] =
                        new BotSession(
                            userId
                        );
                }

                if (
                    !botData.statusSettings[
                        userId
                    ]
                ) {

                    botData.statusSettings[
                        userId
                    ] = {
                        autoStatus: false,
                        autoSeen: false,
                        autoLike: false,
                        autoDownload: false,
                        autoReact: false,
                        isPublic: true
                    };

                    saveBotData();
                }

                sessions[userId].tgChatId =
                    null;

                await sessions[userId]
                    .initialize(number);
            }
        );


        /* =========================
           BROADCAST
        ========================= */

        socket.on(
            'broadcast',
            async ({
                message
            }) => {

                if (
                    !socket.authenticated
                ) {
                    return;
                }

                const activeBots =
                    getAllActiveSockets();

                let totalSent = 0;
                let totalChats = 0;

                for (
                    const bot
                    of activeBots
                ) {

                    try {

                        const allChats =
                            Object.keys(
                                bot.sock.chats || {}
                            );

                        const personalChats =
                            allChats.filter(
                                jid =>
                                    typeof jid ===
                                        'string' &&
                                    (
                                        jid.endsWith(
                                            '@s.whatsapp.net'
                                        ) ||
                                        jid.endsWith(
                                            '@g.us'
                                        )
                                    )
                            );

                        for (
                            const jid
                            of personalChats
                        ) {

                            try {

                                await bot.sock.sendMessage(
                                    jid,
                                    {
                                        text:
                                            `📢 *BROADCAST MESSAGE* 📢\n\n` +
                                            `${message}\n\n` +
                                            `_From: ${botOwnerName} Bot Admin_`
                                    }
                                );

                                totalSent++;

                            } catch (e) {}
                        }

                        totalChats +=
                            personalChats.length;

                    } catch (e) {

                        console.error(
                            'Broadcast error:',
                            e.message
                        );
                    }
                }


                if (
                    !Array.isArray(
                        botData.broadcastHistory
                    )
                ) {
                    botData.broadcastHistory =
                        [];
                }

                botData.broadcastHistory.unshift(
                    {
                        message,
                        timestamp:
                            new Date()
                                .toISOString(),
                        totalSent,
                        totalBots:
                            activeBots.length
                    }
                );

                if (
                    botData.broadcastHistory
                        .length > 50
                ) {
                    botData.broadcastHistory.pop();
                }

                saveBotData();

                socket.emit(
                    'broadcast-result',
                    {
                        totalSent,
                        totalBots:
                            activeBots.length,
                        totalChats
                    }
                );
            }
        );


        /* =========================
           STOP BOT
        ========================= */

        socket.on(
            'stop-bot',
            async ({
                sessionId
            }) => {

                if (
                    !socket.authenticated
                ) {
                    return;
                }

                if (
                    sessions[sessionId] &&
                    sessions[sessionId].sock
                ) {

                    try {

                        await sessions[
                            sessionId
                        ].sock.logout();

                        sessions[
                            sessionId
                        ].isConnected =
                            false;

                        delete sessions[
                            sessionId
                        ];

                        socket.emit(
                            'bot-stopped',
                            {
                                sessionId,
                                success:
                                    true
                            }
                        );

                    } catch (e) {

                        socket.emit(
                            'bot-stopped',
                            {
                                sessionId,
                                success:
                                    false,
                                error:
                                    e.message
                            }
                        );
                    }
                }
            }
        );


        /* =========================
           STOP ALL BOTS
        ========================= */

        socket.on(
            'stop-all-bots',
            async () => {

                if (
                    !socket.authenticated
                ) {
                    return;
                }

                let stopped = 0;

                for (
                    const [
                        sessionId,
                        session
                    ]
                    of Object.entries(
                        sessions
                    )
                ) {

                    try {

                        if (
                            session.sock
                        ) {

                            await session.sock.logout();

                            session.isConnected =
                                false;

                            stopped++;
                        }

                    } catch (e) {}
                }

                socket.emit(
                    'all-bots-stopped',
                    {
                        stopped
                    }
                );
            }
        );


        /* =========================
           GET BOTS
        ========================= */

        socket.on(
            'get-bots-list',
            () => {

                if (
                    !socket.authenticated
                ) {
                    return;
                }

                const bots = [];

                for (
                    const [
                        sessionId,
                        session
                    ]
                    of Object.entries(
                        sessions
                    )
                ) {

                    if (
                        session.sock &&
                        session.sock.user
                    ) {

                        bots.push({
                            sessionId,
                            phoneNumber:
                                session.phoneNumber,
                            isConnected:
                                session.isConnected,
                            userName:
                                botData.userNames[
                                    sessionId
                                ] ||
                                'Unknown'
                        });
                    }
                }

                socket.emit(
                    'bots-list',
                    bots
                );
            }
        );


        /* =========================
           BROADCAST HISTORY
        ========================= */

        socket.on(
            'get-broadcast-history',
            () => {

                if (
                    !socket.authenticated
                ) {
                    return;
                }

                socket.emit(
                    'broadcast-history',
                    botData
                        .broadcastHistory ||
                        []
                );
            }
        );


        /* =========================
           DISCONNECT
        ========================= */

        socket.on(
            'disconnect',
            () => {

                for (
                    const [
                        userId,
                        socketId
                    ]
                    of Object.entries(
                        userSockets
                    )
                ) {

                    if (
                        socketId ===
                        socket.id
                    ) {

                        delete userSockets[
                            userId
                        ];

                        break;
                    }
                }
            }
        );
    }
);


/* =========================================================
   SERVER START
========================================================= */

const HOST =
    process.env.HOST ||
    '0.0.0.0';

const PORT =
    Number(
        process.env.PORT ||
        25569
    );


server.listen(
    PORT,
    HOST,
    async () => {

        const displayHost =
            process.env.SERVER_IP ||
            process.env.P_SERVER_IP ||
            (
                HOST ===
                '0.0.0.0'
                    ? 'localhost'
                    : HOST
            );

        const displayPort =
            process.env.SERVER_PORT ||
            process.env.P_SERVER_PORT ||
            PORT;

        console.log(
            `🌑 ${botBrandName} v${settings.version} Server running on ${HOST}:${PORT}`
        );

        console.log(
            `📡 Total commands loaded: ${Object.keys(commands).length}`
        );

        console.log(
            `🌐 Web Dashboard: http://${displayHost}:${displayPort}`
        );

        await loadExistingSessions();
    }
);