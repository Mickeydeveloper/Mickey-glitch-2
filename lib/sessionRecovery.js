const fs = require('fs-extra');
const path = require('path');

function isSessionRepairableError(error) {
    const text = String(error?.message || error || '').toLowerCase();
    return text.includes('bad mac') ||
        text.includes('failed to decrypt message with any known session') ||
        text.includes('session error');
}

function backupSignalState(authPath, timestamp = Date.now()) {
    if (!authPath || !fs.existsSync(authPath)) return null;

    const backupPath = `${authPath}_bad_mac_${timestamp}`;
    fs.ensureDirSync(backupPath);

    for (const entry of fs.readdirSync(authPath)) {
        if (entry === 'creds.json') continue;

        const source = path.join(authPath, entry);
        const destination = path.join(backupPath, entry);
        fs.moveSync(source, destination, { overwrite: true });
    }

    return backupPath;
}

module.exports = {
    isSessionRepairableError,
    backupSignalState
};