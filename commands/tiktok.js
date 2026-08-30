const axios = require('axios');

async function tiktokCommand(sock, from, msg, q) {
    if (!q) return await sock.sendMessage(from, { text: "❌ Please provide a TikTok URL." }, { quoted: msg });
    
    try {
        await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
        
        // Using TikWM API as it's generally reliable
        const res = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(q)}`);
        
        if (res.data && res.data.data) {
            const videoData = res.data.data;
            const videoUrl = videoData.play; // This is the direct MP4 URL
            const musicUrl = videoData.music;
            const author = videoData.author.nickname;
            const title = videoData.title || "TikTok Video";

            const caption = `*\u1F3A5 TikTok Downloader*\n\n` +
                `📝 *Title:* ${title}\n` +
                `👤 *Author:* ${author}\n\n` +
                `> © POWERED BY SHADOW MD BOT`;

            // Send Video
            await sock.sendMessage(from, { 
                video: { url: videoUrl }, 
                caption,
                mimetype: 'video/mp4'
            }, { quoted: msg });
            
            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
        } else {
            throw new Error('Failed to fetch TikTok video.');
        }
    } catch (e) {
        console.error('TikTok Error:', e);
        await sock.sendMessage(from, { text: "❌ Error downloading TikTok: " + e.message }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
    }
}

module.exports = tiktokCommand;
