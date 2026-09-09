const util = require('util');
const { AIRich } = require('../lib/messageBuilder');

function getQuotedText(msg) {
    const quoted = msg?.quoted || msg?.msg?.contextInfo?.quotedMessage;
    return quoted?.conversation || quoted?.extendedTextMessage?.text || '';
}

function normalizeSource(args, msg) {
    return (getQuotedText(msg) || (Array.isArray(args) ? args.join(' ') : String(args || ''))).trim();
}

function extractFunctionSource(source) {
    return String(source || '')
        .replace(/^```(?:js|javascript)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
}

function createPreviewSocket(sock) {
    const calls = [];
    const previewSocket = new Proxy(sock, {
        get(target, property, receiver) {
            if (property === 'relayMessage' || property === 'sendMessage') {
                return async (...args) => {
                    calls.push({ method: property, args });
                    return { preview: true };
                };
            }
            return Reflect.get(target, property, receiver);
        }
    });
    return { previewSocket, calls };
}

async function runAirichFunction(source, sock, chatId, msg, args) {
    const functionSource = extractFunctionSource(source);
    const match = functionSource.match(/(?:module\.exports\s*=\s*)?(async\s+)?function\s*\w*\s*\([^)]*\)|(?:module\.exports\s*=\s*)?(async\s*)?\([^)]*\)\s*=>/);
    if (!match) throw new Error('Tuma function ya AIRich, mfano: async (sock, chatId, msg) => { ... }');

    const factory = new Function('AIRich', 'require', `return (${functionSource});`);
    const handler = factory(AIRich, require);
    if (typeof handler !== 'function') throw new Error('Source haijatoa function halali.');

    const { previewSocket, calls } = createPreviewSocket(sock);
    const result = await handler(previewSocket, chatId, msg, args, { preview: true, AIRich });
    return { result, calls, source: functionSource };
}

async function airichPreviewCommand(sock, chatId, msg, args = []) {
    const source = normalizeSource(args, msg);
    if (!source) {
        await sock.sendMessage(chatId, {
            text: '🧩 AIRich PREVIEW\n━━━━━━━━━━━━━━━━━━━\nTuma function ya AIRich au reply code.\n\nMfano:\n.airichpreview async (sock, chatId) => {\n  const rich = new AIRich(sock).setTitle("Demo").addText("Hello");\n  await rich.send(chatId);\n}'
        }, { quoted: msg });
        return false;
    }

    try {
        const preview = await runAirichFunction(source, sock, chatId, msg, args);
        const callText = preview.calls.length
            ? preview.calls.map((call, index) => `Call ${index + 1}: ${call.method}\n${util.inspect(call.args, { depth: 5, colors: false, maxArrayLength: 20 })}`).join('\n\n')
            : 'Function haikuita rich.send() au relayMessage().';
        const resultText = preview.result === undefined ? '' : `\n\nResult:\n${util.inspect(preview.result, { depth: 4, colors: false })}`;
        await sock.sendMessage(chatId, {
            text: `🧩 AIRich PREVIEW\n━━━━━━━━━━━━━━━━━━━\n✅ Function ime-run kwenye preview mode.\n\n💻 Function code:\n\`\`\`javascript\n${preview.source}\n\`\`\`\n\n📦 AIRich payload calls:\n${callText}${resultText}`
        }, { quoted: msg });
        return true;
    } catch (error) {
        await sock.sendMessage(chatId, {
            text: `❌ AIRich preview failed:\n${error?.stack || error?.message || error}`
        }, { quoted: msg });
        return false;
    }
}

airichPreviewCommand.name = 'airichpreview';
airichPreviewCommand.aliases = ['airpreview', 'richpreview', 'airich'];
airichPreviewCommand.category = 'tools';
airichPreviewCommand.description = 'Preview AIRich function payload without sending it';

module.exports = airichPreviewCommand;
