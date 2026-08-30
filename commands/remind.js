const reminders = new Map();

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .remind <minutes> <message>' }, { quoted: msg });
    
    const parts = q.split(' ');
    const minutes = parseInt(parts[0]);
    const reminderText = parts.slice(1).join(' ');
    
    if (isNaN(minutes) || !reminderText) {
        return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .remind <minutes> <message>' }, { quoted: msg });
    }
    
    const ms = minutes * 60 * 1000;
    const id = Date.now();
    
    await sock.sendMessage(chatId, { text: `\u23F0 Reminder set for ${minutes} minute(s)!\n\nMessage: ${reminderText}` }, { quoted: msg });
    
    const timeout = setTimeout(async () => {
        try {
            await sock.sendMessage(chatId, { 
                text: `\u23F0 *REMINDER!*\n\n${reminderText}\n\n_Set ${minutes}m ago_` 
            });
            reminders.delete(id);
        } catch (e) {}
    }, ms);
    
    reminders.set(id, { timeout, text: reminderText });
};
