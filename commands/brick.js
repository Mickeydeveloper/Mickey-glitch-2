const { createCtx } = require('../lib/messageBuilder');

// Msimbo wa HTML wa WhatsApp Web
const whatsappWebHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Web - Brick Game</title>
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
      -webkit-tap-highlight-color: transparent; 
    }
    
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #0b1416;
      color: #e9edef;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .whatsapp-container {
      width: 100%;
      max-width: 1200px;
      height: 100vh;
      max-height: 800px;
      background: #111b21;
      border-radius: 20px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }

    /* Header */
    .whatsapp-header {
      background: #202c33;
      padding: 15px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #2a3942;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .whatsapp-logo {
      width: 40px;
      height: 40px;
      background: #00a884;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
    }

    .header-title {
      font-size: 18px;
      font-weight: 600;
    }

    .header-status {
      font-size: 12px;
      color: #8696a0;
    }

    .header-right {
      display: flex;
      gap: 15px;
    }

    .header-btn {
      background: none;
      border: none;
      color: #aebac1;
      font-size: 20px;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      transition: background 0.2s;
    }

    .header-btn:hover {
      background: #2a3942;
    }

    /* Chat Area */
    .whatsapp-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* Sidebar */
    .sidebar {
      width: 300px;
      background: #111b21;
      border-right: 1px solid #2a3942;
      display: flex;
      flex-direction: column;
    }

    .sidebar-search {
      padding: 10px;
      background: #202c33;
    }

    .search-input {
      width: 100%;
      padding: 10px 15px;
      background: #2a3942;
      border: none;
      border-radius: 8px;
      color: #e9edef;
      font-size: 14px;
    }

    .search-input::placeholder {
      color: #8696a0;
    }

    .chat-list {
      flex: 1;
      overflow-y: auto;
      padding: 5px 0;
    }

    .chat-item {
      padding: 12px 15px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .chat-item:hover {
      background: #2a3942;
    }

    .chat-item.active {
      background: #2a3942;
    }

    .chat-avatar {
      width: 45px;
      height: 45px;
      border-radius: 50%;
      background: #00a884;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 18px;
      flex-shrink: 0;
    }

    .chat-info {
      flex: 1;
      min-width: 0;
    }

    .chat-name {
      font-size: 15px;
      font-weight: 500;
    }

    .chat-message {
      font-size: 13px;
      color: #8696a0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chat-time {
      font-size: 11px;
      color: #8696a0;
    }

    /* Main Chat Area */
    .main-chat {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #0b1416;
    }

    .chat-header {
      padding: 12px 20px;
      background: #202c33;
      border-bottom: 1px solid #2a3942;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .chat-header-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #00a884;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }

    .chat-header-info h3 {
      font-size: 16px;
      font-weight: 500;
    }

    .chat-header-info p {
      font-size: 12px;
      color: #8696a0;
    }

    .chat-messages {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .message {
      max-width: 70%;
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 14px;
      line-height: 1.5;
      position: relative;
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

    .message-time {
      font-size: 10px;
      color: #8696a0;
      margin-top: 4px;
      text-align: right;
    }

    .message-input-area {
      padding: 12px 20px;
      background: #202c33;
      display: flex;
      gap: 10px;
      align-items: center;
      border-top: 1px solid #2a3942;
    }

    .message-input {
      flex: 1;
      padding: 10px 15px;
      background: #2a3942;
      border: none;
      border-radius: 8px;
      color: #e9edef;
      font-size: 14px;
    }

    .message-input:focus {
      outline: none;
    }

    .send-btn {
      background: #00a884;
      border: none;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }

    .send-btn:hover {
      background: #008f72;
    }

    /* Brick Game Integration */
    .brick-game-container {
      margin: 10px 0;
      padding: 15px;
      background: rgba(0,0,0,0.3);
      border-radius: 12px;
      border: 1px solid #2a3942;
    }

    .brick-game-wrapper {
      width: 100%;
      max-width: 620px;
      margin: 0 auto;
    }

    .brick-wrap {
      width: 100%;
      padding: 14px;
      background: rgba(9, 13, 22, .72);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 18px;
      box-shadow: 0 12px 28px rgba(0,0,0,.26);
    }

    .brick-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      color: white;
    }

    .brick-title { 
      font-size: 20px; 
      font-weight: 800; 
      letter-spacing: 1px; 
    }

    .brick-score { 
      font-size: 12px; 
      opacity: .8; 
    }

    .brick-stage {
      position: relative;
      width: 100%;
      overflow: hidden;
      border-radius: 14px;
      border: 2px solid rgba(255,255,255,.08);
      background: linear-gradient(180deg, #0b1120, #111827);
    }

    #brickCanvas {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 16 / 9;
    }

    .brick-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      background: rgba(0,0,0,.35);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
    }

    .brick-overlay.hidden { display: none; }

    .brick-overlay h3 {
      margin: 0 0 8px;
      color: white;
      font-size: 28px;
      letter-spacing: 2px;
    }

    .brick-overlay p {
      margin: 0 0 12px;
      color: rgba(255,255,255,.75);
      font-size: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .brick-btn {
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      background: linear-gradient(135deg, #22c55e, #38bdf8);
      color: white;
      font-weight: 800;
      cursor: pointer;
    }

    .brick-controls {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 12px;
    }

    .brick-pad-btn {
      border: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.06);
      color: white;
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sidebar { display: none; }
      .whatsapp-container { border-radius: 0; max-height: 100vh; }
    }
  </style>
</head>
<body>
  <div class="whatsapp-container">
    <!-- Header -->
    <div class="whatsapp-header">
      <div class="header-left">
        <div class="whatsapp-logo">W</div>
        <div>
          <div class="header-title">WhatsApp Web</div>
          <div class="header-status">● Online</div>
        </div>
      </div>
      <div class="header-right">
        <button class="header-btn" id="settingsBtn">⚙️</button>
        <button class="header-btn" id="logoutBtn">🚪</button>
      </div>
    </div>

    <!-- Body -->
    <div class="whatsapp-body">
      <!-- Sidebar -->
      <div class="sidebar">
        <div class="sidebar-search">
          <input type="text" class="search-input" placeholder="Search chats...">
        </div>
        <div class="chat-list" id="chatList">
          <!-- Chats zitaingizwa hapa na JavaScript -->
        </div>
      </div>

      <!-- Main Chat -->
      <div class="main-chat">
        <div class="chat-header">
          <div class="chat-header-avatar" id="currentChatAvatar">👤</div>
          <div class="chat-header-info">
            <h3 id="currentChatName">Select a chat</h3>
            <p id="currentChatStatus">Last seen recently</p>
          </div>
        </div>

        <div class="chat-messages" id="chatMessages">
          <div class="message received">
            Welcome to WhatsApp Web with Brick Game! 🎮
            <div class="message-time">10:30</div>
          </div>
        </div>

        <div class="message-input-area">
          <input type="text" class="message-input" id="messageInput" placeholder="Type a message...">
          <button class="send-btn" id="sendBtn">Send</button>
        </div>
      </div>
    </div>
  </div>

  <script>
  // ============================================
  // DATA STORAGE - localStorage
  // ============================================
  
  class DataStorage {
    constructor() {
      this.accountsKey = 'whatsapp_accounts';
      this.messagesKey = 'whatsapp_messages';
      this.settingsKey = 'whatsapp_settings';
    }

    // Kuhifadhi data za account
    saveAccounts(accounts) {
      localStorage.setItem(this.accountsKey, JSON.stringify(accounts));
    }

    getAccounts() {
      try {
        return JSON.parse(localStorage.getItem(this.accountsKey)) || [];
      } catch {
        return [];
      }
    }

    // Kuhifadhi ujumbe
    saveMessages(chatId, messages) {
      const allMessages = this.getAllMessages();
      allMessages[chatId] = messages;
      localStorage.setItem(this.messagesKey, JSON.stringify(allMessages));
    }

    getMessages(chatId) {
      const allMessages = this.getAllMessages();
      return allMessages[chatId] || [];
    }

    getAllMessages() {
      try {
        return JSON.parse(localStorage.getItem(this.messagesKey)) || {};
      } catch {
        return {};
      }
    }

    // Mipangilio
    saveSettings(settings) {
      localStorage.setItem(this.settingsKey, JSON.stringify(settings));
    }

    getSettings() {
      try {
        return JSON.parse(localStorage.getItem(this.settingsKey)) || {};
      } catch {
        return {};
      }
    }
  }

  // ============================================
  // WHATSAPP APPLICATION
  // ============================================

  class WhatsAppApp {
    constructor() {
      this.storage = new DataStorage();
      this.currentChat = null;
      this.accounts = [];
      this.messages = {};

      // Initialize
      this.loadData();
      this.initUI();
      this.initBrickGame();
    }

    loadData() {
      this.accounts = this.storage.getAccounts();
      this.messages = this.storage.getAllMessages();

      // If no accounts, create default
      if (this.accounts.length === 0) {
        this.accounts = [
          { id: 'chat1', name: 'John Doe', avatar: '👤', status: 'Online' },
          { id: 'chat2', name: 'Jane Smith', avatar: '👩', status: 'Last seen 10 min ago' },
          { id: 'chat3', name: 'Brick Game', avatar: '🧱', status: 'Active now' }
        ];
        this.storage.saveAccounts(this.accounts);
      }

      // Default messages
      if (!this.messages['chat1']) {
        this.messages['chat1'] = [
          { text: 'Hey there! 👋', sender: 'received', time: '10:30' },
          { text: 'Check out the Brick Game!', sender: 'sent', time: '10:31' }
        ];
        this.storage.saveMessages('chat1', this.messages['chat1']);
      }
    }

    initUI() {
      this.renderChatList();
      this.setupEventListeners();
    }

    renderChatList() {
      const chatList = document.getElementById('chatList');
      chatList.innerHTML = '';

      this.accounts.forEach(account => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.chatId = account.id;

        const lastMessage = this.getLastMessage(account.id);

        chatItem.innerHTML = `
          <div class="chat-avatar">${account.avatar}</div>
          <div class="chat-info">
            <div class="chat-name">${account.name}</div>
            <div class="chat-message">${lastMessage || 'No messages'}</div>
          </div>
          <div class="chat-time">${this.getLastMessageTime(account.id)}</div>
        `;

        chatItem.addEventListener('click', () => this.selectChat(account.id));
        chatList.appendChild(chatItem);
      });
    }

    getLastMessage(chatId) {
      const messages = this.messages[chatId] || [];
      return messages.length > 0 ? messages[messages.length - 1].text : 'No messages';
    }

    getLastMessageTime(chatId) {
      const messages = this.messages[chatId] || [];
      return messages.length > 0 ? messages[messages.length - 1].time : '';
    }

    selectChat(chatId) {
      this.currentChat = chatId;
      const account = this.accounts.find(a => a.id === chatId);
      
      if (account) {
        document.getElementById('currentChatAvatar').textContent = account.avatar;
        document.getElementById('currentChatName').textContent = account.name;
        document.getElementById('currentChatStatus').textContent = account.status;
      }

      this.renderMessages(chatId);
      this.updateActiveChat(chatId);
    }

    renderMessages(chatId) {
      const container = document.getElementById('chatMessages');
      const messages = this.messages[chatId] || [];

      container.innerHTML = messages.map(msg => `
        <div class="message ${msg.sender}">
          ${msg.text}
          <div class="message-time">${msg.time}</div>
        </div>
      `).join('');

      container.scrollTop = container.scrollHeight;
    }

    updateActiveChat(chatId) {
      document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.toggle('active', item.dataset.chatId === chatId);
      });
    }

    sendMessage() {
      const input = document.getElementById('messageInput');
      const text = input.value.trim();

      if (!text || !this.currentChat) return;

      const now = new Date();
      const time = now.getHours().toString().padStart(2, '0') + ':' + 
                   now.getMinutes().toString().padStart(2, '0');

      const message = {
        text: text,
        sender: 'sent',
        time: time
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

      // Simulate reply for Brick Game chat
      if (this.currentChat === 'chat3' && text.toLowerCase().includes('brick')) {
        setTimeout(() => {
          this.receiveMessage('chat3', '🎮 Ready to play Brick Game? Click START!');
        }, 1000);
      } else if (this.currentChat === 'chat3') {
        setTimeout(() => {
          this.receiveMessage('chat3', '💬 Use the Brick Game below!');
        }, 1000);
      }
    }

    receiveMessage(chatId, text) {
      const now = new Date();
      const time = now.getHours().toString().padStart(2, '0') + ':' + 
                   now.getMinutes().toString().padStart(2, '0');

      const message = {
        text: text,
        sender: 'received',
        time: time
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

    setupEventListeners() {
      // Send button
      document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());

      // Enter key
      document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });

      // Settings
      document.getElementById('settingsBtn').addEventListener('click', () => {
        alert('⚙️ Settings\n\n' + 
              '💾 Data stored in localStorage\n' +
              '📱 Connected to: WhatsApp Web\n' +
              '🎮 Brick Game available');
      });

      // Logout
      document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('Logout?')) {
          localStorage.clear();
          location.reload();
        }
      });
    }

    // ============================================
    // BRICK GAME INTEGRATION
    // ============================================

    initBrickGame() {
      const brickHTML = this.generateBrickHTML();
      
      // Insert brick game into chat
      const container = document.getElementById('chatMessages');
      
      // Add Brick Game as a message
      const gameMessage = document.createElement('div');
      gameMessage.className = 'message received';
      gameMessage.style.maxWidth = '100%';
      gameMessage.style.padding = '0';
      gameMessage.style.background = 'transparent';
      gameMessage.style.borderRadius = '0';
      
      const wrapper = document.createElement('div');
      wrapper.className = 'brick-game-container';
      wrapper.innerHTML = brickHTML;
      
      gameMessage.appendChild(wrapper);
      container.appendChild(gameMessage);

      // Initialize brick game after DOM update
      setTimeout(() => {
        this.initBrickGameLogic();
      }, 100);
    }

    generateBrickHTML() {
      return `
        <div class="brick-game-wrapper">
          <div class="brick-wrap">
            <div class="brick-header">
              <div class="brick-title">🧱 BRICK</div>
              <div class="brick-score">SCORE <span id="brickScore">0</span></div>
            </div>
            <div class="brick-stage">
              <canvas id="brickCanvas" width="640" height="360"></canvas>
              <div class="brick-overlay" id="brickOverlay">
                <h3>READY?</h3>
                <p>Use A/D or arrow keys</p>
                <button class="brick-btn" id="brickStartBtn">START</button>
              </div>
            </div>
            <div class="brick-controls">
              <button class="brick-pad-btn" data-dir="left">←</button>
              <button class="brick-pad-btn" data-dir="right">→</button>
            </div>
          </div>
        </div>
      `;
    }

    initBrickGameLogic() {
      const canvas = document.getElementById('brickCanvas');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const overlay = document.getElementById('brickOverlay');
      const scoreEl = document.getElementById('brickScore');
      const startBtn = document.getElementById('brickStartBtn');
      const padButtons = document.querySelectorAll('.brick-pad-btn');

      const state = {
        started: false,
        score: 0,
        leftPressed: false,
        rightPressed: false,
        player: { x: canvas.width / 2 - 50, y: canvas.height - 24, width: 110, height: 14, speed: 8 },
        ball: { x: canvas.width / 2, y: canvas.height - 40, radius: 8, dx: 4, dy: -4 },
        bricks: [],
        rows: 4,
        cols: 8,
        brickWidth: 64,
        brickHeight: 20,
        brickGap: 10,
        gameOver: false,
        win: false
      };

      function resetBricks() {
        state.bricks = [];
        const offsetX = 48;
        const offsetY = 36;
        for (let row = 0; row < state.rows; row++) {
          for (let col = 0; col < state.cols; col++) {
            state.bricks.push({
              x: offsetX + col * (state.brickWidth + state.brickGap),
              y: offsetY + row * (state.brickHeight + state.brickGap),
              w: state.brickWidth,
              h: state.brickHeight,
              alive: true
            });
          }
        }
      }

      function resetBall() {
        state.ball.x = state.player.x + state.player.width / 2;
        state.ball.y = state.player.y - 12;
        state.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
        state.ball.dy = -4;
      }

      function startGame() {
        state.started = true;
        state.score = 0;
        state.gameOver = false;
        state.win = false;
        resetBricks();
        state.player.x = canvas.width / 2 - 50;
        resetBall();
        scoreEl.textContent = '0';
        overlay.classList.add('hidden');

        // Save game score to storage
        const gameData = { score: 0, lastPlayed: new Date().toISOString() };
        localStorage.setItem('brick_game_data', JSON.stringify(gameData));
      }

      function updateScore() {
        scoreEl.textContent = String(state.score);
        // Save score
        const gameData = { 
          score: state.score, 
          lastPlayed: new Date().toISOString() 
        };
        localStorage.setItem('brick_game_data', JSON.stringify(gameData));
      }

      function updatePlayer() {
        if (state.leftPressed) state.player.x -= state.player.speed;
        if (state.rightPressed) state.player.x += state.player.speed;
        state.player.x = Math.max(0, Math.min(canvas.width - state.player.width, state.player.x));
      }

      function checkCollisions() {
        for (const brick of state.bricks) {
          if (!brick.alive) continue;
          const hit =
            state.ball.x + state.ball.radius > brick.x &&
            state.ball.x - state.ball.radius < brick.x + brick.w &&
            state.ball.y + state.ball.radius > brick.y &&
            state.ball.y - state.ball.radius < brick.y + brick.h;

          if (hit) {
            brick.alive = false;
            state.score += 10;
            updateScore();
            state.ball.dy *= -1;
            break;
          }
        }

        const paddleHit =
          state.ball.y + state.ball.radius >= state.player.y &&
          state.ball.y - state.ball.radius <= state.player.y + state.player.height &&
          state.ball.x >= state.player.x &&
          state.ball.x <= state.player.x + state.player.width &&
          state.ball.dy > 0;

        if (paddleHit) {
          const hitOffset = (state.ball.x - (state.player.x + state.player.width / 2)) / (state.player.width / 2);
          state.ball.dx = hitOffset * 6;
          state.ball.dy = -Math.abs(state.ball.dy) - 0.2;
        }
      }

      function updateBall() {
        if (!state.started || state.gameOver || state.win) return;

        state.ball.x += state.ball.dx;
        state.ball.y += state.ball.dy;

        if (state.ball.x - state.ball.radius <= 0 || state.ball.x + state.ball.radius >= canvas.width) {
          state.ball.dx *= -1;
        }

        if (state.ball.y - state.ball.radius <= 0) {
          state.ball.dy *= -1;
        }

        if (state.ball.y + state.ball.radius >= canvas.height) {
          state.gameOver = true;
          overlay.classList.remove('hidden');
          overlay.innerHTML = '<h3>GAME OVER</h3><p>Score: ' + state.score + '</p><button class="brick-btn" id="brickRestartBtn">PLAY AGAIN</button>';
          document.getElementById('brickRestartBtn').addEventListener('click', startGame);
          return;
        }

        checkCollisions();

        const aliveBricks = state.bricks.some((brick) => brick.alive);
        if (!aliveBricks) {
          state.win = true;
          overlay.classList.remove('hidden');
          overlay.innerHTML = '<h3>🎉 YOU WIN!</h3><p>Final score: ' + state.score + '</p><button class="brick-btn" id="brickRestartBtn">PLAY AGAIN</button>';
          document.getElementById('brickRestartBtn').addEventListener('click', startGame);
          
          // Send win message
          this.receiveMessage('chat3', '🎉 I won! Score: ' + state.score);
        }
      }

      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);

        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#7dd3fc';
        ctx.fill();

        for (const brick of state.bricks) {
          if (!brick.alive) continue;
          ctx.fillStyle = brick.y < 90 ? '#22c55e' : brick.y < 140 ? '#38bdf8' : '#a78bfa';
          ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
        }
      }

      function loop() {
        updatePlayer();
        updateBall();
        draw();
        requestAnimationFrame(loop);
      }

      // Event Listeners
      document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        if (key === 'arrowleft' || key === 'a') state.leftPressed = true;
        if (key === 'arrowright' || key === 'd') state.rightPressed = true;
      });

      document.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        if (key === 'arrowleft' || key === 'a') state.leftPressed = false;
        if (key === 'arrowright' || key === 'd') state.rightPressed = false;
      });

      padButtons.forEach((button) => {
        button.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          if (!state.started) startGame();
          const dir = button.dataset.dir;
          if (dir === 'left') state.leftPressed = true;
          if (dir === 'right') state.rightPressed = true;
        });
        button.addEventListener('pointerup', () => {
          const dir = button.dataset.dir;
          if (dir === 'left') state.leftPressed = false;
          if (dir === 'right') state.rightPressed = false;
        });
      });

      if (startBtn) {
        startBtn.addEventListener('click', () => startGame());
      }

      resetBricks();
      updateScore();
      draw();

      // Load saved score
      const savedData = localStorage.getItem('brick_game_data');
      if (savedData) {
        const data = JSON.parse(savedData);
        state.score = data.score || 0;
        scoreEl.textContent = String(state.score);
      }

      loop();
    }
  }

  // ============================================
  // INITIALIZE APP
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    const app = new WhatsAppApp();
    window.whatsapp = app;
  });
  </script>
</body>
</html>
`;

// ============================================
// BUILD WHATSAPP WEB PAYLOAD
// ============================================

function buildWhatsAppPayload(jid, titleText = '📱 WhatsApp Web') {
  const responseId = `whatsapp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
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

// ============================================
// COMMAND HANDLER
// ============================================

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
              '💾 Data stored in localStorage\n' +
              '🎮 Includes Brick Game\n' +
              '📱 Full WhatsApp clone\n\n' +
              'Click the link to open!'
      }, { quoted: ctx.msg });
      return true;
    } catch (sendErr) {
      console.error('[whatsapp-web] fallback failed:', sendErr?.message || sendErr);
      return false;
    }
  }
};

// ============================================
// EXPORT COMMAND
// ============================================

whatsappWebCommand.name = 'whatsapp';
whatsappWebCommand.aliases = ['waweb', 'web'];
whatsappWebCommand.category = 'fun';
whatsappWebCommand.description = '📱 WhatsApp Web clone with Brick Game and data storage';

module.exports = whatsappWebCommand;