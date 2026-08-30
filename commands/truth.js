const truths = [
    "What's the most embarrassing thing you've ever done?",
    "Have you ever lied to your best friend?",
    "What's your biggest fear?",
    "Who was your first crush?",
    "What's the worst trouble you've ever been in?",
    "Have you ever cheated on a test?",
    "What's the most expensive thing you've broken?",
    "What's a secret you've never told anyone?",
    "What's the weirdest dream you've ever had?",
    "Have you ever stalked someone on social media?",
    "What's the most childish thing you still do?",
    "What's the worst gift you've ever received?",
    "Have you ever pretended to be sick to avoid something?",
    "What's your most annoying habit?",
    "What's the strangest place you've fallen asleep?",
    "Have you ever eaten something off the floor?",
    "What's the worst date you've ever been on?",
    "What's something you're really bad at?",
    "Have you ever been caught doing something you shouldn't?",
    "What's the most ridiculous thing you've cried about?"
];

module.exports = async function(sock, chatId, msg) {
    const truth = truths[Math.floor(Math.random() * truths.length)];
    await sock.sendMessage(chatId, { text: `*\u1F9E9 TRUTH*\n\n${truth}\n\n_Answer honestly!_` }, { quoted: msg });
};
