const { createCtx } = require('../lib/messageBuilder');
const { randomUUID } = require('crypto');

// ═══════════════════════════════════════════════════════════
// AI RICH PRIMITIVES
// ═══════════════════════════════════════════════════════════

const PROOF_SIGNATURE = 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==';
const CERT_CHAIN = [
    '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'
];

// ═══════════════════════════════════════════════════════════
// BUILD AI RICH PAYLOAD
// ═══════════════════════════════════════════════════════════

function buildAIRichPayload(jid, primitives) {
    const responseId = randomUUID();

    return {
        jid,
        content: {
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
                                sections: primitives.map(p => ({
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
                            forwardedAiBotMessageInfo: {
                                botJid: "867051314767696@bot"
                            },
                            forwardOrigin: 4
                        }
                    }
                }
            }
        }
    };
}

// ═══════════════════════════════════════════════════════════
// AIRich BUILDER CLASS
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

    addMetadata(text) {
        this.sections.push({
            __typename: 'GenAIMetadataTextPrimitive',
            text: text
        });
        return this;
    }

    addHtml(html) {
        this.sections.push({
            __typename: 'GenAIaeacdsnwHtmlPrimitive',
            payload: html,
            trusted_sources: []
        });
        return this;
    }

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
            image: {
                url: imageUrl,
                url_fallback: imageUrl
            }
        });
        return this;
    }

    async send(chatId, options = {}) {
        const payload = buildAIRichPayload(chatId, this.sections);
        return await this.sock.relayMessage(payload.jid, payload.content, options);
    }
}

AIRich.newLayout = (type, primitive) => primitive;

// ═══════════════════════════════════════════════════════════
// RENDER COMMAND
// ═══════════════════════════════════════════════════════════

const renderCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    // Get input
    let inputCode = '';
    const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage;

    if (args.length > 0) {
        inputCode = args.join(' ');
    } else if (quoted) {
        inputCode = quoted?.conversation ||
                    quoted?.extendedTextMessage?.text ||
                    quoted?.imageMessage?.caption ||
                    quoted?.videoMessage?.caption || '';
    } else {
        inputCode = msg?.body || msg?.text || '';
    }

    // Clean command prefix
    inputCode = inputCode.replace(/^\.?(?:render|html|view|code|airich)\s*/i, '').trim();

    if (!inputCode) {
        await sock.sendMessage(target, {
            text: `📝 AI RICH RENDERER\n━━━━━━━━━━━━━━━━━━━\n⚠️ Send HTML or text!\n━━━━━━━━━━━━━━━━━━━\n📌 Example:\n.render <div>Hello</div>\n━━━━━━━━━━━━━━━━━━━\n📎 Or quote a message`
        }, { quoted: ctx.msg });
        return false;
    }

    // Extract HTML
    let htmlCode = '';

    const fullHtml = inputCode.match(/(?:<!DOCTYPE html>\s*)?<html[\s\S]*<\/html>/i);
    const inBackticks = inputCode.match(/`([\s\S]*?(?:<style|<div|<script|<canvas)[\s\S]*?)`/i);
    const rawBlocks = inputCode.match(/(<(?:style|div|script|canvas|svg|h1|p|button|input|form|span)[\s\S]*<\/(?:style|div|script|canvas|svg|h1|p|button|input|form|span)>)/i);
    const simpleTags = inputCode.match(/<([a-z]+)[\s\S]*<\/\1>/i);

    if (fullHtml) htmlCode = fullHtml[0];
    else if (inBackticks) htmlCode = inBackticks[1];
    else if (rawBlocks) htmlCode = rawBlocks[0];
    else if (simpleTags) htmlCode = simpleTags[0];
    else {
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

    try {
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
                                messageText: "AI Rich HTML View"
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

        await sock.relayMessage(target, payload, {});
        return true;

    } catch (error) {
        console.error('[render] relay failed:', error?.message || error);

        try {
            await sock.sendMessage(target, {
                text: `❌ Failed to render\n⚠️ ${error?.message || 'Unknown error'}`
            }, { quoted: ctx.msg });
            return false;
        } catch (sendErr) {
            return false;
        }
    }
};

renderCommand.name = 'render';
renderCommand.aliases = ['html', 'view', 'code', 'airich'];
renderCommand.category = 'tools';
renderCommand.description = '📄 Render HTML as AI Rich';

renderCommand.AIRich = AIRich;

module.exports = renderCommand;