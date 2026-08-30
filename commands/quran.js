const axios = require('axios');

const surahNames = [
    'Al-Fatiha', 'Al-Baqarah', 'Aali Imran', 'An-Nisa', 'Al-Ma\'idah', 'Al-An\'am', 'Al-A\'raf', 'Al-Anfal', 'At-Tawbah', 'Yunus',
    'Hud', 'Yusuf', 'Ar-Ra\'d', 'Ibrahim', 'Al-Hijr', 'An-Nahl', 'Al-Isra', 'Al-Kahf', 'Maryam', 'Ta-Ha',
    'Al-Anbiya', 'Al-Hajj', 'Al-Mu\'minun', 'An-Nur', 'Al-Furqan', 'Ash-Shu\'ara', 'An-Naml', 'Al-Qasas', 'Al-Ankabut', 'Ar-Rum'
];

module.exports = async function(sock, chatId, msg, q) {
    try {
        let surah = q ? parseInt(q) : Math.floor(Math.random() * 114) + 1;
        if (isNaN(surah) || surah < 1 || surah > 114) surah = 1;
        
        const response = await axios.get(`https://api.alquran.cloud/v1/surah/${surah}`, { timeout: 10000 });
        const data = response.data.data;
        
        let text = `*\u1F54E Surah ${data.englishName} (${data.name})*\n\n`;
        text += `Number: ${data.number}\n`;
        text += `English: ${data.englishName}\n`;
        text += `Meaning: ${data.englishNameTranslation}\n`;
        text += `Verses: ${data.numberOfAyahs}\n`;
        text += `Revelation: ${data.revelationType}\n\n`;
        
        // Show first 5 verses
        data.ayahs.slice(0, 5).forEach(a => {
            text += `${a.numberInSurah}. ${a.text}\n`;
        });
        
        if (data.numberOfAyahs > 5) {
            text += `\n...and ${data.numberOfAyahs - 5} more verses.\n`;
        }
        
        text += `\n_Full surah: https://quran.com/${surah}_`;
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
