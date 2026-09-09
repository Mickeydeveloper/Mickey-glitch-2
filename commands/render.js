const { createCtx } = require('../lib/messageBuilder');
const { randomUUID } = require('crypto');

function getQuotedText(msg) {
    const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage;
    return quoted?.conversation ||
        quoted?.extendedTextMessage?.text ||
        quoted?.imageMessage?.caption ||
        quoted?.videoMessage?.caption ||
        quoted?.documentMessage?.caption ||
        '';
}

function extractHtml(input) {
    const source = String(input || '').trim()
        .replace(/^```(?:html|htm)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

    const fullDocument = source.match(/(?:<!doctype html>\s*)?<html[\s\S]*<\/html>/i);
    if (fullDocument) return fullDocument[0];

    const codeBlock = source.match(/`([\s\S]*?(?:<style|<div|<script|<canvas|<section|<button)[\s\S]*?)`/i);
    const htmlBlock = source.match(/<(?:style|div|script|canvas|section|svg|h1|p|button|input|form)[\s\S]*<\/(?:style|div|script|canvas|section|svg|h1|p|button|input|form)>/i);
    const simpleTag = source.match(/<([a-z][\w-]*)[\s\S]*<\/\1>/i);
    const fragment = codeBlock?.[1] || htmlBlock?.[0] || simpleTag?.[0];

    if (fragment) {
        return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:transparent;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:10px}
</style>
</head>
<body>${fragment}</body>
</html>`;
    }

    return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{background:transparent;font-family:Arial,sans-serif;padding:20px;color:#fff}div{padding:20px;background:rgba(0,0,0,.8);border-radius:12px}</style></head>
<body><div>${source.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])}</div></body>
</html>`;
}

function buildHtmlPayload(htmlCode) {
    const responseId = `render-${Date.now()}-${randomUUID().slice(0, 6)}`;
    return {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: '',
                botResponseId: responseId
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [{ messageType: 2, messageText: '📄 HTML View' }],
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({
                            response_id: responseId,
                            sections: [{
                                view_model: {
                                    primitive: {
                                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                                        payload: htmlCode,
                                        trusted_sources: ['cylic.dev']
                                    },
                                    __typename: 'GenAISingleLayoutViewModel'
                                }
                            }]
                        })).toString('base64')
                    },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
                        forwardOrigin: 4
                    }
                }
            }
        }
    };
}

async function renderHTML(sock, chatId, msg, args = []) {
    const normalizedArgs = Array.isArray(args)
        ? args.filter((arg) => typeof arg === 'string')
        : typeof args === 'string'
            ? args.trim().split(/\s+/).filter(Boolean)
            : [];
    const ctx = createCtx(sock, chatId, msg, { args: normalizedArgs });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;
    const inputCode = getQuotedText(msg) || normalizedArgs.join(' ') || msg?.body || msg?.text || '';

    if (!sock || !target) throw new Error('Chat context is required');
    if (!inputCode.trim()) {
        await sock.sendMessage(target, {
            text: '📝 HTML RENDERER\n━━━━━━━━━━━━━━━━━━━\n⚠️ Tuma HTML code!\n━━━━━━━━━━━━━━━━━━━\n📌 Example:\n.render <div style="padding:20px">Hello</div>\n━━━━━━━━━━━━━━━━━━━\n📎 Au reply message yenye HTML code'
        }, { quoted: msg });
        return false;
    }

    try {
        await sock.relayMessage(target, buildHtmlPayload(extractHtml(inputCode)), {});
        return true;
    } catch (error) {
        console.error('[render] relay failed:', error?.message || error);
        await sock.sendMessage(target, {
            text: `❌ Failed to render HTML\n━━━━━━━━━━━━━━━━━━━\n⚠️ ${error?.message || 'Unknown error'}`
        }, { quoted: msg });
        return false;
    }
}

const renderCommand = async (sock, chatId, msg, args = []) => renderHTML(sock, chatId, msg, args);
renderCommand.name = 'render';
renderCommand.aliases = ['html', 'view', 'code'];
renderCommand.category = 'tools';
renderCommand.description = '📄 Render HTML/CSS/JS as a rich appearance';

module.exports = renderCommand;
