const asma = [
    { no: 1, name: "Ar-Rahman", meaning: "The Beneficent" },
    { no: 2, name: "Ar-Rahim", meaning: "The Merciful" },
    { no: 3, name: "Al-Malik", meaning: "The King" },
    { no: 4, name: "Al-Quddus", meaning: "The Holy" },
    { no: 5, name: "As-Salam", meaning: "The Peace" },
    { no: 6, name: "Al-Mu'min", meaning: "The Guardian of Faith" },
    { no: 7, name: "Al-Muhaymin", meaning: "The Protector" },
    { no: 8, name: "Al-Aziz", meaning: "The Mighty" },
    { no: 9, name: "Al-Jabbar", meaning: "The Compeller" },
    { no: 10, name: "Al-Mutakabbir", meaning: "The Majestic" }
];

module.exports = async function(sock, chatId, msg, q) {
    try {
        if (q && !isNaN(parseInt(q))) {
            const num = parseInt(q);
            if (num >= 1 && num <= 99) {
                const response = await axios.get(`https://api.aladhan.com/v1/asmaAlHusna/${num}`, { timeout: 10000 }).catch(() => null);
                if (response && response.data.data.length) {
                    const a = response.data.data[0];
                    return await sock.sendMessage(chatId, { 
                        text: `*\u2728 Asmaul Husna #${a.number}*\n\n` +
                            `Name: *${a.name}*\n` +
                            `Transliteration: ${a.transliteration}\n` +
                            `Meaning: ${a.en.meaning}\n\n` +
                            `"${a.en.desc}"` 
                    }, { quoted: msg });
                }
            }
        }
        
        // Show list
        let text = `*\u2728 Asmaul Husna (99 Names of Allah)*\n\n`;
        asma.forEach(a => {
            text += `${a.no}. *${a.name}* - ${a.meaning}\n`;
        });
        text += `\n_Use .asmaulhusna <number> for details (1-99)_`;
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
