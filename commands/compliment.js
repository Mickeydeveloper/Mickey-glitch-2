const compliments = [
    "You're more fun than a ball pit filled with candy!",
    "You're like a ray of sunshine on a rainy day!",
    "You have the best smile!",
    "You're more helpful than you realize.",
    "You bring out the best in people.",
    "You're even better than a unicorn because you're real!",
    "You have a great sense of humor!",
    "You're one of a kind!",
    "You make a bigger impact than you think.",
    "You're awesome at being you!",
    "Your creativity knows no bounds!",
    "You have an amazing personality!",
    "You're a true friend!",
    "You make everything better just by being there!",
    "You're incredibly talented!"
];

module.exports = async function(sock, chatId, msg) {
    const compliment = compliments[Math.floor(Math.random() * compliments.length)];
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const text = mentioned ? `@${mentioned.split('@')[0]}, ${compliment}` : compliment;
    
    await sock.sendMessage(chatId, { 
        text: `*\u1F48C COMPLIMENT*\n\n${text}\n\n_You deserve it!_`,
        mentions: mentioned ? [mentioned] : undefined
    }, { quoted: msg });
};
