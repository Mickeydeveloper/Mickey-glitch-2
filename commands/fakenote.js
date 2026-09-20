/*
 * Fake Instagram Note Canvas
 * Author: Ryusei Hoshino (https://github.com/dev-ryusei-hoshino)
 * Base: -
 * Source: https://whatsapp.com/channel/0029VbDnVYyK0IBjO8RGfq3N
 * Note: Jangan di hapus we em nya, hargai dev-scraper kecil! >:(
 */

const { createCanvas, loadImage } = require('@napi-rs/canvas');

const WIDTH = 641;
const HEIGHT = 1280;
const BACKGROUND_URL = 'https://i.ibb.co.com/VY1bmDMm/bg.jpg';
const DEFAULT_AVATAR = 'https://picsum.photos/200';

async function createFakeNote({ text, photo_url: photoUrl, username }) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    await drawBackground(ctx, canvas);
    await drawProfilePhoto(ctx, photoUrl);
    drawUsername(ctx, username);
    drawMessageBubble(ctx, text);
    blurArea(ctx, canvas, 0, 0, WIDTH, HEIGHT - 325, 10);

    return canvas.encode('png');
}

async function drawBackground(ctx, canvas) {
    const image = await loadImage(BACKGROUND_URL);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
}

async function drawProfilePhoto(ctx, photoUrl) {
    const response = await fetch(photoUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch photo: ${response.status} ${response.statusText}`);
    }

    const image = await loadImage(Buffer.from(await response.arrayBuffer()));
    const avatarX = 22;
    const avatarY = 1049;
    const avatarSize = 100;
    const avatarCenterX = avatarX + avatarSize / 2;
    const avatarCenterY = avatarY + avatarSize / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(image, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.fillStyle = '#2B3036';
    ctx.beginPath();
    ctx.arc(103, 1087, 5.5, 0, Math.PI * 2);
    ctx.arc(124, 1099, 10, 0, Math.PI * 2);
    ctx.fill();
}

function drawMessageBubble(ctx, value) {
    const x = 120;
    const centerY = 1099;
    const maxWidth = 498;
    const paddingX = 24;
    const paddingY = 16;
    const radius = 35;
    const font = '18px Arial';
    const lineHeight = 24;
    const maxCharacters = 80;

    ctx.font = font;
    let text = String(value || '');
    if (text.length > maxCharacters) {
        text = `${text.slice(0, maxCharacters - 3).trimEnd()}...`;
    }

    const words = text.split(/\s+/).filter(Boolean);
    const maxTextWidth = maxWidth - paddingX * 2;
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width <= maxTextWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }

    if (currentLine) lines.push(currentLine);
    if (!lines.length) lines.push('');

    const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
    const bubbleWidth = Math.min(maxWidth, textWidth + paddingX * 2);
    const bubbleHeight = lines.length * lineHeight + paddingY * 2;
    const bubbleY = centerY - bubbleHeight / 2;
    const actualRadius = Math.min(radius, bubbleHeight / 2);

    ctx.fillStyle = '#2B3036';
    ctx.beginPath();
    ctx.roundRect(x, bubbleY, bubbleWidth, bubbleHeight, actualRadius);
    ctx.fill();

    const bubbleCenterY = bubbleY + bubbleHeight / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    lines.forEach((line, index) => {
        const lineY = bubbleCenterY + (index - (lines.length - 1) / 2) * lineHeight;
        ctx.fillText(line, x + paddingX, lineY);
    });
}

function drawUsername(ctx, value) {
    const username = String(value || 'user');
    const panelColor = '#171C20';
    const placeholderBackground = '#2B3036';

    ctx.fillStyle = panelColor;
    ctx.fillRect(190, 995, 265, 40);
    ctx.fillStyle = placeholderBackground;
    ctx.fillRect(35, 1180, 315, 45);

    const headerFont = 'bold 18px Arial';
    const nowFont = '18px Arial';
    ctx.font = headerFont;
    const usernameWidth = ctx.measureText(username).width;
    ctx.font = nowFont;
    const nowWidth = ctx.measureText(' · Now').width;
    const startX = 320 - (usernameWidth + nowWidth) / 2;

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = headerFont;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(username, startX, 1017);
    ctx.font = nowFont;
    ctx.fillStyle = '#8C9299';
    ctx.fillText(' · Now', startX + usernameWidth, 1017);
    ctx.fillStyle = '#A2A8B0';
    ctx.fillText(`Message ${username}`, 39, 1202);
}

function blurArea(ctx, canvas, x, y, width, height, blur = 10) {
    const tempCanvas = createCanvas(width, height);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(tempCanvas, x, y, width, height);
    ctx.restore();
    ctx.filter = 'none';
}

function parseInput(message) {
    const body = message?.message?.conversation
        || message?.message?.extendedTextMessage?.text
        || '';
    const input = body.replace(/^[.!/#]?fakenote\s*/i, '').trim();
    const [text = '', photoUrl = '', username = ''] = input.split('|').map((part) => part.trim());

    return {
        text,
        photo_url: photoUrl || DEFAULT_AVATAR,
        username: username || message?.pushName || 'user'
    };
}

async function fakeNoteCommand(sock, chatId, message) {
    const input = parseInput(message);

    if (!input.text) {
        return sock.sendMessage(chatId, {
            text: '*❌ Tumia:* `.fakenote text | photo_url | username`\n\nMfano: `.fakenote Habari kutoka Mickey | https://picsum.photos/200 | Mickey`'
        }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { text: '⏳ *Ninatengeneza fake Instagram note...*' }, { quoted: message });
        const image = await createFakeNote(input);
        return sock.sendMessage(chatId, {
            image,
            caption: `📝 *Fake Instagram Note*\n👤 ${input.username}`
        }, { quoted: message });
    } catch (error) {
        console.error('[FAKENOTE ERROR]', error);
        return sock.sendMessage(chatId, {
            text: `❌ *Imeshindikana kutengeneza note:* ${error.message || 'Unknown error'}`
        }, { quoted: message });
    }
}

fakeNoteCommand.name = 'fakenote';
fakeNoteCommand.description = 'Create a fake Instagram Note image';
fakeNoteCommand.category = 'EFFECTS';
fakeNoteCommand.aliases = ['finote'];

module.exports = fakeNoteCommand;
