const fs = require('fs-extra');
const path = require('path');
const settings = require('../settings');
const { AIRich, createCalendarUrl, getContext, normalizeArgs } = require('./messageBuilder');

const WELCOME_FILE = path.join(__dirname, '../data/welcome_settings.json');
const GOODBYE_FILE = path.join(__dirname, '../data/goodbye_settings.json');
const ANTILINK_FILE = path.join(__dirname, '../data/antilink_settings.json');
const ANTIBADWORD_FILE = path.join(__dirname, '../data/antibadword_settings.json');
const ANTISTICKER_FILE = path.join(__dirname, '../data/antisticker_settings.json');
const ANTITAG_FILE = path.join(__dirname, '../data/antitag_settings.json');
const WARNINGS_FILE = path.join(__dirname, '../data/warnings.json');
const SUDO_FILE = path.join(__dirname, '../data/sudo.json');

const ensureDataDir = () => {
    fs.ensureDirSync(path.join(__dirname, '../data'));
};

const readJsonFile = (filePath, fallback = {}) => {
    ensureDataDir();
    if (!fs.existsSync(filePath)) return fallback;
    try {
        const parsed = fs.readJsonSync(filePath);
        return parsed ?? fallback;
    } catch (error) {
        return fallback;
    }
};

const writeJsonFile = (filePath, data) => {
    ensureDataDir();
    fs.writeJsonSync(filePath, data, { spaces: 2 });
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

async function setAntilink(chatId, mode = 'on', action = 'delete') {
    const normalizedChatId = String(chatId || '').trim();
    if (!normalizedChatId) return false;
    const data = readJsonFile(ANTILINK_FILE, {});
    data[normalizedChatId] = { enabled: true, mode, action };
    writeJsonFile(ANTILINK_FILE, data);
    return true;
}

async function getAntilink(chatId) {
    if (!fs.existsSync(ANTILINK_FILE)) return null;
    const data = readJsonFile(ANTILINK_FILE, {});
    const entry = data[String(chatId || '').trim()];
    if (!entry) return null;
    return { enabled: Boolean(entry.enabled ?? true), mode: entry.mode || 'on', action: entry.action || 'delete', ...entry };
}

async function removeAntilink(chatId) {
    const normalizedChatId = String(chatId || '').trim();
    if (!normalizedChatId) return false;
    const data = readJsonFile(ANTILINK_FILE, {});
    if (!data[normalizedChatId]) return false;
    delete data[normalizedChatId];
    writeJsonFile(ANTILINK_FILE, data);
    return true;
}

async function setAntiBadword(chatId, mode = 'on', action = 'delete') {
    const normalizedChatId = String(chatId || '').trim();
    if (!normalizedChatId) return false;
    const data = readJsonFile(ANTIBADWORD_FILE, {});
    data[normalizedChatId] = { enabled: true, mode, action };
    writeJsonFile(ANTIBADWORD_FILE, data);
    return true;
}

async function getAntiBadword(chatId) {
    const data = readJsonFile(ANTIBADWORD_FILE, {});
    const entry = data[String(chatId || '').trim()];
    if (!entry) return null;
    return { enabled: Boolean(entry.enabled ?? true), mode: entry.mode || 'on', action: entry.action || 'delete', ...entry };
}

async function removeAntiBadword(chatId) {
    const normalizedChatId = String(chatId || '').trim();
    if (!normalizedChatId) return false;
    const data = readJsonFile(ANTIBADWORD_FILE, {});
    if (!data[normalizedChatId]) return false;
    delete data[normalizedChatId];
    writeJsonFile(ANTIBADWORD_FILE, data);
    return true;
}

async function setAntisticker(chatId, value = true) {
    const normalizedChatId = String(chatId || '').trim();
    if (!normalizedChatId) return false;
    const data = readJsonFile(ANTISTICKER_FILE, {});
    data[normalizedChatId] = { enabled: Boolean(value) };
    writeJsonFile(ANTISTICKER_FILE, data);
    return true;
}

async function getAntisticker(chatId) {
    const data = readJsonFile(ANTISTICKER_FILE, {});
    const entry = data[String(chatId || '').trim()];
    return entry ? { enabled: Boolean(entry.enabled), ...entry } : { enabled: false };
}

async function removeAntisticker(chatId) {
    const normalizedChatId = String(chatId || '').trim();
    if (!normalizedChatId) return false;
    const data = readJsonFile(ANTISTICKER_FILE, {});
    if (!data[normalizedChatId]) return false;
    delete data[normalizedChatId];
    writeJsonFile(ANTISTICKER_FILE, data);
    return true;
}

async function setAntitag(chatId, mode = 'on', action = 'delete') {
    const normalizedChatId = String(chatId || '').trim();
    if (!normalizedChatId) return false;
    const data = readJsonFile(ANTITAG_FILE, {});
    data[normalizedChatId] = { enabled: true, mode, action };
    writeJsonFile(ANTITAG_FILE, data);
    return true;
}

async function getAntitag(chatId) {
    const data = readJsonFile(ANTITAG_FILE, {});
    const entry = data[String(chatId || '').trim()];
    if (!entry) return null;
    return { enabled: Boolean(entry.enabled ?? true), mode: entry.mode || 'on', action: entry.action || 'delete', ...entry };
}

async function removeAntitag(chatId) {
    const normalizedChatId = String(chatId || '').trim();
    if (!normalizedChatId) return false;
    const data = readJsonFile(ANTITAG_FILE, {});
    if (!data[normalizedChatId]) return false;
    delete data[normalizedChatId];
    writeJsonFile(ANTITAG_FILE, data);
    return true;
}

async function incrementWarningCount(chatId, userId) {
    const warningData = readJsonFile(WARNINGS_FILE, {});
    const groupId = String(chatId || '').trim();
    const memberId = String(userId || '').trim();
    if (!groupId || !memberId) return 0;
    const current = Number(warningData[groupId]?.[memberId] || 0);
    const next = current + 1;
    if (!warningData[groupId]) warningData[groupId] = {};
    warningData[groupId][memberId] = next;
    writeJsonFile(WARNINGS_FILE, warningData);
    return next;
}

async function resetWarningCount(chatId, userId) {
    const warningData = readJsonFile(WARNINGS_FILE, {});
    const groupId = String(chatId || '').trim();
    const memberId = String(userId || '').trim();
    if (!groupId || !memberId) return false;
    if (!warningData[groupId]) return false;
    delete warningData[groupId][memberId];
    writeJsonFile(WARNINGS_FILE, warningData);
    return true;
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
    setAntilink,
    getAntilink,
    removeAntilink,
    setAntiBadword,
    getAntiBadword,
    removeAntiBadword,
    setAntisticker,
    getAntisticker,
    removeAntisticker,
    setAntitag,
    getAntitag,
    removeAntitag,
    isSudo,
    incrementWarningCount,
    resetWarningCount,
};
