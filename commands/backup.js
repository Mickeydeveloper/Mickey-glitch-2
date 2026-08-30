const fs = require('fs-extra');
const path = require('path');

module.exports = async function(sock, chatId, msg, isOwner) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    try {
        const backupDir = path.join(__dirname, '..', 'backups');
        await fs.ensureDir(backupDir);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup_${timestamp}.json`);
        
        const data = {
            timestamp: new Date().toISOString(),
            botData: require('../lib/lightweight_store'),
            sessions: Object.keys(require('../index')?.sessions || {})
        };
        
        await fs.writeJson(backupPath, data);
        await sock.sendMessage(chatId, { text: `\u1F4C1 Backup created!\nFile: backup_${timestamp}.json` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
