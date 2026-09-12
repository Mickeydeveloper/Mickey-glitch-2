const { createCtx } = require('../lib/messageBuilder');
const { randomUUID } = require('crypto');

// ═══════════════════════════════════════════════════════════
// PROOF SIGNATURE & CERT CHAIN
// ═══════════════════════════════════════════════════════════
const PROOF_SIGNATURE = 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==';
const CERT_CHAIN = [
    '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'
];

// ═══════════════════════════════════════════════════════════
// GET RAW TEXT FROM MESSAGE
// ═══════════════════════════════════════════════════════════
function getRawText(msg) {
    if (!msg) return '';

    // Try all possible sources
    const sources = [
        msg.body,
        msg.text,
        msg.message?.conversation,
        msg.message?.extendedTextMessage?.text,
        msg.message?.imageMessage?.caption,
        msg.message?.videoMessage?.caption,
        msg.message?.documentMessage?.caption,
        msg.msg?.message?.conversation,
        msg.msg?.message?.extendedTextMessage?.text,
        msg.quoted?.message?.conversation,
        msg.quoted?.message?.extendedTextMessage?.text,
        msg.msg?.contextInfo?.quotedMessage?.conversation,
        msg.msg?.contextInfo?.quotedMessage?.extendedTextMessage?.text
    ];

    for (const src of sources) {
        if (typeof src === 'string' && src.trim().length > 0) {
            return src;
        }
    }

    return '';
}

// ═══════════════════════════════════════════════════════════
// AIRich CLASS
// ═══════════════════════════════════════════════════════════
class AIRich {
    constructor(sock) {
        this.sock = sock;
        this.sections = [];
    }

    addSection(primitive) {
        this.sections.push(primitive);
        return this;
    }

    static newLayout(type, primitive) {
        return primitive;
    }

    addProgress(title = 'Processing...', inProgress = true) {
        this.sections.push({
            __typename: 'GenAIBotProgressStatusPrimitive',
            icon: null,
            is_in_progress: inProgress,
            meta_search_apps: null,
            target_secondary_screen_id: null,
            target_secondary_screen_tab_id: null,
            title: title
        });
        return this;
    }

    addText(text) {
        this.sections.push({
            __typename: 'GenAIMarkdownTextUXPrimitive',
            text: text
        });
        return this;
    }

    addImage(url) {
        this.sections.push({
            __typename: 'GenAIImaginePrimitive',
            media: { url: url, mime_type: 'image/png', width: 16, height: 9 },
            imagine_type: 'IMAGE',
            status: { status: 'READY' }
        });
        return this;
    }

    addEntity(title, subtitle, entityUrl, imageUrl) {
        this.sections.push({
            __typename: 'GenAICompactEntityPrimitive',
            title: title,
            subtitle: subtitle,
            secondary_subtitle: 'Verified',
            entity_id: Date.now(),
            entity_url: entityUrl,
            entity_type: 'PAGE',
            action_type: 'FOLLOW',
            is_verified: true,
            image: { url: imageUrl, url_fallback: imageUrl }
        });
        return this;
    }

    async send(chatId, options = {}) {
        if (!this.sock || !chatId) throw new Error('Sock and chatId required');
        if (this.sections.length === 0) throw new Error('No sections added');

        const responseId = randomUUID();

        const payload = {
            messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
                botMetadata: {
                    messageDisclaimerText: "",
                    botResponseId: responseId,
                    verificationMetadata: {
                        proofs: [{
                            version: 1,
                            useCase: 1,
                            signature: PROOF_SIGNATURE,
                            certificateChain: CERT_CHAIN
                        }]
                    }
                }
            },
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        submessages: [{ messageType: 2, messageText: "AI Rich Response" }],
                        unifiedResponse: {
                            data: Buffer.from(JSON.stringify({
                                response_id: responseId,
                                sections: this.sections.map(p => ({
                                    view_model: {
                                        primitive: p,
                                        __typename: "GenAISingleLayoutViewModel"
                                    }
                                }))
                            })).toString('base64')
                        },
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
                            forwardOrigin: 4
                        }
                    }
                }
            }
        };

        return await this.sock.relayMessage(chatId, payload, options);
    }
}

// ═══════════════════════════════════════════════════════════
// PARSE PRIMITIVES FROM CODE
// ═══════════════════════════════════════════════════════════
function parseAIRichCode(code) {
    const primitives = [];
    if (!code || typeof code !== 'string') return primitives;

    // Find all objects with __typename
    // Match { ... __typename: '...' ... }
    const objectRegex = /\{[\s\S]*?__typename\s*:\s*['"]([^'"]+)['"][\s\S]*?\}/g;
    let match;

    while ((match = objectRegex.exec(code)) !== null) {
        try {
            let objStr = match[0];

            // Clean JS object to JSON
            // 1. Quote unquoted keys
            objStr = objStr.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
            // 2. Single quotes to double quotes
            objStr = objStr.replace(/'/g, '"');
            // 3. Remove trailing commas
            objStr = objStr.replace(/,\s*([}\]])/g, '$1');
            // 4. Handle null values
            objStr = objStr.replace(/:\s*null/g, ': null');
            // 5. Handle true/false
            objStr = objStr.replace(/:\s*true/g, ': true');
            objStr = objStr.replace(/:\s*false/g, ': false');

            const primitive = JSON.parse(objStr);
            if (primitive && primitive.__typename) {
                primitives.push(primitive);
            }
        } catch (e) {
            console.error('[render] Parse error:', e.message);
            console.error('[render] Failed object:', match[0].substring(0, 200));
        }
    }

    return primitives;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMMAND
// ═══════════════════════════════════════════════════════════
const renderCommand = async (sock, chatId, msg, args = []) => {
    try {
        const ctx = createCtx(sock, chatId, msg, { args });
        const target = ctx.chatId || chatId || msg?.key?.remoteJid;

        if (!sock || !target) {
            console.error('[render] No sock or target');
            return false;
        }

        // ═══════════════════════════════════════
        // GET CODE INPUT (multi-source)
        // ═══════════════════════════════════════
        let inputCode = getRawText(msg);

        console.log('[render] Raw input length:', inputCode.length);
        console.log('[render] Raw input preview:', inputCode.substring(0, 100));

        // Clean command prefix
        inputCode = inputCode
            .replace(/^[\/.!?#$%^&*\-+=](render|airich|html|view|code)\s*/i, '')
            .trim();

        // If args exist, prepend them
        if (Array.isArray(args) && args.length > 0) {
            const argsText = args.join(' ');
            if (argsText && !inputCode.includes(argsText)) {
                inputCode = argsText + ' ' + inputCode;
            }
        }

        console.log('[render] Final input length:', inputCode.length);

        // If no input → show instructions
        if (!inputCode || inputCode.length < 5) {
            await sock.sendMessage(target, {
                text: `📝 AI RICH RENDERER\n━━━━━━━━━━━━━━━━━━━\n⚠️ Send AIRich code!\n━━━━━━━━━━━━━━━━━━━\n📌 Example:\n.render\nnew AIRich(conn)\n  .addSection(\n    AIRich.newLayout('Single', {\n      __typename: 'GenAIBotProgressStatusPrimitive',\n      title: 'Processing...',\n      is_in_progress: true\n    })\n  )\n  .send(m.chat)\n━━━━━━━━━━━━━━━━━━━\n📎 Or quote a message with code`
            }, { quoted: ctx.msg });
            return true;
        }

        // ═══════════════════════════════════════
        // PARSE PRIMITIVES
        // ═══════════════════════════════════════
        const primitives = parseAIRichCode(inputCode);

        console.log('[render] Parsed primitives:', primitives.length);

        if (primitives.length === 0) {
            await sock.sendMessage(target, {
                text: `❌ No AI Rich primitives found!\n━━━━━━━━━━━━━━━━━━━\n💡 Your code must contain objects with:\n__typename: 'GenAI...'\n━━━━━━━━━━━━━━━━━━━\n📌 Example:\n{\n  __typename: 'GenAIBotProgressStatusPrimitive',\n  title: 'Processing...',\n  is_in_progress: true\n}`
            }, { quoted: ctx.msg });
            return true;
        }

        // ═══════════════════════════════════════
        // SEND AI RICH
        // ═══════════════════════════════════════
        const airich = new AIRich(sock);
        for (const p of primitives) {
            airich.addSection(p);
        }

        await airich.send(target);

        console.log(`[render] ✅ Sent ${primitives.length} primitives`);
        return true;

    } catch (error) {
        console.error('[render] Error:', error?.message || error);

        try {
            const fallbackChat = chatId || msg?.key?.remoteJid;
            if (fallbackChat && sock) {
                await sock.sendMessage(fallbackChat, {
                    text: `❌ Render failed\n⚠️ ${error?.message || 'Unknown error'}`
                }, { quoted: msg });
            }
        } catch (e) {}
        return false;
    }
};

// ═══════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════
renderCommand.name = 'render';
renderCommand.aliases = ['airich', 'html', 'view', 'code'];
renderCommand.category = 'tools';
renderCommand.description = '📝 Render AIRich primitives as bot message';
renderCommand.AIRich = AIRich;

module.exports = renderCommand;