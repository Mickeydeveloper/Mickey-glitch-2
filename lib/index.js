const fs = require('fs-extra');
const path = require('path');
const settings = require('../settings');
const { AIRich, createCalendarUrl, getContext, normalizeArgs } = require('./messageBuilder');

const WELCOME_FILE = path.join(__dirname, '../data/welcome_settings.json');
const GOODBYE_FILE = path.join(__dirname, '../data/goodbye_settings.json');
const ANTILINK_FILE = path.join(__dirname, '../data/antilink_settings.json');
const SUDO_FILE = path.join(__dirname, '../data/sudo.json');

const ensureDataDir = () => {
    fs.ensureDirSync(path.join(__dirname, '../data'));
};

const normalizeJid = (jid) => {
    if (!jid || typeof jid !== 'string') return null;
    const trimmed = jid.trim();
    if (!trimmed) return null;
    return trimmed.includes('@') ? trimmed : `${trimmed.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
};

const readSudoList = () => {
    ensureDataDir();
    if (!fs.existsSync(SUDO_FILE)) return [];
    try {
        const parsed = fs.readJsonSync(SUDO_FILE);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
};

const writeSudoList = (list) => {
    ensureDataDir();
    fs.writeJsonSync(SUDO_FILE, list);
};

async function addSudo(jid) {
    const normalized = normalizeJid(jid);
    if (!normalized) return false;
    const list = readSudoList();
    if (!list.includes(normalized)) {
        list.push(normalized);
        writeSudoList(list);
    }
    return true;
}

async function removeSudo(jid) {
    const normalized = normalizeJid(jid);
    if (!normalized) return false;
    const list = readSudoList();
    const next = list.filter(item => item !== normalized);
    writeSudoList(next);
    return true;
}

async function getSudoList() {
    return readSudoList();
}

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

async function getAntilink(chatId) {
    if (!fs.existsSync(ANTILINK_FILE)) return null;
    let data = fs.readJsonSync(ANTILINK_FILE);
    return data[chatId] || null;
}

async function isSudo(sender) {
    const normalized = normalizeJid(sender);
    if (!normalized) return false;
    const list = readSudoList();
    return list.includes(normalized);
}

module.exports = {
    settings,
    AIRich,
    createCalendarUrl,
    getContext,
    normalizeArgs,
    addSudo,
    removeSudo,
    getSudoList,
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
    incrementWarningCount: async () => 1,
    resetWarningCount: async () => {},
};
