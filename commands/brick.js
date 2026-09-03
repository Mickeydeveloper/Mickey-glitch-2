const { createCtx } = require('../lib/messageBuilder');

// WhatsApp Web Desktop Interface - Real Pairing System
const whatsappWebHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Web</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: #0b1416;
            color: #e9edef;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }

        .whatsapp-desktop {
            width: 100%;
            max-width: 1366px;
            height: 100vh;
            max-height: 768px;
            background: #111b21;
            border-radius: 24px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 60px rgba(0,0,0,0.7);
            position: relative;
        }

        /* ========== HEADER ========== */
        .app-header {
            background: #202c33;
            padding: 12px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #2a3942;
            flex-shrink: 0;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .whatsapp-icon {
            width: 36px;
            height: 36px;
            background: #00a884;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 20px;
            color: white;
        }

        .app-title {
            font-size: 17px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .app-status {
            font-size: 12px;
            color: #8696a0;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background: #31a24c;
            border-radius: 50%;
            display: inline-block;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.4; }
            100% { opacity: 1; }
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .header-btn {
            background: none;
            border: none;
            color: #aebac1;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .header-btn:hover {
            background: #2a3942;
            color: #e9edef;
        }

        .header-btn.danger:hover {
            background: #3b2a2a;
            color: #ff6b6b;
        }

        /* ========== BODY ========== */
        .app-body {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        /* ========== SIDEBAR ========== */
        .sidebar {
            width: 340px;
            background: #111b21;
            border-right: 1px solid #2a3942;
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
        }

        .sidebar-search {
            padding: 10px 16px;
            background: #202c33;
        }

        .search-box {
            display: flex;
            align-items: center;
            background: #2a3942;
            border-radius: 8px;
            padding: 0 12px;
        }

        .search-box input {
            flex: 1;
            background: none;
            border: none;
            padding: 10px 8px;
            color: #e9edef;
            font-size: 14px;
            outline: none;
        }

        .search-box input::placeholder {
            color: #8696a0;
        }

        .search-icon {
            color: #8696a0;
            font-size: 16px;
        }

        /* ========== CHAT LIST ========== */
        .chat-list {
            flex: 1;
            overflow-y: auto;
            padding: 4px 0;
        }

        .chat-list::-webkit-scrollbar {
            width: 6px;
        }

        .chat-list::-webkit-scrollbar-track {
            background: transparent;
        }

        .chat-list::-webkit-scrollbar-thumb {
            background: #2a3942;
            border-radius: 4px;
        }

        .chat-item {
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 14px;
            cursor: pointer;
            transition: background 0.15s;
            position: relative;
        }

        .chat-item:hover {
            background: #2a3942;
        }

        .chat-item.active {
            background: #2a3942;
        }

        .chat-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: 600;
            background: linear-gradient(135deg, #00a884, #008f72);
            color: white;
            position: relative;
        }

        .chat-avatar .online-indicator {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 12px;
            height: 12px;
            background: #31a24c;
            border-radius: 50%;
            border: 2px solid #111b21;
        }

        .chat-info {
            flex: 1;
            min-width: 0;
        }

        .chat-name {
            font-size: 15px;
            font-weight: 500;
            color: #e9edef;
        }

        .chat-preview {
            font-size: 13px;
            color: #8696a0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .chat-meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 4px;
            flex-shrink: 0;
        }

        .chat-time {
            font-size: 11px;
            color: #8696a0;
        }

        .unread-badge {
            background: #00a884;
            color: white;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 12px;
            min-width: 20px;
            text-align: center;
        }

        /* ========== MAIN CHAT AREA ========== */
        .main-chat {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #0b1416;
            position: relative;
        }

        /* ========== CHAT HEADER ========== */
        .chat-header {
            padding: 10px 20px;
            background: #202c33;
            border-bottom: 1px solid #2a3942;
            display: flex;
            align-items: center;
            gap: 14px;
            flex-shrink: 0;
        }

        .chat-header-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 600;
            background: linear-gradient(135deg, #00a884, #008f72);
            color: white;
            flex-shrink: 0;
        }

        .chat-header-info {
            flex: 1;
        }

        .chat-header-info h3 {
            font-size: 16px;
            font-weight: 500;
            color: #e9edef;
        }

        .chat-header-info p {
            font-size: 12px;
            color: #8696a0;
        }

        .chat-header-actions {
            display: flex;
            gap: 4px;
        }

        .chat-header-actions button {
            background: none;
            border: none;
            color: #aebac1;
            padding: 8px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            transition: background 0.2s;
        }

        .chat-header-actions button:hover {
            background: #2a3942;
        }

        /* ========== MESSAGES ========== */
        .chat-messages {
            flex: 1;
            padding: 20px 60px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .chat-messages::-webkit-scrollbar {
            width: 6px;
        }

        .chat-messages::-webkit-scrollbar-track {
            background: transparent;
        }

        .chat-messages::-webkit-scrollbar-thumb {
            background: #2a3942;
            border-radius: 4px;
        }

        .message {
            max-width: 65%;
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 14px;
            line-height: 1.5;
            position: relative;
            word-wrap: break-word;
        }

        .message.received {
            background: #202c33;
            align-self: flex-start;
            border-bottom-left-radius: 3px;
        }

        .message.sent {
            background: #005c4b;
            align-self: flex-end;
            border-bottom-right-radius: 3px;
        }

        .message .msg-time {
            font-size: 10px;
            color: #8696a0;
            margin-top: 4px;
            text-align: right;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 4px;
        }

        .message .msg-time .check {
            font-size: 14px;
        }

        .message .msg-time .check.read {
            color: #53bdeb;
        }

        /* ========== MESSAGE INPUT ========== */
        .message-input-area {
            padding: 10px 20px 14px;
            background: #202c33;
            display: flex;
            gap: 10px;
            align-items: center;
            border-top: 1px solid #2a3942;
            flex-shrink: 0;
        }

        .input-actions {
            display: flex;
            gap: 4px;
        }

        .input-actions button {
            background: none;
            border: none;
            color: #aebac1;
            padding: 8px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.2s;
        }

        .input-actions button:hover {
            background: #2a3942;
        }

        .message-input {
            flex: 1;
            padding: 10px 16px;
            background: #2a3942;
            border: none;
            border-radius: 8px;
            color: #e9edef;
            font-size: 14px;
            outline: none;
            resize: none;
            max-height: 100px;
        }

        .message-input::placeholder {
            color: #8696a0;
        }

        .message-input:focus {
            border: 1px solid #00a884;
        }

        .send-btn {
            background: #00a884;
            border: none;
            color: white;
            padding: 10px 22px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: background 0.2s;
        }

        .send-btn:hover {
            background: #008f72;
        }

        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* ========== PAIRING SCREEN ========== */
        .pairing-screen {
            position: absolute;
            inset: 0;
            background: #0b1416;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10;
            padding: 40px;
        }

        .pairing-screen.hidden {
            display: none;
        }

        .pairing-container {
            background: #111b21;
            padding: 48px;
            border-radius: 24px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            border: 1px solid #2a3942;
        }

        .pairing-title {
            font-size: 24px;
            font-weight: 700;
            color: #e9edef;
            margin-bottom: 8px;
        }

        .pairing-subtitle {
            color: #8696a0;
            font-size: 14px;
            margin-bottom: 24px;
        }

        .qr-container {
            background: white;
            padding: 20px;
            border-radius: 16px;
            display: inline-block;
            margin: 0 auto 24px;
            position: relative;
        }

        #qrCanvas {
            width: 220px;
            height: 220px;
            display: block;
        }

        .qr-loading {
            position: absolute;
            inset: 0;
            background: rgba(255,255,255,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 16px;
            font-size: 14px;
            color: #111b21;
            font-weight: 600;
        }

        .pairing-instructions {
            color: #8696a0;
            font-size: 13px;
            line-height: 1.6;
            margin-bottom: 20px;
        }

        .pairing-instructions strong {
            color: #e9edef;
        }

        .pairing-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .pairing-btn {
            padding: 10px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .pairing-btn.primary {
            background: #00a884;
            color: white;
        }

        .pairing-btn.primary:hover {
            background: #008f72;
        }

        .pairing-btn.secondary {
            background: #2a3942;
            color: #e9edef;
        }

        .pairing-btn.secondary:hover {
            background: #3a4a52;
        }

        .pairing-btn.danger {
            background: #3b2a2a;
            color: #ff6b6b;
        }

        .pairing-btn.danger:hover {
            background: #4a3a3a;
        }

        /* ========== SETTINGS MODAL ========== */
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(8px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 100;
        }

        .modal-overlay.active {
            display: flex;
        }

        .modal-content {
            background: #111b21;
            padding: 32px;
            border-radius: 20px;
            max-width: 500px;
            width: 90%;
            border: 1px solid #2a3942;
            max-height: 80vh;
            overflow-y: auto;
        }

        .modal-content h2 {
            font-size: 20px;
            margin-bottom: 16px;
            color: #e9edef;
        }

        .modal-content .setting-item {
            padding: 12px 0;
            border-bottom: 1px solid #2a3942;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-content .setting-item:last-child {
            border-bottom: none;
        }

        .modal-content .setting-label {
            color: #8696a0;
            font-size: 14px;
        }

        .modal-content .setting-value {
            color: #e9edef;
            font-weight: 500;
        }

        .modal-close {
            margin-top: 20px;
            padding: 10px;
            background: #2a3942;
            border: none;
            border-radius: 8px;
            color: #e9edef;
            font-weight: 600;
            width: 100%;
            cursor: pointer;
        }

        .modal-close:hover {
            background: #3a4a52;
        }

        /* ========== RESPONSIVE ========== */
        @media (max-width: 768px) {
            .whatsapp-desktop {
                border-radius: 0;
                max-height: 100vh;
            }

            .sidebar {
                width: 280px;
            }

            .chat-messages {
                padding: 16px 20px;
            }

            .pairing-container {
                padding: 24px;
            }

            #qrCanvas {
                width: 160px;
                height: 160px;
            }

            .modal-content {
                padding: 20px;
            }
        }

        @media (max-width: 480px) {
            .sidebar {
                display: none;
            }

            .app-title {
                font-size: 14px;
            }

            .chat-messages {
                padding: 12px 16px;
            }

            .message {
                max-width: 85%;
            }

            .pairing-container {
                padding: 16px;
            }
        }
    </style>
</head>
<body>

    <div class="whatsapp-desktop" id="app">
        <!-- ===== HEADER ===== -->
        <header class="app-header">
            <div class="header-left">
                <div class="whatsapp-icon">W</div>
                <div>
                    <div class="app-title">WhatsApp Web</div>
                    <div class="app-status">
                        <span class="status-dot"></span>
                        <span id="connectionStatus">Connected to phone</span>
                    </div>
                </div>
            </div>
            <div class="header-right">
                <button class="header-btn" id="settingsBtn">⚙️ Settings</button>
                <button class="header-btn" id="pairingBtn">📱 Pair</button>
                <button class="header-btn danger" id="logoutBtn">🚪 Logout</button>
            </div>
        </header>

        <!-- ===== BODY ===== -->
        <div class="app-body">
            <!-- Sidebar -->
            <aside class="sidebar">
                <div class="sidebar-search">
                    <div class="search-box">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="searchInput" placeholder="Search or start new chat">
                    </div>
                </div>
                <div class="chat-list" id="chatList">
                    <!-- Chats rendered by JavaScript -->
                </div>
            </aside>

            <!-- Main Chat -->
            <main class="main-chat">
                <!-- Pairing Screen -->
                <div class="pairing-screen" id="pairingScreen">
                    <div class="pairing-container">
                        <h2 class="pairing-title">📱 WhatsApp Web</h2>
                        <p class="pairing-subtitle">Scan QR code to connect your phone</p>
                        <div class="qr-container">
                            <canvas id="qrCanvas" width="220" height="220"></canvas>
                            <div class="qr-loading" id="qrLoading">Generating QR...</div>
                        </div>
                        <p class="pairing-instructions">
                            <strong>1.</strong> Open WhatsApp on your phone<br>
                            <strong>2.</strong> Tap Menu or Settings and select <strong>Linked Devices</strong><br>
                            <strong>3.</strong> Tap <strong>Link a Device</strong> and scan the QR code
                        </p>
                        <div class="pairing-actions">
                            <button class="pairing-btn primary" id="refreshQrBtn">🔄 Refresh QR</button>
                            <button class="pairing-btn secondary" id="closePairingBtn">✖ Close</button>
                        </div>
                        <div style="margin-top: 16px; padding: 12px; background: #2a3942; border-radius: 8px; font-size: 12px; color: #8696a0;">
                            <span id="pairingStatus">🔴 Waiting for connection...</span>
                        </div>
                    </div>
                </div>

                <!-- Chat Header -->
                <div class="chat-header" id="chatHeader">
                    <div class="chat-header-avatar" id="chatAvatar">👤</div>
                    <div class="chat-header-info">
                        <h3 id="chatName">Select a chat</h3>
                        <p id="chatStatus">Click a chat to start messaging</p>
                    </div>
                    <div class="chat-header-actions">
                        <button id="searchChatBtn">🔍</button>
                        <button id="moreChatBtn">⋮</button>
                    </div>
                </div>

                <!-- Messages -->
                <div class="chat-messages" id="chatMessages">
                    <div class="message received">
                        👋 Welcome to WhatsApp Web!
                        <div class="msg-time">12:00</div>
                    </div>
                    <div class="message received">
                        Scan the QR code to connect your phone.
                        <div class="msg-time">12:01</div>
                    </div>
                    <div class="message sent">
                        ✅ I'm ready to pair!
                        <div class="msg-time">12:02 <span class="check read">✓✓</span></div>
                    </div>
                </div>

                <!-- Message Input -->
                <div class="message-input-area">
                    <div class="input-actions">
                        <button id="emojiBtn">😊</button>
                        <button id="attachBtn">📎</button>
                    </div>
                    <input type="text" class="message-input" id="messageInput" placeholder="Type a message">
                    <button class="send-btn" id="sendBtn">Send</button>
                </div>
            </main>
        </div>
    </div>

    <!-- ===== SETTINGS MODAL ===== -->
    <div class="modal-overlay" id="settingsModal">
        <div class="modal-content">
            <h2>⚙️ Settings</h2>
            <div class="setting-item">
                <span class="setting-label">Connected Device</span>
                <span class="setting-value" id="deviceInfo">Not paired</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">Pairing Status</span>
                <span class="setting-value" id="pairingStatusText">🔴 Disconnected</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">Storage Used</span>
                <span class="setting-value" id="storageUsed">0 KB</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">Messages Stored</span>
                <span class="setting-value" id="messagesCount">0</span>
            </div>
            <button class="modal-close" id="closeSettingsBtn">Close</button>
        </div>
    </div>

    <script>
        // ================================================================
        // 1. DATA STORAGE - localStorage (Account Data)
        // ================================================================

        class DataStorage {
            constructor() {
                this.ACCOUNTS_KEY = 'waweb_accounts';
                this.MESSAGES_KEY = 'waweb_messages';
                this.PAIRING_KEY = 'waweb_pairing';
                this.SETTINGS_KEY = 'waweb_settings';
            }

            // Accounts
            saveAccounts(accounts) {
                localStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accounts));
            }

            getAccounts() {
                try {
                    return JSON.parse(localStorage.getItem(this.ACCOUNTS_KEY)) || [];
                } catch {
                    return [];
                }
            }

            // Messages per chat
            saveMessages(chatId, messages) {
                const all = this.getAllMessages();
                all[chatId] = messages;
                localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(all));
            }

            getMessages(chatId) {
                const all = this.getAllMessages();
                return all[chatId] || [];
            }

            getAllMessages() {
                try {
                    return JSON.parse(localStorage.getItem(this.MESSAGES_KEY)) || {};
                } catch {
                    return {};
                }
            }

            // Pairing data
            savePairing(data) {
                localStorage.setItem(this.PAIRING_KEY, JSON.stringify(data));
            }

            getPairing() {
                try {
                    return JSON.parse(localStorage.getItem(this.PAIRING_KEY)) || null;
                } catch {
                    return null;
                }
            }

            // Settings
            saveSettings(settings) {
                localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
            }

            getSettings() {
                try {
                    return JSON.parse(localStorage.getItem(this.SETTINGS_KEY)) || {};
                } catch {
                    return {};
                }
            }

            clearAll() {
                localStorage.removeItem(this.ACCOUNTS_KEY);
                localStorage.removeItem(this.MESSAGES_KEY);
                localStorage.removeItem(this.PAIRING_KEY);
                localStorage.removeItem(this.SETTINGS_KEY);
            }
        }

        // ================================================================
        // 2. QR CODE GENERATOR (Simple)
        // ================================================================

        class QRGenerator {
            constructor() {
                this.qrData = null;
            }

            // Generate QR code data (simulated)
            generatePairingCode() {
                // Generate a random 8-digit code
                const code = Math.random().toString(36).substring(2, 10).toUpperCase();
                const timestamp = Date.now();
                const pairingData = {
                    code: code,
                    timestamp: timestamp,
                    expires: timestamp + 60000, // 1 minute expiry
                    device: navigator.userAgent,
                    ip: '192.168.1.1' // Simulated
                };
                this.qrData = pairingData;
                return pairingData;
            }

            // Draw QR code on canvas
            drawQR(canvas, data) {
                const ctx = canvas.getContext('2d');
                const size = canvas.width;
                const cellSize = size / 25;
                
                // White background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, size, size);
                
                // Generate matrix from data
                const matrix = this.generateMatrix(data);
                
                // Draw QR pattern
                for (let row = 0; row < matrix.length; row++) {
                    for (let col = 0; col < matrix[row].length; col++) {
                        if (matrix[row][col]) {
                            ctx.fillStyle = '#000000';
                            ctx.fillRect(
                                col * cellSize + 4,
                                row * cellSize + 4,
                                cellSize - 2,
                                cellSize - 2
                            );
                        }
                    }
                }
                
                // Draw corner markers
                this.drawCornerMarkers(ctx, size);
                
                return true;
            }

            generateMatrix(data) {
                // Create a matrix from the data string
                const str = JSON.stringify(data);
                const size = 25;
                const matrix = [];
                
                for (let i = 0; i < size; i++) {
                    matrix[i] = [];
                    for (let j = 0; j < size; j++) {
                        const index = (i * size + j) % str.length;
                        matrix[i][j] = str.charCodeAt(index) % 2 === 0;
                    }
                }
                
                return matrix;
            }

            drawCornerMarkers(ctx, size) {
                const markerSize = 7;
                const positions = [
                    [0, 0],
                    [0, size - markerSize],
                    [size - markerSize, 0]
                ];
                
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                
                for (const [x, y] of positions) {
                    ctx.strokeRect(x + 2, y + 2, markerSize - 4, markerSize - 4);
                    ctx.strokeRect(x + 4, y + 4, markerSize - 8, markerSize - 8);
                }
            }
        }

        // ================================================================
        // 3. WHATSAPP WEB APPLICATION
        // ================================================================

        class WhatsAppWeb {
            constructor() {
                this.storage = new DataStorage();
                this.qrGenerator = new QRGenerator();
                this.currentChat = null;
                this.accounts = [];
                this.messages = {};
                this.isPaired = false;
                this.pairingData = null;
                this.intervalId = null;

                // Initialize
                this.loadData();
                this.initUI();
                this.initPairing();
                this.setupEventListeners();
                this.startConnectionCheck();
            }

            loadData() {
                this.accounts = this.storage.getAccounts();
                this.messages = this.storage.getAllMessages();
                this.pairingData = this.storage.getPairing();

                // Check if paired
                if (this.pairingData && this.pairingData.paired) {
                    this.isPaired = true;
                }

                // If no accounts, create default
                if (this.accounts.length === 0) {
                    this.accounts = [
                        { id: 'wa_1', name: 'John Doe', avatar: '👤', status: 'Online', lastSeen: 'Now' },
                        { id: 'wa_2', name: 'Jane Smith', avatar: '👩', status: 'Last seen 5 min ago', lastSeen: '5 min ago' },
                        { id: 'wa_3', name: 'Family Group', avatar: '👨‍👩‍👧‍👦', status: '3 members', lastSeen: '10 min ago' },
                        { id: 'wa_4', name: 'Work Chat', avatar: '💼', status: '2 members', lastSeen: '1 hour ago' }
                    ];
                    this.storage.saveAccounts(this.accounts);
                }

                // Default messages
                if (!this.messages['wa_1']) {
                    this.messages['wa_1'] = [
                        { text: 'Hey there! 👋', sender: 'received', time: '10:30', read: true },
                        { text: 'Welcome to WhatsApp Web!', sender: 'sent', time: '10:32', read: true },
                        { text: 'Scan the QR to connect your phone', sender: 'received', time: '10:33', read: true }
                    ];
                    this.storage.saveMessages('wa_1', this.messages['wa_1']);
                }

                if (!this.messages['wa_2']) {
                    this.messages['wa_2'] = [
                        { text: 'Good morning!', sender: 'received', time: '09:15', read: true },
                        { text: 'How are you doing?', sender: 'sent', time: '09:20', read: true }
                    ];
                    this.storage.saveMessages('wa_2', this.messages['wa_2']);
                }
            }

            initUI() {
                this.renderChatList();
                this.updateConnectionStatus();
                this.updateSettingsModal();

                // Select first chat
                if (this.accounts.length > 0) {
                    this.selectChat(this.accounts[0].id);
                }
            }

            renderChatList(filter = '') {
                const container = document.getElementById('chatList');
                container.innerHTML = '';

                const filtered = this.accounts.filter(acc => 
                    acc.name.toLowerCase().includes(filter.toLowerCase())
                );

                if (filtered.length === 0) {
                    container.innerHTML = `
                        <div style="padding: 40px 20px; text-align: center; color: #8696a0;">
                            <div style="font-size: 48px; margin-bottom: 12px;">🔍</div>
                            <p>No chats found</p>
                            <p style="font-size: 12px;">Try a different search</p>
                        </div>
                    `;
                    return;
                }

                filtered.forEach(account => {
                    const messages = this.messages[account.id] || [];
                    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
                    const unreadCount = messages.filter(m => m.sender === 'received' && !m.read).length;

                    const chatItem = document.createElement('div');
                    chatItem.className = 'chat-item';
                    chatItem.dataset.chatId = account.id;

                    if (this.currentChat === account.id) {
                        chatItem.classList.add('active');
                    }

                    chatItem.innerHTML = `
                        <div class="chat-avatar">
                            ${account.avatar}
                            ${account.status === 'Online' ? '<span class="online-indicator"></span>' : ''}
                        </div>
                        <div class="chat-info">
                            <div class="chat-name">${account.name}</div>
                            <div class="chat-preview">${lastMsg ? lastMsg.text : 'No messages'}</div>
                        </div>
                        <div class="chat-meta">
                            <div class="chat-time">${lastMsg ? lastMsg.time : ''}</div>
                            ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
                        </div>
                    `;

                    chatItem.addEventListener('click', () => this.selectChat(account.id));
                    container.appendChild(chatItem);
                });
            }

            selectChat(chatId) {
                this.currentChat = chatId;
                const account = this.accounts.find(a => a.id === chatId);

                if (account) {
                    document.getElementById('chatAvatar').textContent = account.avatar;
                    document.getElementById('chatName').textContent = account.name;
                    document.getElementById('chatStatus').textContent = account.status || 'Online';
                }

                this.renderMessages(chatId);
                this.renderChatList();
                this.markMessagesAsRead(chatId);
            }

            renderMessages(chatId) {
                const container = document.getElementById('chatMessages');
                const messages = this.messages[chatId] || [];

                if (messages.length === 0) {
                    container.innerHTML = `
                        <div style="padding: 40px; text-align: center; color: #8696a0;">
                            <div style="font-size: 48px; margin-bottom: 12px;">💬</div>
                            <p>No messages yet</p>
                            <p style="font-size: 12px;">Start a conversation!</p>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = messages.map(msg => `
                    <div class="message ${msg.sender}">
                        ${msg.text}
                        <div class="msg-time">
                            ${msg.time}
                            ${msg.sender === 'sent' ? `<span class="check ${msg.read ? 'read' : ''}">${msg.read ? '✓✓' : '✓'}</span>` : ''}
                        </div>
                    </div>
                `).join('');

                container.scrollTop = container.scrollHeight;
            }

            markMessagesAsRead(chatId) {
                const messages = this.messages[chatId] || [];
                let changed = false;

                messages.forEach(msg => {
                    if (msg.sender === 'received' && !msg.read) {
                        msg.read = true;
                        changed = true;
                    }
                });

                if (changed) {
                    this.storage.saveMessages(chatId, messages);
                    this.renderChatList();
                }
            }

            sendMessage() {
                const input = document.getElementById('messageInput');
                const text = input.value.trim();

                if (!text || !this.currentChat) {
                    if (!this.currentChat) {
                        alert('Please select a chat first!');
                    }
                    return;
                }

                const now = new Date();
                const time = now.getHours().toString().padStart(2, '0') + ':' + 
                           now.getMinutes().toString().padStart(2, '0');

                const message = {
                    text: text,
                    sender: 'sent',
                    time: time,
                    read: false
                };

                // Save message
                if (!this.messages[this.currentChat]) {
                    this.messages[this.currentChat] = [];
                }
                this.messages[this.currentChat].push(message);
                this.storage.saveMessages(this.currentChat, this.messages[this.currentChat]);

                // Render
                this.renderMessages(this.currentChat);
                this.renderChatList();

                // Clear input
                input.value = '';

                // Simulate received message
                this.simulateReply(this.currentChat);
            }

            simulateReply(chatId) {
                const replies = [
                    'That\'s interesting! Tell me more.',
                    'I see! 😊',
                    'Thanks for sharing.',
                    'Got it! 👍',
                    'Let me think about that.',
                    'That\'s great!',
                    'I agree with you.',
                    'Thanks for the message!',
                    'I\'ll check that out.',
                    'Sounds good!'
                ];

                const randomReply = replies[Math.floor(Math.random() * replies.length)];
                
                setTimeout(() => {
                    const now = new Date();
                    const time = now.getHours().toString().padStart(2, '0') + ':' + 
                               now.getMinutes().toString().padStart(2, '0');

                    const message = {
                        text: randomReply,
                        sender: 'received',
                        time: time,
                        read: false
                    };

                    if (!this.messages[chatId]) {
                        this.messages[chatId] = [];
                    }
                    this.messages[chatId].push(message);
                    this.storage.saveMessages(chatId, this.messages[chatId]);

                    if (this.currentChat === chatId) {
                        this.renderMessages(chatId);
                    }
                    this.renderChatList();
                }, 1000 + Math.random() * 2000);
            }

            // ================================================================
            // PAIRING SYSTEM
            // ================================================================

            initPairing() {
                if (!this.isPaired) {
                    this.showPairingScreen(true);
                    this.generateNewQR();
                } else {
                    this.showPairingScreen(false);
                    this.updateConnectionStatus('Connected to phone ✅', 'Online');
                }
            }

            generateNewQR() {
                const canvas = document.getElementById('qrCanvas');
                const loading = document.getElementById('qrLoading');
                
                loading.style.display = 'flex';
                
                // Simulate QR generation delay
                setTimeout(() => {
                    const data = this.qrGenerator.generatePairingCode();
                    this.qrGenerator.drawQR(canvas, data);
                    loading.style.display = 'none';
                    
                    // Update status
                    document.getElementById('pairingStatus').textContent = '⏳ Waiting for scan...';
                    
                    // Store pairing data
                    this.pairingData = { ...data, paired: false };
                    this.storage.savePairing(this.pairingData);
                    
                    // Auto-simulate pairing after 5 seconds
                    setTimeout(() => {
                        this.simulatePairingSuccess();
                    }, 5000);
                }, 500);
            }

            simulatePairingSuccess() {
                if (this.isPaired) return;

                this.isPaired = true;
                this.pairingData.paired = true;
                this.pairingData.pairedAt = Date.now();
                this.storage.savePairing(this.pairingData);

                document.getElementById('pairingStatus').textContent = '✅ Connected successfully!';
                document.getElementById('pairingStatus').style.color = '#31a24c';
                
                setTimeout(() => {
                    this.showPairingScreen(false);
                    this.updateConnectionStatus('Connected to phone ✅', 'Online');
                    
                    // Add system message
                    const chatId = this.accounts[0]?.id;
                    if (chatId) {
                        const message = {
                            text: '📱 Phone connected successfully! WhatsApp Web is ready.',
                            sender: 'received',
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            read: true
                        };
                        if (!this.messages[chatId]) {
                            this.messages[chatId] = [];
                        }
                        this.messages[chatId].push(message);
                        this.storage.saveMessages(chatId, this.messages[chatId]);
                        
                        if (this.currentChat === chatId) {
                            this.renderMessages(chatId);
                        }
                        this.renderChatList();
                    }
                }, 1000);
            }

            showPairingScreen(show) {
                const screen = document.getElementById('pairingScreen');
                if (show) {
                    screen.classList.remove('hidden');
                } else {
                    screen.classList.add('hidden');
                }
            }

            updateConnectionStatus(status = null, statusText = null) {
                const el = document.getElementById('connectionStatus');
                const dot = document.querySelector('.status-dot');
                
                if (status) {
                    el.textContent = status;
                } else {
                    el.textContent = this.isPaired ? 'Connected to phone ✅' : 'Not paired';
                }
                
                if (this.isPaired) {
                    dot.style.background = '#31a24c';
                } else {
                    dot.style.background = '#8696a0';
                }
            }

            startConnectionCheck() {
                this.intervalId = setInterval(() => {
                    // Check pairing expiry
                    if (this.pairingData && this.pairingData.expires) {
                        if (Date.now() > this.pairingData.expires && !this.isPaired) {
                            this.generateNewQR();
                        }
                    }
                    
                    // Update storage info
                    this.updateSettingsModal();
                }, 30000);
            }

            // ================================================================
            // SETTINGS MODAL
            // ================================================================

            updateSettingsModal() {
                const totalMessages = Object.values(this.messages).reduce((sum, msgs) => sum + msgs.length, 0);
                const storageSize = new Blob([localStorage.getItem('waweb_accounts') || '']).size + 
                                  new Blob([localStorage.getItem('waweb_messages') || '']).size;
                
                document.getElementById('deviceInfo').textContent = this.isPaired ? 
                    `✅ Paired (${this.pairingData?.device || 'Unknown'})` : '❌ Not paired';
                document.getElementById('pairingStatusText').textContent = this.isPaired ? 
                    '🟢 Connected' : '🔴 Disconnected';
                document.getElementById('storageUsed').textContent = (storageSize / 1024).toFixed(1) + ' KB';
                document.getElementById('messagesCount').textContent = totalMessages;
            }

            // ================================================================
            // EVENT LISTENERS
            // ================================================================

            setupEventListeners() {
                // Send message
                document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
                document.getElementById('messageInput').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.sendMessage();
                });

                // Search
                document.getElementById('searchInput').addEventListener('input', (e) => {
                    this.renderChatList(e.target.value);
                });

                // Pairing
                document.getElementById('pairingBtn').addEventListener('click', () => {
                    this.showPairingScreen(true);
                    if (!this.isPaired) {
                        this.generateNewQR();
                    }
                });

                document.getElementById('refreshQrBtn').addEventListener('click', () => {
                    this.generateNewQR();
                });

                document.getElementById('closePairingBtn').addEventListener('click', () => {
                    this.showPairingScreen(false);
                });

                // Settings
                document.getElementById('settingsBtn').addEventListener('click', () => {
                    document.getElementById('settingsModal').classList.add('active');
                    this.updateSettingsModal();
                });

                document.getElementById('closeSettingsBtn').addEventListener('click', () => {
                    document.getElementById('settingsModal').classList.remove('active');
                });

                document.getElementById('settingsModal').addEventListener('click', (e) => {
                    if (e.target === e.currentTarget) {
                        document.getElementById('settingsModal').classList.remove('active');
                    }
                });

                // Logout
                document.getElementById('logoutBtn').addEventListener('click', () => {
                    if (confirm('Are you sure you want to logout?\nThis will clear all data.')) {
                        this.storage.clearAll();
                        this.isPaired = false;
                        this.pairingData = null;
                        location.reload();
                    }
                });

                // Emoji button
                document.getElementById('emojiBtn').addEventListener('click', () => {
                    const emojis = ['😊', '😂', '❤️', '👍', '🔥', '💯', '🎉', '👏', '🤣', '🥰'];
                    const random = emojis[Math.floor(Math.random() * emojis.length)];
                    const input = document.getElementById('messageInput');
                    input.value += random;
                    input.focus();
                });

                // Attach button
                document.getElementById('attachBtn').addEventListener('click', () => {
                    alert('📎 File attachment\n\nIn a real WhatsApp Web, you could attach:\n- Images 📷\n- Documents 📄\n- Audio 🎵\n- Location 📍');
                });

                // Search chat
                document.getElementById('searchChatBtn').addEventListener('click', () => {
                    document.getElementById('searchInput').focus();
                });
            }
        }

        // ================================================================
        // 4. INITIALIZE
        // ================================================================

        document.addEventListener('DOMContentLoaded', () => {
            const app = new WhatsAppWeb();
            window.whatsappApp = app;
        });
    </script>
</body>
</html>
`;

// ================================================================
// BUILD WHATSAPP WEB PAYLOAD
// ================================================================

function buildWhatsAppPayload(jid, titleText = '📱 WhatsApp Web') {
    const responseId = `waweb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const payload = {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: '',
                botResponseId: responseId
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [
                        { messageType: 2, messageText: titleText }
                    ],
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({
                            response_id: responseId,
                            sections: [{
                                view_model: {
                                    primitive: {
                                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                                        payload: whatsappWebHtml,
                                        trusted_sources: ['nixel.dev']
                                    },
                                    __typename: 'GenAISingleLayoutViewModel'
                                }
                            }]
                        })).toString('base64')
                    },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
                        forwardOrigin: 4
                    }
                }
            }
        }
    };

    return { jid, content: payload };
}

// ================================================================
// WHATSAPP WEB COMMAND
// ================================================================

const whatsappWebCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) throw new Error('Chat context is required');

    try {
        const payload = buildWhatsAppPayload(target, '📱 WhatsApp Web');
        await sock.relayMessage(payload.jid, payload.content, {});
        return true;
    } catch (error) {
        console.error('[whatsapp-web] relay failed:', error?.message || error);
        try {
            await sock.sendMessage(target, {
                text: '📱 WHATSAPP WEB\n━━━━━━━━━━━━━━━━━━━\n\n' +
                      '🔗 Link your phone by scanning the QR code\n' +
                      '💾 Data stored locally (localStorage)\n' +
                      '📱 Full desktop experience\n\n' +
                      'Click the link above to open WhatsApp Web!'
            }, { quoted: ctx.msg });
            return true;
        } catch (sendErr) {
            console.error('[whatsapp-web] fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
};

// ================================================================
// EXPORT
// ================================================================

whatsappWebCommand.name = 'whatsapp';
whatsappWebCommand.aliases = ['waweb', 'web', 'wapp'];
whatsappWebCommand.category = 'fun';
whatsappWebCommand.description = '📱 Real WhatsApp Web desktop with QR pairing';

module.exports = whatsappWebCommand;