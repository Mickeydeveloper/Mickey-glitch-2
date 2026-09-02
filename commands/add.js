const isAdmin = require('../lib/isAdmin');

/**
 * Add command: Invite a member to the group by phone number
 * Usage: .add <phone_number>
 * Example: .add 255612130873
 */
async function addCommand(sock, a2, a3, a4, a5) {
    try {
        // Dynamic Argument Resolver (kuzuia parameter mismatch kutoka invoker)
        let chatId, senderId, text, message;

        if (typeof a2 === 'string' && (a2.endsWith('@g.us') || a2.endsWith('@s.whatsapp.net'))) {
            // Standard Custom Signature: (sock, chatId, senderId, text, message)
            chatId = a2;
            senderId = typeof a3 === 'string' ? a3 : '';
            text = typeof a4 === 'string' ? a4 : (Array.isArray(a4) ? a4.join(' ') : '');
            message = a5 || a4 || a3;
        } else {
            // Baileys Standard Signature: (sock, message, args)
            message = a2 || {};
            chatId = String(message?.key?.remoteJid || '').trim();
            senderId = String(message?.key?.participant || chatId).trim();
            const rawArgs = Array.isArray(a3) ? a3 : [];
            text = rawArgs.join(' ') || (typeof a3 === 'string' ? a3 : '');
        }

        // Safe Fallback check
        if (!chatId) {
            console.error('⚠️ [addCommand] Invalid Chat ID provided.');
            return;
        }

        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(chatId, { text: '❌ This command can only be used in groups.' }, { quoted: message });
            return;
        }

        // Check Admin Status Safely
        let adminStatus = { isSenderAdmin: false, isBotAdmin: false };
        try {
            adminStatus = await isAdmin(sock, chatId, senderId);
        } catch (adminErr) {
            console.error('isAdmin check failed:', adminErr?.message || adminErr);
        }

        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '❌ Only group admins can add members.' }, { quoted: message });
            return;
        }

        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, { text: '❌ Bot must be an admin to add members.' }, { quoted: message });
            return;
        }

        // Extract phone number from text
        const phoneNumber = (text || '').trim();
        if (!phoneNumber) {
            await sock.sendMessage(chatId, { text: '❌ Usage: .add <phone_number>\n\n📝 Example: .add 255612130873' }, { quoted: message });
            return;
        }

        // Clean & Validate Phone Number
        const cleanNumber = phoneNumber.replace(/[\s\-\+\(\)]/g, '');
        if (!/^\d+$/.test(cleanNumber)) {
            await sock.sendMessage(chatId, { text: '❌ Invalid phone number format. Please provide a valid number.\n\n📝 Example: .add 255612130873' }, { quoted: message });
            return;
        }

        let finalNumber = cleanNumber.startsWith('+') ? cleanNumber.slice(1) : cleanNumber;
        if (finalNumber.length < 10) {
            await sock.sendMessage(chatId, { text: '❌ Phone number too short. Please provide a valid number with country code.' }, { quoted: message });
            return;
        }

        const memberId = `${finalNumber}@s.whatsapp.net`;

        await sock.sendPresenceUpdate('composing', chatId);

        try {
            await sock.groupParticipantsUpdate(chatId, [memberId], 'add');

            await sock.sendMessage(chatId, { 
                text: `✅ Successfully added +${finalNumber} to the group!` 
            }, { quoted: message });
        } catch (addError) {
            const errorMsg = addError && addError.message ? addError.message.toLowerCase() : '';

            if (errorMsg.includes('already') || errorMsg.includes('member')) {
                await sock.sendMessage(chatId, { 
                    text: `⚠️ User +${finalNumber} is already a member of the group.` 
                }, { quoted: message });
            } else if (errorMsg.includes('invalid') || errorMsg.includes('not found')) {
                await sock.sendMessage(chatId, { 
                    text: `❌ Phone number +${finalNumber} is invalid or not registered on WhatsApp.` 
                }, { quoted: message });
            } else if (errorMsg.includes('permission')) {
                await sock.sendMessage(chatId, { 
                    text: `❌ Bot doesn't have permission to add members. Check group settings.` 
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { 
                    text: `❌ Failed to add member: ${addError && addError.message ? addError.message : 'Unknown error'}` 
                }, { quoted: message });
            }
        }
    } catch (e) {
        console.error('addCommand error:', e && e.message ? e.message : e);
    }
}

module.exports = addCommand;
