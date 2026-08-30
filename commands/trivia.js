const trivia = [
    { q: "What is the largest planet in our solar system?", a: "Jupiter" },
    { q: "What year did World War II end?", a: "1945" },
    { q: "What is the chemical symbol for gold?", a: "Au" },
    { q: "How many continents are there?", a: "7" },
    { q: "What is the tallest mountain in the world?", a: "Mount Everest" },
    { q: "Who painted the Mona Lisa?", a: "Leonardo da Vinci" },
    { q: "What is the smallest country in the world?", a: "Vatican City" },
    { q: "What planet is known as the Red Planet?", a: "Mars" },
    { q: "How many bones does an adult human have?", a: "206" },
    { q: "What is the longest river in the world?", a: "Nile" },
    { q: "What does CPU stand for?", a: "Central Processing Unit" },
    { q: "What is the hardest natural substance on Earth?", a: "Diamond" },
    { q: "How many legs does a spider have?", a: "8" },
    { q: "What is the main gas in Earth's atmosphere?", a: "Nitrogen" },
    { q: "What year was the first iPhone released?", a: "2007" }
];

module.exports = async function(sock, chatId, msg) {
    const item = trivia[Math.floor(Math.random() * trivia.length)];
    await sock.sendMessage(chatId, { 
        text: `*\u1F3AF Trivia Time!*\n\n` +
            `${item.q}\n\n` +
            `_Answer: ${item.a}_` 
    }, { quoted: msg });
};
