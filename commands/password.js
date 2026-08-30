function generatePassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

module.exports = async function(sock, chatId, msg, q) {
    const length = q && !isNaN(parseInt(q)) ? Math.min(Math.max(parseInt(q), 4), 50) : 12;
    const password = generatePassword(length);
    
    await sock.sendMessage(chatId, { 
        text: `*\u1F511 Generated Password*\n\n` +
            `\`\`\`${password}\`\`\`\n\n` +
            `Length: ${length} characters\n` +
            `_Keep it safe!_` 
    }, { quoted: msg });
};
