const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    const coin = q ? q.toLowerCase() : 'bitcoin';
    
    try {
        await sock.sendMessage(chatId, { text: `\u1F4B0 Fetching ${coin} price...` }, { quoted: msg });
        
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coin)}&vs_currencies=usd,inr&include_24hr_change=true`, { timeout: 10000 });
        
        if (!response.data[coin]) return await sock.sendMessage(chatId, { text: '\u274C Coin not found! Try: bitcoin, ethereum, ripple, cardano, solana' }, { quoted: msg });
        
        const data = response.data[coin];
        const change = data.usd_24h_change;
        const changeEmoji = change >= 0 ? '\uD83D\uDCC8' : '\uD83D\uDCC9';
        
        const text = `*\u1F4B0 ${coin.charAt(0).toUpperCase() + coin.slice(1)} Price*\n\n` +
            `USD: $${data.usd.toLocaleString()}\n` +
            `INR: \u20B9${data.inr.toLocaleString()}\n` +
            `24h Change: ${changeEmoji} ${change?.toFixed(2) || 0}%\n\n` +
            `_Powered by CoinGecko_`;
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
