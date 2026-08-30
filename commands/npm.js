const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .npm <package name>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F4E6 Searching npm...' }, { quoted: msg });
        
        const response = await axios.get(`https://registry.npmjs.org/${encodeURIComponent(q)}`, { timeout: 10000 });
        const pkg = response.data;
        const latest = pkg['dist-tags'].latest;
        const info = pkg.versions[latest];
        
        const text = `*\u1F4E6 npm: ${pkg.name}*\n\n` +
            `Version: ${latest}\n` +
            `Description: ${pkg.description || 'N/A'}\n` +
            `Author: ${pkg.author?.name || 'N/A'}\n` +
            `License: ${pkg.license || 'N/A'}\n` +
            `Last Modified: ${new Date(pkg.time.modified).toLocaleDateString()}\n` +
            `Downloads: https://www.npmjs.com/package/${pkg.name}\n\n` +
            `*Install:*\n\`npm install ${pkg.name}\``;
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Package not found: ' + e.message }, { quoted: msg });
    }
};
