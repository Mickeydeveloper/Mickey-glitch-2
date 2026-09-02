function extractTextFromMessage(msg) {
  if (!msg) return '';
  const candidates = [
    msg.message?.conversation,
    msg.message?.extendedTextMessage?.text,
    msg.message?.imageMessage?.caption,
    msg.message?.videoMessage?.caption,
    msg.message?.documentMessage?.caption,
    msg.text,
    msg.caption,
    ''
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return '';
}

function extractSenderId(msg, fallback) {
  if (!msg) return fallback || '';
  return msg.key?.participant || msg.key?.remoteJid || msg.sender || msg.from || fallback || '';
}

function extractChatId(msg, fallback) {
  if (!msg) return fallback || '';
  return msg.key?.remoteJid || msg.chatId || msg.from || fallback || '';
}

async function invokeCommand(commandHandler, sock, from, msg, isAdmin, q, session, args, botData, saveBotData, userId) {
  if (typeof commandHandler !== 'function') return undefined;

  const rawText = extractTextFromMessage(msg);
  const senderId = extractSenderId(msg, from);
  const chatId = extractChatId(msg, from);
  const userMessage = (rawText || q || '').trim();
  const message = msg || null;
  const safeIsAdmin = Boolean(isAdmin);
  const lastError = { current: null };

  const attempts = [
    () => commandHandler(sock, from, msg),
    () => commandHandler(sock, from, msg, q),
    () => commandHandler(sock, from, q, senderId, safeIsAdmin, msg),
    () => commandHandler(sock, from, q, senderId, msg),
    () => commandHandler(sock, from, q, senderId, safeIsAdmin),
    () => commandHandler(sock, from, userMessage, senderId, safeIsAdmin, msg),
    () => commandHandler(sock, from, userMessage, senderId, msg),
    () => commandHandler(sock, from, userMessage, senderId, safeIsAdmin),
    () => commandHandler(sock, chatId, senderId, userMessage, message, safeIsAdmin),
    () => commandHandler(sock, chatId, senderId, userMessage, message),
    () => commandHandler(sock, chatId, senderId, rawText, message),
    () => commandHandler(sock, chatId, senderId, rawText, msg),
    () => commandHandler(sock, chatId, senderId, userMessage, msg),
    () => commandHandler(sock, chatId, senderId, message),
    () => commandHandler(sock, chatId, message, senderId, safeIsAdmin),
    () => commandHandler(sock, chatId, message, senderId),
    () => commandHandler(sock, from, senderId, userMessage, msg, safeIsAdmin),
    () => commandHandler(sock, from, senderId, userMessage, message),
    () => commandHandler(sock, from, senderId, rawText, message),
    () => commandHandler(sock, from, senderId, rawText, msg),
    () => commandHandler(sock, from, rawText, senderId, safeIsAdmin, message),
    () => commandHandler(sock, from, rawText, senderId, message),
    () => commandHandler(sock, from, userMessage, message, senderId, safeIsAdmin),
    () => commandHandler(sock, from, userMessage, message, senderId),
    () => commandHandler(sock, from, q, message, senderId, safeIsAdmin),
    () => commandHandler(sock, from, q, senderId, safeIsAdmin, session, message),
    () => commandHandler(sock, from, q, message, safeIsAdmin),
    () => commandHandler(sock, from, msg, safeIsAdmin, q),
    () => commandHandler(sock, from, msg, safeIsAdmin, q, session),
    () => commandHandler(sock, from, msg, args),
    () => commandHandler(sock, from, msg, args, botData),
    () => commandHandler(sock, from, msg, args, botData, saveBotData, userId),
    () => commandHandler(sock, from, message, safeIsAdmin),
    () => commandHandler(sock, from, message, senderId, safeIsAdmin),
    () => commandHandler(sock, from, message, senderId),
    () => commandHandler(sock, from, q, safeIsAdmin),
    () => commandHandler(sock, from, q, senderId, message),
    () => commandHandler(sock, from, q, message),
    () => commandHandler(sock, from, q, args, session),
    () => commandHandler(sock, chatId, msg)
  ];

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (typeof result !== 'undefined') return result;
    } catch (error) {
      lastError.current = error;
    }
  }

  if (lastError.current) throw lastError.current;
}

module.exports = { invokeCommand, extractTextFromMessage, extractSenderId, extractChatId };
