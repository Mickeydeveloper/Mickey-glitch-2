const axios = require('axios');

// Store active tempmail sessions
const tempmailSessions = {};

// Mail.tm API base URL
const MAIL_API = 'https://api.mail.tm';

async function createAccount() {
    try {
        // Get available domains
        const domainsRes = await axios.get(`${MAIL_API}/domains`, { timeout: 10000 });
        const domain = domainsRes.data['hydra:member'][0].domain;

        // Generate random credentials
        const randomId = Math.random().toString(36).substring(2, 10);
        const email = `${randomId}@${domain}`;
        const password = Math.random().toString(36).substring(2, 15);

        // Create account
        await axios.post(`${MAIL_API}/accounts`, {
            address: email,
            password: password
        }, { timeout: 10000 });

        // Get token
        const tokenRes = await axios.post(`${MAIL_API}/token`, {
            address: email,
            password: password
        }, { timeout: 10000 });

        return {
            email: email,
            password: password,
            token: tokenRes.data.token
        };
    } catch (err) {
        throw new Error('Failed to create tempmail: ' + err.message);
    }
}

async function checkMessages(token) {
    try {
        const res = await axios.get(`${MAIL_API}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
        });
        return res.data['hydra:member'] || [];
    } catch (err) {
        return [];
    }
}

async function getMessage(token, messageId) {
    try {
        const res = await axios.get(`${MAIL_API}/messages/${messageId}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
        });
        return res.data;
    } catch (err) {
        return null;
    }
}

module.exports = async function(sock, chatId, msg) {
    try {
        const userId = chatId;

        // If user already has an active tempmail, show it
        if (tempmailSessions[userId]) {
            const session = tempmailSessions[userId];

            // Check for new messages
            const messages = await checkMessages(session.token);
            const newMessages = messages.filter(m => !session.seenMessages.includes(m.id));

            if (newMessages.length > 0) {
                // Forward new messages/OTPs
                for (const message of newMessages) {
                    const fullMsg = await getMessage(session.token, message.id);
                    if (fullMsg) {
                        const otpMatch = fullMsg.text?.match(/\b\d{4,8}\b/) || fullMsg.intro?.match(/\b\d{4,8}\b/);
                        const otp = otpMatch ? otpMatch[0] : null;

                        const forwardText = `📧 *NEW EMAIL RECEIVED* 📧\n\n` +
                                          `📨 *From:* ${fullMsg.from?.address || 'Unknown'}\n` +
                                          `📌 *Subject:* ${fullMsg.subject || 'No Subject'}\n` +
                                          `🕐 *Date:* ${new Date(fullMsg.createdAt).toLocaleString()}\n\n` +
                                          (otp ? `🔐 *OTP DETECTED:* \`${otp}\`\n\n` : '') +
                                          `📝 *Preview:*\n${fullMsg.intro || fullMsg.text?.substring(0, 500) || 'No content'}\n\n` +
                                          `_Powered by Shadow MD Bot_`;

                        await sock.sendMessage(chatId, { text: forwardText });
                        session.seenMessages.push(message.id);
                    }
                }
            }

            // Show current email info
            const text = `📧 *SHADOW TEMP MAIL* 📧\n\n` +
                         `✅ Active Email:\n` +
                         `\`${session.email}\`\n\n` +
                         `📨 Total Emails: ${messages.length}\n` +
                         `🔔 New Emails: ${newMessages.length}\n\n` +
                         `⏳ Checking for OTPs every 30 seconds...\n` +
                         `🔄 Type .tempmail again to check for new emails\n\n` +
                         `_Powered by Shadow MD Bot_`;

            await sock.sendMessage(chatId, { text }, { quoted: msg });
            return;
        }

        // Create new tempmail
        await sock.sendMessage(chatId, { text: '⏳ Creating temporary email... Please wait.' }, { quoted: msg });

        const account = await createAccount();

        // Store session
        tempmailSessions[userId] = {
            email: account.email,
            token: account.token,
            createdAt: Date.now(),
            seenMessages: []
        };

        const text = `📧 *SHADOW TEMP MAIL CREATED* 📧\n\n` +
                     `✅ *Email:*\n` +
                     `\`${account.email}\`\n\n` +
                     `⏳ Valid for 10 minutes\n` +
                     `🔔 I will forward any OTPs/emails to this chat\n\n` +
                     `📝 Use this email to receive OTPs\n` +
                     `🔄 Type .tempmail again to check for new emails\n\n` +
                     `_Powered by Shadow MD Bot_`;

        await sock.sendMessage(chatId, { text }, { quoted: msg });

        // Start auto-checking for emails
        startEmailChecker(sock, chatId, userId);

    } catch (err) {
        await sock.sendMessage(chatId, { text: '❌ Error: ' + err.message + '\n\nTry again later.' }, { quoted: msg });
    }
};

function startEmailChecker(sock, chatId, userId) {
    const interval = setInterval(async () => {
        const session = tempmailSessions[userId];
        if (!session) {
            clearInterval(interval);
            return;
        }

        // Check if session expired (10 minutes)
        if (Date.now() - session.createdAt > 10 * 60 * 1000) {
            delete tempmailSessions[userId];
            clearInterval(interval);
            try {
                await sock.sendMessage(chatId, { text: '⏰ Tempmail session expired. Use .tempmail to create a new one.' });
            } catch(e) {}
            return;
        }

        try {
            const messages = await checkMessages(session.token);
            const newMessages = messages.filter(m => !session.seenMessages.includes(m.id));

            for (const message of newMessages) {
                const fullMsg = await getMessage(session.token, message.id);
                if (fullMsg) {
                    const otpMatch = fullMsg.text?.match(/\b\d{4,8}\b/) || fullMsg.intro?.match(/\b\d{4,8}\b/);
                    const otp = otpMatch ? otpMatch[0] : null;

                    const forwardText = `📧 *NEW EMAIL RECEIVED* 📧\n\n` +
                                      `📨 *From:* ${fullMsg.from?.address || 'Unknown'}\n` +
                                      `📌 *Subject:* ${fullMsg.subject || 'No Subject'}\n` +
                                      `🕐 *Date:* ${new Date(fullMsg.createdAt).toLocaleString()}\n\n` +
                                      (otp ? `🔐 *OTP DETECTED:* \`${otp}\`\n\n` : '') +
                                      `📝 *Preview:*\n${fullMsg.intro || fullMsg.text?.substring(0, 500) || 'No content'}\n\n` +
                                      `_Powered by Shadow MD Bot_`;

                    await sock.sendMessage(chatId, { text: forwardText });
                    session.seenMessages.push(message.id);
                }
            }
        } catch (e) {}
    }, 15000); // Check every 15 seconds
}
