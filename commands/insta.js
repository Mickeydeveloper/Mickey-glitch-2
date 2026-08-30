const axios = require('axios');

async function instaCommand(sock, from, msg, q) {
    if (!q) return await sock.sendMessage(from, { text: "❌ Please provide an Instagram URL." }, { quoted: msg });
    
    try {
        await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
        
        // Using Siputzx API for Instagram
        const apiUrl = `https://api.siputzx.my.id/api/d/instagram?url=${encodeURIComponent(q)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data && data.status && data.data && data.data.length > 0) {
            for (let item of data.data) {
                const caption = `*\u1F4F7 Instagram Downloader*\n\n> © POWERED BY SHADOW MD BOT`;
                
                if (item.url.includes('.mp4') || item.thumbnail) {
                    // It's likely a video if it has a thumbnail or .mp4
                    await sock.sendMessage(from, { 
                        video: { url: item.url }, 
                        caption,
                        mimetype: 'video/mp4'
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { 
                        image: { url: item.url }, 
                        caption 
                    }, { quoted: msg });
                }
            }
            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
        } else {
            throw new Error("No media found or link is private.");
        }
    } catch (e) {
        console.error('Instagram Error:', e);
        await sock.sendMessage(from, { text: "❌ Error downloading Instagram content: " + e.message }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
    }
}

module.exports = instaCommand;
