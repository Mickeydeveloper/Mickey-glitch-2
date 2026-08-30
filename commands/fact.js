const facts = [
    "Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible!",
    "Octopuses have three hearts, blue blood, and nine brains!",
    "Bananas are berries, but strawberries aren't!",
    "A day on Venus is longer than a year on Venus!",
    "Wombat poop is cube-shaped!",
    "The Eiffel Tower can grow by 6 inches in summer due to heat expansion!",
    "Sloths can hold their breath longer than dolphins - up to 40 minutes!",
    "There's a species of jellyfish that is biologically immortal!",
    "The shortest war in history lasted only 38 minutes!",
    "A group of flamingos is called a 'flamboyance'!",
    "Butterflies taste with their feet!",
    "The human nose can detect over 1 trillion different scents!",
    "Cows have best friends and get stressed when separated!",
    "There's enough gold inside Earth to coat the entire planet!",
    "Sharks have been around longer than trees!"
];

module.exports = async function(sock, chatId, msg) {
    const fact = facts[Math.floor(Math.random() * facts.length)];
    await sock.sendMessage(chatId, { text: `*\u1F4DA Did You Know?*\n\n${fact}\n\n_Interesting, right?_` }, { quoted: msg });
};
