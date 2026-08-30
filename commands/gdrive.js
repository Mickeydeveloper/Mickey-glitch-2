const axios = require('axios');

async function gdriveCommand(sock, from, msg, q) {
    if (!q) return await sock.sendMessage(from, { text: "❌ Please provide a Google Drive link." }, { quoted: msg });
    
    await sock.sendMessage(from, { text: "⏳ *Analyzing Google Drive link...*" }, { quoted: msg });
    
    try {
        let fileId = "";
        const patterns = [
            /\/file\/d\/([a-zA-Z0-9_-]{25,})/,
            /id=([a-zA-Z0-9_-]{25,})/,
            /([a-zA-Z0-9_-]{33,})/
        ];

        for (let pattern of patterns) {
            const match = q.match(pattern);
            if (match) {
                fileId = match[1];
                break;
            }
        }

        if (fileId) {
            const downloadUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;
            
            // Try to fetch headers to get real filename and size
            let fileName = `gdrive_file_${fileId}`;
            let fileSize = "Unknown";
            
            try {
                const response = await axios.get(downloadUrl, { 
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    maxRedirects: 5 
                });
                
                const contentDisp = response.headers['content-disposition'];
                if (contentDisp) {
                    const fnameMatch = contentDisp.match(/filename="(.+)"/);
                    if (fnameMatch) fileName = fnameMatch[1];
                }
                
                const contentLen = response.headers['content-length'];
                if (contentLen) {
                    const bytes = parseInt(contentLen);
                    if (bytes < 1024) fileSize = bytes + " B";
                    else if (bytes < 1024 * 1024) fileSize = (bytes / 1024).toFixed(2) + " KB";
                    else if (bytes < 1024 * 1024 * 1024) fileSize = (bytes / (1024 * 1024)).toFixed(2) + " MB";
                    else fileSize = (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
                }
            } catch (headErr) {
                console.log("Could not fetch metadata, using defaults.");
            }

            const caption = `╭━━━〔 𝗚𝗗𝗥𝗜𝗩𝗘 𝗗𝗟 〕━━━┈⊷\n` +
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
            await sock.sendMessage(from, { text: "❌ Could not extract File ID from the link." }, { quoted: msg });
        }
    } catch (e) {
        console.error("GDrive Error:", e);
        await sock.sendMessage(from, { text: "❌ Error downloading from GDrive: " + e.message }, { quoted: msg });
    }
}

module.exports = gdriveCommand;
