const yts = require('yt-search');
const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .youtube <search query/link>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });
        
        let videoUrl = q;
        if (!q.includes('youtube.com') && !q.includes('youtu.be')) {
            const search = await yts(q);
            const video = search.videos[0];
            if (!video) return await sock.sendMessage(chatId, { text: '\u274C No results found!' }, { quoted: msg });
            videoUrl = video.url;
        }

        // Use Siputzx API for downloading
        const apiUrl = `https://api.siputzx.my.id/api/d/youtube?url=${encodeURIComponent(videoUrl)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data && data.status && data.data) {
            const videoData = data.data;
            const caption = `*\u25B6\uFE0F ${videoData.title}*\n\n` +
                `\u23F1\uFE0F Duration: ${videoData.duration || 'N/A'}\n` +
                `\u1F517 Link: ${videoUrl}\n\n` +
                `> © POWERED BY SHADOW MD BOT`;

            // Send Video
            await sock.sendMessage(chatId, { 
                video: { url: videoData.dl }, 
                caption,
                mimetype: 'video/mp4'
            }, { quoted: msg });
            
            await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
        } else {
            throw new Error('Failed to fetch download link.');
        }
    } catch (e) {
        console.error('YouTube Error:', e);
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
};
