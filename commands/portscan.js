const net = require('net');

function scanPort(host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);
        socket.on('connect', () => { socket.destroy(); resolve({ port, open: true }); });
        socket.on('timeout', () => { socket.destroy(); resolve({ port, open: false }); });
        socket.on('error', () => { socket.destroy(); resolve({ port, open: false }); });
        socket.connect(port, host);
    });
}

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '\u26A0\uFE0F .portscan <ip/domain>' }, { quoted: msg });
    
    try {
        await sock.sendMessage(chatId, { text: `\u1F50E Scanning ${q}...\nCommon ports only (fast scan)` }, { quoted: msg });
        
        const commonPorts = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 5432, 5900, 8080, 8443];
        const results = [];
        
        for (const port of commonPorts) {
            const result = await scanPort(q, port);
            if (result.open) results.push(port);
        }
        
        const serviceNames = {
            21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
            80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS', 445: 'SMB',
            3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL', 5900: 'VNC', 8080: 'HTTP-Alt', 8443: 'HTTPS-Alt'
        };
        
        let text = `*\u1F50E Port Scan: ${q}*\n\n`;
        if (results.length === 0) {
            text += 'No open ports found among common ports.';
        } else {
            text += `*Open Ports (${results.length}):*\n`;
            results.forEach(p => { text += `\u2705 ${p} - ${serviceNames[p] || 'Unknown'}\n`; });
        }
        text += `\n\n_Scanned ${commonPorts.length} common ports_`;
        
        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '\u274C Error: ' + e.message }, { quoted: msg });
    }
};
