const hadiths = [
    { text: "The strong person is not the one who can wrestle someone else down. The strong person is the one who can control himself when he is angry.", source: "Bukhari", book: "Good Manners" },
    { text: "None of you truly believes until he loves for his brother what he loves for himself.", source: "Bukhari & Muslim", book: "Faith" },
    { text: "The best among you are those who have the best manners and character.", source: "Bukhari", book: "Good Manners" },
    { text: "Whoever believes in Allah and the Last Day, let him say something good or remain silent.", source: "Bukhari & Muslim", book: "Good Manners" },
    { text: "A Muslim is the one from whose tongue and hands the Muslims are safe.", source: "Bukhari", book: "Faith" },
    { text: "The most beloved deeds to Allah are those done consistently, even if they are small.", source: "Bukhari & Muslim", book: "Good Deeds" },
    { text: " Allah does not look at your forms or your possessions, but He looks at your hearts and your deeds.", source: "Muslim", book: "Righteousness" },
    { text: "Seeking knowledge is an obligation upon every Muslim.", source: "Ibn Majah", book: "Knowledge" },
    { text: "The world is a prison for the believer and a paradise for the disbeliever.", source: "Muslim", book: "Asceticism" },
    { text: "He who does not thank people, does not thank Allah.", source: "Abu Dawood", book: "Good Manners" }
];

module.exports = async function(sock, chatId, msg) {
    const hadith = hadiths[Math.floor(Math.random() * hadiths.length)];
    
    await sock.sendMessage(chatId, { 
        text: `*\u1F4D6 Hadith of the Day*\n\n` +
            `"${hadith.text}"\n\n` +
            `_Source: ${hadith.source}_\n` +
            `_Book: ${hadith.book}_` 
    }, { quoted: msg });
};
