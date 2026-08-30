const axios = require('axios');

module.exports = async function(sock, chatId, msg) {
    try {
        const firstNames = ['Ahmad', 'Ali', 'Hassan', 'Usman', 'Bilal', 'Farhan', 'Imran', 'Kamran', 'Naveed', 'Tariq'];
        const lastNames = ['Khan', 'Ahmed', 'Ali', 'Hussain', 'Malik', 'Butt', 'Raza', 'Sheikh', 'Qureshi', 'Siddiqui'];
        const cities = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar', 'Quetta'];
        const streets = ['Main Street', 'Garden Road', 'Model Town', 'Defence Road', 'Cantt Area', 'Gulberg', 'Johar Town'];

        const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
        const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const street = streets[Math.floor(Math.random() * streets.length)];
        const phone = `+92 3${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
        const age = Math.floor(Math.random() * 30) + 18;
        const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${Math.floor(Math.random() * 999)}@gmail.com`;

        const text = `🎭 *SHADOW FAKE INFO GENERATOR* 🎭\n\n` +
                     `👤 *Name:* ${fn} ${ln}\n` +
                     `📧 *Email:* ${email}\n` +
                     `📱 *Phone:* ${phone}\n` +
                     `🎂 *Age:* ${age}\n` +
                     `🏠 *Address:* ${street}, ${city}\n` +
                     `🇵🇰 *Country:* Pakistan\n\n` +
                     `⚠️ This is FAKE information for educational/testing purposes only!\n\n` +
                     `_Powered by Shadow MD Bot_`;

        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (err) {
        await sock.sendMessage(chatId, { text: '❌ Error: ' + err.message }, { quoted: msg });
    }
};
