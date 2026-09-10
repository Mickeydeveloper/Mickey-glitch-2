const { createCtx } = require('../lib/messageBuilder');
const { randomUUID } = require('crypto');

// Function ya HTML Runner - AI Rich Version
async function runHTML(sock, chatId, msg, args = []) {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    let inputCode = "";

    // Check if message has quoted message
    const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage;
    const isQuoted = !!quoted;

    // Get input text
    let text = args.join(' ') || msg?.body || msg?.text || '';

    // If there's a quoted message, use it
    if (isQuoted) {
        const quotedText = quoted?.conversation || 
                          quoted?.extendedTextMessage?.text || 
                          quoted?.imageMessage?.caption ||
                          quoted?.videoMessage?.caption ||
                          quoted?.documentMessage?.caption ||
                          '';
        if (quotedText) {
            inputCode = quotedText;
        }
    }

    // If no quoted text, use the command text
    if (!inputCode && text) {
        inputCode = text;
    }

    // If still no code, try to get from message
    if (!inputCode) {
        inputCode = msg?.body || msg?.text || '';
    }

    if (!inputCode) {
        await sock.sendMessage(target, {
            text: `▶️ AI RICH RUNNER\n━━━━━━━━━━━━━━━━━━━\n⚠️ Send HTML code!\n━━━━━━━━━━━━━━━━━━━\n📌 Example:\n.run <html>...</html>\n━━━━━━━━━━━━━━━━━━━\n📎 Or quote a message with code`
        }, { quoted: ctx.msg });
        return false;
    }

    let htmlCode = "";

    // 1. Full HTML document
    const fullHtml = inputCode.match(/(?:<!DOCTYPE html>\s*)?<html[\s\S]*<\/html>/i);

    // 2. Code in backticks
    const inBackticks = inputCode.match(/`([\s\S]*?(?:<style|<div|<script|<canvas)[\s\S]*?)`/i);

    // 3. HTML blocks
    const rawBlocks = inputCode.match(/(<(?:style|div|script|canvas|svg|h1|p|button|input|form)[\s\S]*<\/(?:style|div|script|canvas|svg|h1|p|button|input|form)>)/i);

    // 4. Simple HTML tags
    const simpleTags = inputCode.match(/<([a-z]+)[\s\S]*<\/\1>/i);

    if (fullHtml) {
        htmlCode = fullHtml[0];
    } else if (inBackticks) {
        htmlCode = inBackticks[1];
    } else if (rawBlocks) {
        htmlCode = rawBlocks[0];
    } else if (simpleTags) {
        htmlCode = simpleTags[0];
    } else {
        // Wrap in a simple div
        htmlCode = `<div style="padding:20px;background:rgba(0,0,0,0.8);border-radius:12px;color:#fff;font-family:Arial,sans-serif;">\n${inputCode}\n</div>`;
    }

    // Wrap if not full HTML
    if (!/<html/i.test(htmlCode)) {
        htmlCode = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:transparent;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:10px}
</style>
</head>
<body>
${htmlCode}
</body>
</html>`;
    }

    const responseId = randomUUID();

    // ═══════════════════════════════════════════════════════════
    // AI RICH HTML PAYLOAD
    // ═══════════════════════════════════════════════════════════
    const payload = {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: "",
                botResponseId: responseId,
                verificationMetadata: {
                    proofs: [
                        {
                            version: 1,
                            useCase: 1,
                            signature: "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==",
                            certificateChain: [
                                "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg",
                                "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCggYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ=="
                            ]
                        }
                    ]
                }
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [
                        {
                            messageType: 2,
                            messageText: "▶️ AI Rich HTML"
                        }
                    ],
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({
                            response_id: responseId,
                            sections: [
                                {
                                    view_model: {
                                        primitive: {
                                            __typename: "GenAIaeacdsnwHtmlPrimitive",
                                            payload: htmlCode,
                                            trusted_sources: []
                                        },
                                        __typename: "GenAISingleLayoutViewModel"
                                    }
                                }
                            ]
                        })).toString('base64')
                    },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: {
                            botJid: "867051314767696@bot"
                        },
                        forwardOrigin: 4
                    }
                }
            }
        }
    };

    try {
        await sock.relayMessage(target, payload, {});
        return true;
    } catch (error) {
        console.error('[run] relay failed:', error?.message || error);

        try {
            await sock.sendMessage(target, {
                text: `❌ Failed to run HTML\n━━━━━━━━━━━━━━━━━━━\n⚠️ Error: ${error?.message || 'Unknown error'}`
            }, { quoted: ctx.msg });
            return false;
        } catch (sendErr) {
            console.error('[run] fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
}

// Command object
const runCommand = async (sock, chatId, msg, args = []) => {
    return await runHTML(sock, chatId, msg, args);
};

runCommand.name = 'run';
runCommand.aliases = ['airich', 'html', 'view', 'code'];
runCommand.category = 'tools';
runCommand.description = '▶️ Run HTML as AI Rich message';

module.exports = runCommand;