const dares = [
    "Send a funny voice message to the group!",
    "Change your profile picture to something embarrassing for 1 hour!",
    "Send your last screenshot!",
    "Type with your eyes closed for the next 5 messages!",
    "Send a message to your crush!",
    "Act like a robot for the next 3 messages!",
    "Share your most embarrassing moment!",
    "Send a selfie right now!",
    "Talk in third person for the next 10 minutes!",
    "Send your search history!",
    "Call the 5th person in your contacts!",
    "Send a voice message singing!",
    "Tell a secret nobody knows!",
    "Pretend you're a cat for 3 messages!",
    "Send the last photo you took!",
    "Write a poem about someone in this group!",
    "Use only emojis for the next 5 messages!",
    "Reveal your battery percentage!",
    "Send a message using only vowels!",
    "Describe yourself in 3 words!"
];

module.exports = async function(sock, chatId, msg) {
    const dare = dares[Math.floor(Math.random() * dares.length)];
    await sock.sendMessage(chatId, { text: `*\u1F3B2 DARE*\n\n${dare}\n\n_You must do it!_` }, { quoted: msg });
};
