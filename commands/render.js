const { createCtx } = require('../lib/messageBuilder');
const { randomUUID } = require('crypto');

// ═══════════════════════════════════════════════════════════
// PROOF SIGNATURE & CERT CHAIN (AI Rich)
// ═══════════════════════════════════════════════════════════
const PROOF_SIGNATURE = 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==';
const CERT_CHAIN = [
    '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'
];

// ═══════════════════════════════════════════════════════════
// AIRich CLASS - For building AI Rich responses
// ═══════════════════════════════════════════════════════════
class AIRich {
    constructor(sock) {
        this.sock = sock;
        this.sections = [];
    }

    /**
     * Add a section/primitive to the response
     * @param {Object} primitive - The primitive object
     * @returns {AIRich} - this (for chaining)
     */
    addSection(primitive) {
        this.sections.push(primitive);
        return this;
    }

    /**
     * Create a new layout wrapper
     * @param {string} type - Layout type (e.g. 'Single')
     * @param {Object} primitive - The primitive data
     * @returns {Object} - Wrapped primitive
     */
    static newLayout(type, primitive) {
        return primitive;
    }

    /**
     * Add progress status
     */
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

    /**
     * Add text
     */
    addText(text) {
        this.sections.push({
            __typename: 'GenAIMarkdownTextUXPrimitive',
            text: text
        });
        return this;
    }

    /**
     * Add metadata text
     */
    addMetadata(text) {
        this.sections.push({
            __typename: 'GenAIMetadataTextPrimitive',
            text: text
        });
        return this;
    }

    /**
     * Add HTML content
     */
    addHtml(html) {
        this.sections.push({
            __typename: 'GenAIaeacdsnwHtmlPrimitive',
            payload: html,
            trusted_sources: []
        });
        return this;
    }

    /**
     * Add image
     */
    addImage(url) {
        this.sections.push({
            __typename: 'GenAIImaginePrimitive',
            media: {
                url: url,
                mime_type: 'image/png',
                width: 16,
                height: 9
            },
            imagine_type: 'IMAGE',
            status: {
                status: 'READY'
            }
        });
        return this;
    }

    /**
     * Add entity card
     */
    addEntity(title, subtitle, entityUrl, imageUrl, secondarySubtitle = 'Verified') {
        this.sections.push({
            __typename: 'GenAICompactEntityPrimitive',
            title: title,
            subtitle: subtitle,
            secondary_subtitle: secondarySubtitle,
            entity_id: Date.now(),
            entity_url: entityUrl,
            entity_type: 'PAGE',
            action_type: 'FOLLOW',
            is_verified: true,
            image: {
                url: imageUrl,
                url_fallback: imageUrl
            }
        });
        return this;
    }

    /**
     * Send the response
     */
    async send(chatId, options = {}) {
        if (!this.sock || !chatId) {
            throw new Error('Sock and chatId are required');
        }

        if (this.sections.length === 0) {
            throw new Error('No sections added');
        }

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
                        submessages: [
                            {
                                messageType: 2,
                                messageText: "AI Rich Response"
                            }
                        ],
                        unifiedResponse: {
                            data: Buffer.from(JSON.stringify({
                                response_id: responseId,
                                sections: this.sections.map(primitive => ({
                                    view_model: {
                                        primitive: primitive,
                                        __typename: "GenAISingleLayoutViewModel"
                                    }
                                }))
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

        return await this.sock.relayMessage(chatId, payload, options);
    }
}

// ═══════════════════════════════════════════════════════════
// CODE PARSER - Extract primitives from code
// ═══════════════════════════════════════════════════════════
function parseAIRichCode(code) {
    const primitives = [];

    // 1. Match addSection({...}) or AIRich.newLayout(..., {...})
    const sectionRegex = /(?:addSection|newLayout)\s*\([^,]*?,\s*(\{[\s\S]*?\})\s*\)/g;
    let match;

    while ((match = sectionRegex.exec(code)) !== null) {
        try {
            // Clean the object string
            let objStr = match[1];
            
            // Convert JS object to JSON (handle single quotes, trailing commas)
            objStr = objStr
                .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":') // Quote keys
                .replace(/'/g, '"')                                                // Single to double quotes
                .replace(/,\s*([}\]])/g, '$1');                                    // Remove trailing commas

            const primitive = JSON.parse(objStr);
            primitives.push(primitive);
        } catch (e) {
            console.error('[render] Failed to parse primitive:', e.message);
        }
    }

    // 2. If no primitives found, try to find raw __typename objects
    if (primitives.length === 0) {
        const typenameRegex = /\{[^{}]*__typename\s*:\s*['"]([^'"]+)['"][^{}]*\}/g;
        while ((match = typenameRegex.exec(code)) !== null) {
            try {
                let objStr = match[0]
                    .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
                    .replace(/'/g, '"')
                    .replace(/,\s*([}\]])/g, '$1');

                const primitive = JSON.parse(objStr);
                primitives.push(primitive);
            } catch (e) {}
        }
    }

    return primitives;
}

// ═══════════════════════════════════════════════════════════
// RENDER COMMAND
// ═══════════════════════════════════════════════════════════
const renderCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    // ═══════════════════════════════════════
    // GET CODE INPUT
    // ═══════════════════════════════════════
    let inputCode = '';

    // From quoted message
    const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage;
    if (quoted) {
        inputCode = quoted?.conversation ||
                    quoted?.extendedTextMessage?.text ||
                    quoted?.imageMessage?.caption ||
                    quoted?.videoMessage?.caption ||
                    quoted?.documentMessage?.caption || '';
    }

    // From args
    if (!inputCode && args.length > 0) {
        inputCode = args.join(' ');
    }

    // From body
    if (!inputCode) {
        const body = msg?.body || msg?.text || '';
        inputCode = body.replace(/^[\/.!?#$%^&*\-+=]\S+\s*/, '').trim();
    }

    if (!inputCode) {
        await sock.sendMessage(target, {
            text: `📝 AI RICH RENDERER\n━━━━━━━━━━━━━━━━━━━\n⚠️ Send AIRich code!\n━━━━━━━━━━━━━━━━━━━\n📌 Example:\nnew AIRich(conn)\n  .addSection(\n    AIRich.newLayout('Single', {\n      __typename: 'GenAIBotProgressStatusPrimitive',\n      title: 'Processing...',\n      is_in_progress: true\n    })\n  )\n  .send(m.chat)\n━━━━━━━━━━━━━━━━━━━\n📎 Or quote a message with code`
        }, { quoted: ctx.msg });
        return false;
    }

    // ═══════════════════════════════════════
    // PARSE PRIMITIVES
    // ═══════════════════════════════════════
    const primitives = parseAIRichCode(inputCode);

    if (primitives.length === 0) {
        await sock.sendMessage(target, {
            text: `❌ No AI Rich primitives found in code!\n━━━━━━━━━━━━━━━━━━━\n💡 Make sure your code contains:\n• addSection({...})\n• OR objects with __typename`
        }, { quoted: ctx.msg });
        return false;
    }

    // ═══════════════════════════════════════
    // SEND AI RICH
    // ═══════════════════════════════════════
    try {
        const airich = new AIRich(sock);
        for (const primitive of primitives) {
            airich.addSection(primitive);
        }
        await airich.send(target);

        console.log(`[render] Sent ${primitives.length} primitives`);
        return true;

    } catch (error) {
        console.error('[render] Error:', error?.message || error);

        try {
            await sock.sendMessage(target, {
                text: `❌ Failed to send AI Rich\n━━━━━━━━━━━━━━━━━━━\n⚠️ Error: ${error?.message || 'Unknown error'}`
            }, { quoted: ctx.msg });
            return false;
        } catch (e) {
            return false;
        }
    }
};

// ═══════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════
renderCommand.name = 'render';
renderCommand.aliases = ['html', 'view', 'code', 'airich'];
renderCommand.category = 'tools';
renderCommand.description = '📄 Render AIRich primitives as bot message';

// Expose AIRich class for external use
renderCommand.AIRich = AIRich;

module.exports = renderCommand;