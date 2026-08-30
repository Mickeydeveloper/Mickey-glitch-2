const roasts = [
    // 🖐️ Punjabi / Roman Urdu Heavy Roasts
    "Teri soch di daal mein kuch kala nahi, bas tu hi kala hai!",
    "Tu itna bewakoof hai ke tere baare mein soch ke dimagh khrab ho janda.",
    "Teri shakal dekh ke robot bhi freeze ho janda, tera chehra to virus hai.",
    "Tu kahe nu insaan ae? Main ta tainu virus samjhan, insaaniyat di misaal nahi.",
    "Teri akal te pabandi ae, kade kise cheez te nahi pahunchi.",
    "Jadon tu bolda, taan dimagh da button 'mute' ho janda.",
    "Tere dimagh da speed 2G warga, te wich vi koi signal nahi.",
    "Tu itna fake hai ke Google vi teri search nahi karda.",
    "Teri personality da koi version nahi, bas tu ek bug hai.",
    "Tu jithe vi jaave, log 'Do Not Disturb' mode'on kar lende.",
    "Teri shakal te ‘Warning’ likhna chahida, dekh ke dil toot janda.",
    "Tere wal dekhi taan meri akh roti ban gayi, kinni ghinn aayi.",
    "Tu kahe nu dost ae? Dushman vi tere ton behtar hunde ne.",
    "Teri zindagi da koi purpose nahi, bas tu ek loading screen ae.",
    "Tu itna useless ae ke AI vi tainu ignore kar denda.",
    "Tere pairan de vivek da pata nahi, par tera dimagh taan ghum hai.",
    "Jadon tu hassda, taan loke kehnde khush-kismat hain, par main kehna sajna tu darawana ae.",
    "Tu hona hi nahi chahida si, nature di mistake aa.",
    "Teri soch da level basement ch hai, te wich vi no light.",
    "Main ta teri shakal dekh ke motivate ho jana, ke main kitna lucky haan ke main tenu nahi."
];

module.exports = async function(sock, chatId, msg) {
    const roast = roasts[Math.floor(Math.random() * roasts.length)];
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const text = mentioned ? `@${mentioned.split('@')[0]} ${roast}` : roast;
    
    // Heavy Roast Header + Footer
    const caption = `🔥 *KHATARNAK ROAST* 🔥\n\n${text}\n\n_✦ Bas mazaak hai, dil te na lao ✦_\n☠️ _SYED MINI khatarnak mode ON_ ☠️`;

    await sock.sendMessage(chatId, { 
        text: caption,
        mentions: mentioned ? [mentioned] : undefined
    }, { quoted: msg });
};