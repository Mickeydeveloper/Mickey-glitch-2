module.exports = async function(sock, from, msg, session, args) {
    const text = args.join(' ');
    
    // Extract target from mention or quoted message
    let target = msg.mentionedJid?.[0] || msg.quoted?.sender || null;
    let name = text ? text.trim().toLowerCase() : '';
    
    // If no target and no name, show usage
    if (!target && !name) {
        return await sock.sendMessage(from, { 
            text: "❌ Example: .gali name or .gali @user" 
        }, { quoted: msg });
    }

    // Add a reaction (optional, like in the first version)
    await sock.sendMessage(from, { react: { text: '🤬', key: msg.key } });

    // Get sender JID for blocked replies
    const sender = msg.key.participant || msg.key.remoteJid;

    // Blocked names (hardcoded)
    let blocked = ['syed hacker', 'syed', 'wajahat'];
    if (blocked.includes(name)) {
        let blockedReplies = [
            `${name.toUpperCase()} *_Tari maa ka sath soya tha? Laudy_*`,
            `${name.toUpperCase()} *_Tari amma ka yaar ha...?_*`
        ];
        let randomBlocked = blockedReplies[Math.floor(Math.random() * blockedReplies.length)];
        return await sock.sendMessage(from, { 
            text: randomBlocked, 
            mentions: [sender] 
        }, { quoted: msg });
    }

    // List of insults (same as original)
    let galis = [
        `${name || '@' + target?.split('@')[0]} - *_teri mkc bc laudy gando bsdk bkl 💀 (3 baar)_*`,
        `${name || '@' + target?.split('@')[0]} - *_salay tata madarchod randwe gando mkc Tari 🤡 (2 baar)_*`,
        `${name || '@' + target?.split('@')[0]} - *_bkl habshi ki paidaawar barhwy mkc tari😈 (4 baar)_*`,
        `${name || '@' + target?.split('@')[0]} *_Teri MKC Randi K Bachy (7 baar)🤡🚮_*`,
        `${name || '@' + target?.split('@')[0]} *_Idher a Teri Mama K Oper Charh kr Dance krun🤡🥹_*`,
        `${name || '@' + target?.split('@')[0]} *_Hi YATEEM TATTY Idher A Lun pr Beth kr Jholly kha_*`,
        `${name || '@' + target?.split('@')[0]} *_Teri Ama Dy Akha Vch Akha Paa k Ondy Mou Vch Lul🤡🚮_*`,
        `${name || '@' + target?.split('@')[0]} *_Idher A O Pooli Bondd Aliya🥸🤡_*`
    ];

    let randomGali = galis[Math.floor(Math.random() * galis.length)];

    // Prepare send options, mention target if available
    let sendOptions = { text: randomGali };
    if (target) {
        sendOptions.mentions = [target];
    }

    await sock.sendMessage(from, sendOptions, { quoted: msg });
};