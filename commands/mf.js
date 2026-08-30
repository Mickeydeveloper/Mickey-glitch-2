const axios = require('axios');
const cheerio = require('cheerio');

async function mfCommand(sock, from, msg, q) {
    if (!q) return await sock.sendMessage(from, { text: "❌ Please provide a MediaFire link." }, { quoted: msg });
    
    await sock.sendMessage(from, { text: "⏳ *Analyzing MediaFire link...*" }, { quoted: msg });
    
    try {
        const res = await axios.get(q, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.178 Safari/537.36'
            }
        });
        const $ = cheerio.load(res.data);
        const downloadUrl = $('#downloadButton').attr('href');
        const fileName = $('.dl-info .promo_ss_file_name').text().trim() || $('.dl-btn-label').attr('title') || 'file';
        const fileSize = $('.dl-info .promo_ss_file_size').text().trim() || 'Unknown';

        if (downloadUrl) {
            const caption = `╭━━━〔 𝗠𝗘𝗗𝗜𝗔𝗙𝗜𝗥𝗘 𝗗𝗟 〕━━━┈⊷\n` +
                          `┃ 📝 *FILE NAME:* ${fileName}\n` +
                          `┃ ⚖️ *FILE SIZE:* ${fileSize}\n` +
                          `╰━━━━━━━━━━━━━━━━━━┈⊷`;
            
            await sock.sendMessage(from, { 
                document: { url: downloadUrl }, 
                mimetype: 'application/octet-stream',
                fileName: fileName,
                caption: caption
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: "❌ Failed to fetch MediaFire file. Make sure the link is correct." }, { quoted: msg });
        }
    } catch (e) {
        console.error("MediaFire Error:", e);
        await sock.sendMessage(from, { text: "❌ Error downloading from MediaFire: " + e.message }, { quoted: msg });
    }
}

module.exports = mfCommand;
