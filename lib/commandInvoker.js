function extractTextFromMessage(msg) {
  if (!msg) return '';

  const candidates = [
    msg.message?.conversation,
    msg.message?.extendedTextMessage?.text,
    msg.message?.imageMessage?.caption,
    msg.message?.videoMessage?.caption,
    msg.message?.documentMessage?.caption,
    msg.message?.templateButtonReplyMessage?.selectedId,
    msg.message?.buttonsResponseMessage?.selectedButtonId,
    msg.text,
    msg.caption
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return '';
}

function extractSenderId(msg, fallback) {
  if (!msg || typeof msg !== 'object') return String(fallback || '');
  return String(msg.key?.participant || msg.key?.remoteJid || msg.sender || msg.from || fallback || '');
}

function extractChatId(msg, fallback) {
  if (!msg || typeof msg !== 'object') return String(fallback || '');
  return String(msg.key?.remoteJid || msg.chatId || msg.from || fallback || '');
}

async function invokeCommand(commandHandler, sock, from, msg, isAdmin, q, session, args, botData, saveBotData, userId) {
  if (typeof commandHandler !== 'function') return undefined;

  const rawText = extractTextFromMessage(msg);
  const senderId = extractSenderId(msg, from);
  const chatId = extractChatId(msg, from);
  const userMessage = (rawText || q || '').trim();
  const safeIsAdmin = Boolean(isAdmin);
  const safeArgs = Array.isArray(args) ? args : (userMessage ? userMessage.split(/\s+/) : []);

  // Standardized parameter order to prevent multi-executions
  const attempts = [
    // 1. Standard Baileys format: (sock, msg, args, ...)
    () => commandHandler(sock, msg, safeArgs, botData, saveBotData, userId),
    () => commandHandler(sock, msg, safeArgs),
    () => commandHandler(sock, msg, q),
    () => commandHandler(sock, msg),

    // 2. Custom Bot format with 'from' / 'chatId': (sock, from, msg, ...)
    () => commandHandler(sock, from, msg, q),
    () => commandHandler(sock, from, msg),
    () => commandHandler(sock, chatId, senderId, userMessage, msg, safeIsAdmin),
    () => commandHandler(sock, from, q, senderId, safeIsAdmin, msg),
    () => commandHandler(sock, from, userMessage, senderId, safeIsAdmin),
    () => commandHandler(sock, from, q, safeIsAdmin)
  ];

  let lastError = null;

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      // Stop execution immediately on first successful call (even if returns void/undefined)
      return result;
    } catch (error) {
      lastError = error;
      // If error is a parameter type mismatch, try the next signature
      if (error instanceof TypeError && error.message.includes('undefined')) {
        continue;
      }
      // If it's a real logic error inside command, throw it directly
      throw error;
    }
  }

  if (lastError) throw lastError;
}

module.exports = { invokeCommand, extractTextFromMessage, extractSenderId, extractChatId };
