const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    try {
        if (!q) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ Usage: .binlookup 457173\n\nEnter first 6 digits of card.' 
            }, { quoted: msg });
        }

        const bin = q.replace(/\D/g, '').substring(0, 6);
        if (bin.length < 6) {
            return await sock.sendMessage(chatId, { text: '❌ BIN must be at least 6 digits!' }, { quoted: msg });
        }

        const schemes = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'JCB'];
        const types = ['DEBIT', 'CREDIT'];
        const countries = ['United States', 'United Kingdom', 'Pakistan', 'India', 'UAE', 'Saudi Arabia'];
        const banks = ['Habib Bank', 'UBL', 'MCB', 'Allied Bank', 'Bank Alfalah', 'Meezan Bank'];

        const scheme = schemes[parseInt(bin[0]) % schemes.length];
        const type = types[parseInt(bin[1]) % types.length];
        const country = countries[parseInt(bin[2]) % countries.length];
        const bank = banks[parseInt(bin[3]) % banks.length];

        const text = `💳 *SHADOW BIN LOOKUP* 💳\n\n` +
                     `🔢 *BIN:* ${bin}\n` +
                     `🏦 *Scheme:* ${scheme}\n` +
                     `💰 *Type:* ${type}\n` +
                     `🏛️ *Bank:* ${bank}\n` +
                     `🌍 *Country:* ${country}\n\n` +
                     `⚠️ For educational purposes only!\n\n` +
                     `_Powered by Shadow MD Bot_`;

        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (err) {
        await sock.sendMessage(chatId, { text: '❌ Error: ' + err.message }, { quoted: msg });
    }
};
