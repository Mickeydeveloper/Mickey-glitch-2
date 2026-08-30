const riddles = [
    { q: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", a: "A map" },
    { q: "What has keys but no locks?", a: "A keyboard" },
    { q: "What has a head and a tail but no body?", a: "A coin" },
    { q: "What gets wet while drying?", a: "A towel" },
    { q: "What can travel around the world while staying in a corner?", a: "A stamp" },
    { q: "What has an eye but cannot see?", a: "A needle" },
    { q: "What has hands but cannot clap?", a: "A clock" },
    { q: "The more you take, the more you leave behind. What am I?", a: "Footsteps" },
    { q: "What has a neck but no head?", a: "A bottle" },
    { q: "What belongs to you but others use it more than you?", a: "Your name" }
];

module.exports = async function(sock, chatId, msg) {
    const riddle = riddles[Math.floor(Math.random() * riddles.length)];
    await sock.sendMessage(chatId, { 
        text: `*\u1F9E9 Riddle*\n\n` +
            `${riddle.q}\n\n` +
            `*Answer:* ||${riddle.a}||` 
    }, { quoted: msg });
};
