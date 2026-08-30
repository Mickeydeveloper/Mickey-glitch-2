async function dpCommand(sock, from, msg) {
    try {
        let target;
        
        // 1. Get target from mention
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } 
        // 2. Get target from reply
        else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
            target = msg.message.extendedTextMessage.contextInfo.participant;
        } 
        // 3. Default target
        else {
            // In group: target is sender
            // In DM: target is the other person
            target = from.endsWith('@g.us') ? (msg.key.participant || msg.participant) : from;
        }

        // Final fallback to sender
        if (!target) target = msg.key.participant || msg.participant || from;

        // Reaction for feedback
        await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });

        let ppUrl;
        try {
            // Try fetching high-res image
            ppUrl = await sock.profilePictureUrl(target, 'image');
        } catch (e) {
            try {
                // Try fetching preview if high-res fails
                ppUrl = await sock.profilePictureUrl(target, 'preview');
            } catch (e2) {
                // Fallback to a default profile icon if both fail
                ppUrl = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
            }
        }

        await sock.sendMessage(from, { 
            image: { url: ppUrl }, 
            caption: `✅ *Profile Picture*\n👤 *User:* @${target.split('@')[0]}`,
            mentions: [target]
        }, { quoted: msg });

    } catch (e) {
        console.error("DP Command Error:", e);
        await sock.sendMessage(from, { text: "❌ Error: Could not process DP command." }, { quoted: msg });
    }
}

module.exports = dpCommand;
