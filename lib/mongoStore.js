const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const { MongoClient } = require('mongodb');

function createKey(value) {
    return crypto.createHash('sha256').update(String(value)).digest();
}

function encrypt(value, secret) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', createKey(secret), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
}

function decrypt(value, secret) {
    const [ivText, tagText, dataText] = String(value).split('.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', createKey(secret), Buffer.from(ivText, 'base64'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataText, 'base64')), decipher.final()]).toString('utf8');
}

async function collectFiles(root, current = root, result = {}) {
    if (!fs.existsSync(current)) return result;
    for (const entry of await fs.readdir(current)) {
        const fullPath = path.join(current, entry);
        const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) await collectFiles(root, fullPath, result);
        else result[relativePath] = (await fs.readFile(fullPath)).toString('base64');
    }
    return result;
}

async function restoreFiles(root, files) {
    await fs.ensureDir(root);
    for (const [relativePath, data] of Object.entries(files || {})) {
        const target = path.resolve(root, relativePath);
        if (!target.startsWith(path.resolve(root) + path.sep)) continue;
        await fs.ensureDir(path.dirname(target));
        await fs.writeFile(target, Buffer.from(data, 'base64'));
    }
}

class MongoStore {
    constructor(uri, databaseName, sessionSecret) {
        this.uri = uri;
        this.databaseName = databaseName;
        this.sessionSecret = sessionSecret;
        this.client = null;
        this.db = null;
        this.pendingSessions = new Map();
    }

    async connect() {
        if (!this.uri) return false;
        this.client = new MongoClient(this.uri, { serverSelectionTimeoutMS: 5000 });
        await this.client.connect();
        this.db = this.client.db(this.databaseName);
        await this.db.collection('accounts').createIndex({ accountId: 1 }, { unique: true });
        await this.db.collection('bot_sessions').createIndex({ botId: 1 }, { unique: true });
        return true;
    }

    async loadAccounts() {
        if (!this.db) return {};
        const rows = await this.db.collection('accounts').find({}).toArray();
        return Object.fromEntries(rows.map((row) => [row.accountId, row.account]));
    }

    async saveAccounts(accounts) {
        if (!this.db) return;
        const operations = Object.entries(accounts).map(([accountId, account]) => ({
            updateOne: { filter: { accountId }, update: { $set: { accountId, account, updatedAt: new Date() } }, upsert: true }
        }));
        if (operations.length) await this.db.collection('accounts').bulkWrite(operations);
    }

    async restoreSession(botId, authPath) {
        if (!this.db) return false;
        const row = await this.db.collection('bot_sessions').findOne({ botId });
        if (!row?.payload) return false;
        await restoreFiles(authPath, JSON.parse(decrypt(row.payload, this.sessionSecret)));
        return true;
    }

    queueSessionSync(botId, authPath) {
        clearTimeout(this.pendingSessions.get(botId));
        const timer = setTimeout(async () => {
            this.pendingSessions.delete(botId);
            if (!this.db) return;
            try {
                const files = await collectFiles(authPath);
                await this.db.collection('bot_sessions').updateOne(
                    { botId },
                    { $set: { botId, payload: encrypt(JSON.stringify(files), this.sessionSecret), updatedAt: new Date() } },
                    { upsert: true }
                );
            } catch (error) {
                console.error(`[Mongo] Session sync failed for ${botId}:`, error.message);
            }
        }, 1500);
        this.pendingSessions.set(botId, timer);
    }
}

module.exports = { MongoStore };