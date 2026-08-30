const morseCode = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
    '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
    '9': '----.', '0': '-----', ' ': '/'
};

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .morse <text>' }, { quoted: msg });
    
    const text = q.toUpperCase();
    let encoded = '';
    
    for (const char of text) {
        encoded += (morseCode[char] || char) + ' ';
    }
    
    await sock.sendMessage(chatId, { 
        text: `*\u1F4E3 Morse Code*\n\nText: ${q}\n\nMorse:\n${encoded.trim()}` 
    }, { quoted: msg });
};
