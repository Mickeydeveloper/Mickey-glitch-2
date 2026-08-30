const wyrQuestions = [
    "Would you rather be able to fly or be invisible?",
    "Would you rather be the richest person in the world or the smartest?",
    "Would you rather never use social media again or never watch TV again?",
    "Would you rather have a time machine or a teleporter?",
    "Would you rather be famous or be the best friend of someone famous?",
    "Would you rather always be 10 minutes late or always 20 minutes early?",
    "Would you rather have unlimited money or unlimited knowledge?",
    "Would you rather be able to speak all languages or play all instruments?",
    "Would you rather live in space or underwater?",
    "Would you rather never eat your favorite food again or only eat your favorite food?",
    "Would you rather have super strength or super speed?",
    "Would you rather be able to read minds or see the future?",
    "Would you rather live without music or without movies?",
    "Would you rather be the funniest person or the most attractive?",
    "Would you rather have a rewind button or a pause button for your life?"
];

module.exports = async function(sock, chatId, msg) {
    const question = wyrQuestions[Math.floor(Math.random() * wyrQuestions.length)];
    await sock.sendMessage(chatId, { 
        text: `*\u1F914 Would You Rather?*\n\n` +
            `${question}\n\n` +
            `_Reply with your choice!_` 
    }, { quoted: msg });
};
