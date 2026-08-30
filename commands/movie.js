const axios = require('axios');

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .movie <movie name>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: '\u1F3AC Searching movie...' }, { quoted: msg });
        
        // Using OMDB API (demo key - limited)
        const response = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(q)}&apikey=aa9e49f`, { timeout: 10000 });
        
        if (response.data.Response === 'False') {
            return await sock.sendMessage(chatId, { text: `\u274C Movie not found!\n\nSearch: https://www.imdb.com/find?q=${encodeURIComponent(q)}` }, { quoted: msg });
        }
        
        const movie = response.data;
        const text = `*\u1F3AC ${movie.Title} (${movie.Year})*\n\n` +
            `\u2B50 Rating: ${movie.imdbRating}/10\n` +
            `\u1F4DC Genre: ${movie.Genre}\n` +
            `\u23F1\uFE0F Runtime: ${movie.Runtime}\n` +
            `\u1F3AC Director: ${movie.Director}\n` +
            `\u1F464 Actors: ${movie.Actors}\n` +
            `\u1F4CB Plot: ${movie.Plot}\n\n` +
            `\u1F517 https://www.imdb.com/title/${movie.imdbID}`;
        
        if (movie.Poster && movie.Poster !== 'N/A') {
            await sock.sendMessage(chatId, { image: { url: movie.Poster }, caption: text }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text }, { quoted: msg });
        }
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
