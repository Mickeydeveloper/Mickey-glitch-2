const fs = require('fs-extra');
const path = require('path');
const settings = require('../settings');
const { AIRich, createCalendarUrl, getContext, normalizeArgs } = require('./messageBuilder');

const WELCOME_FILE = path.join(__dirname, '../data/welcome_settings.json');
const GOODBYE_FILE = path.join(__dirname, '../data/goodbye_settings.json');
const ANTILINK_FILE = path.join(__dirname, '../data/antilink_settings.json');

// Helper to ensure data directory exists
const ensureDataDir = () => {
    fs.ensureDirSync(path.join(__dirname, '../data'));
};

// Welcome Functions
async function addWelcome(chatId, status, message) {
    ensureDataDir();
    let data = {};
    if (fs.existsSync(WELCOME_FILE)) data = fs.readJsonSync(WELCOME_FILE);
    data[chatId] = { status, message };
    fs.writeJsonSync(WELCOME_FILE, data);
}

async function delWelcome(chatId) {
    if (!fs.existsSync(WELCOME_FILE)) return;
    let data = fs.readJsonSync(WELCOME_FILE);
    delete data[chatId];
    fs.writeJsonSync(WELCOME_FILE, data);
}

async function isWelcomeOn(chatId) {
    if (!fs.existsSync(WELCOME_FILE)) return false;
    let data = fs.readJsonSync(WELCOME_FILE);
    return data[chatId] ? data[chatId].status : false;
}

async function getWelcomeMessage(chatId) {
    if (!fs.existsSync(WELCOME_FILE)) return null;
    let data = fs.readJsonSync(WELCOME_FILE);
    return data[chatId] ? data[chatId].message : null;
}

// Goodbye Functions
async function addGoodbye(chatId, status, message) {
    ensureDataDir();
    let data = {};
    if (fs.existsSync(GOODBYE_FILE)) data = fs.readJsonSync(GOODBYE_FILE);
    data[chatId] = { status, message };
    fs.writeJsonSync(GOODBYE_FILE, data);
}

async function delGoodBye(chatId) {
    if (!fs.existsSync(GOODBYE_FILE)) return;
    let data = fs.readJsonSync(GOODBYE_FILE);
    delete data[chatId];
    fs.writeJsonSync(GOODBYE_FILE, data);
}

async function isGoodByeOn(chatId) {
    if (!fs.existsSync(GOODBYE_FILE)) return false;
    let data = fs.readJsonSync(GOODBYE_FILE);
    return data[chatId] ? data[chatId].status : false;
}

async function getGoodbyeMessage(chatId) {
    if (!fs.existsSync(GOODBYE_FILE)) return null;
    let data = fs.readJsonSync(GOODBYE_FILE);
    return data[chatId] ? data[chatId].message : null;
}

// Antilink Functions
async function getAntilink(chatId) {
    if (!fs.existsSync(ANTILINK_FILE)) return null;
    let data = fs.readJsonSync(ANTILINK_FILE);
    return data[chatId] || null;
}

// Sudo check
async function isSudo(sender) {
    // This is a placeholder. In a real bot, you'd check against a list of sudo numbers.
    // For now, we'll assume only the bot owner is sudo.
    return false; 
}

module.exports = {
    settings,
    AIRich,
    createCalendarUrl,
    getContext,
    normalizeArgs,
    addWelcome,
    delWelcome,
    isWelcomeOn,
    getWelcomeMessage,
    addGoodbye,
    delGoodBye,
    isGoodByeOn,
    getGoodbyeMessage,
    getAntilink,
    isSudo,
    incrementWarningCount: async () => 1, // Placeholders to prevent crashes
    resetWarningCount: async () => {},
};
