/**
 * Command Invoker Module
 * Imewezeshwa kuzuia Multi-execution na 'fromMe' / JID errors kwenye Baileys
 */

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
    msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson,
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
  const sender = msg.key?.participant || msg.key?.remoteJid || msg.sender || msg.from || fallback || '';
  return String(sender).trim();
}

function extractChatId(msg, fallback) {
  if (!msg || typeof msg !== 'object') return String(fallback || '');
  const chat = msg.key?.remoteJid || msg.chatId || msg.from || fallback || '';
  return String(chat).trim();
}

/**
 * Inatengeneza Kinga ya Quoted/Key Objects ili kuzuia Baileys 'fromMe' Errors
 */
function sanitizeMessageObject(msg, chatId, senderId) {
  if (!msg || typeof msg !== 'object') return {};

  const safeMsg = { ...msg };

  // Hakikisha Key object ipo
  if (!safeMsg.key) {
    safeMsg.key = {
      remoteJid: chatId,
      fromMe: false,
      id: 'DUMMY_KEY_' + Date.now()
    };
  } else {
    safeMsg.key = {
      ...safeMsg.key,
      remoteJid: safeMsg.key.remoteJid || chatId,
      fromMe: typeof safeMsg.key.fromMe !== 'undefined' ? safeMsg.key.fromMe : false
    };
  }

  // Hakikisha Quoted Message nayo ina Key na 'fromMe'
  if (safeMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
    const ctx = safeMsg.message.extendedTextMessage.contextInfo;
    if (!ctx.stanzaId) ctx.stanzaId = 'DUMMY_STANZ_' + Date.now();
    if (!ctx.participant) ctx.participant = senderId;
  }

  return safeMsg;
}

async function invokeCommand(commandHandler, sock, from, msg, isAdmin, q, session, args, botData, saveBotData, userId) {
  if (typeof commandHandler !== 'function') return undefined;

  const chatId = extractChatId(msg, from);
  const senderId = extractSenderId(msg, from);
  const safeMsg = sanitizeMessageObject(msg, chatId, senderId);
  const rawText = extractTextFromMessage(safeMsg);
  const userMessage = (rawText || q || '').trim();
  const safeIsAdmin = Boolean(isAdmin);
  const safeArgs = Array.isArray(args) ? args : (userMessage ? userMessage.split(/\s+/) : []);

  // 1. Canonical handlers receive the real chat/sender/text/message values.
  const paramLength = commandHandler.length;

  const attemptSignatures = [];

  const handlerName = String(commandHandler.name || '').toLowerCase();
  const usesCanonicalGroupSignature = [
    'addcommand', 'kickcommand', 'promotecommand', 'demotecommand',
    'setgroupdescription', 'setgroupname', 'setgroupphoto', 'addmetaai'
  ].includes(handlerName);

  if (usesCanonicalGroupSignature || (paramLength >= 4 && handlerName === 'command')) {
    attemptSignatures.push(() => commandHandler(sock, chatId, senderId, userMessage, safeMsg, safeIsAdmin));
  } else if (paramLength >= 2) {
    attemptSignatures.push(() => commandHandler(sock, chatId, safeMsg, userMessage, safeArgs));
    attemptSignatures.push(() => commandHandler(sock, chatId, safeMsg, q));
    attemptSignatures.push(() => commandHandler(sock, chatId, safeMsg));
  }

  // Kama ni Standard Baileys structure: (sock, msg, args, ...)
  attemptSignatures.push(() => commandHandler(sock, safeMsg, safeArgs, botData, saveBotData, userId));
  attemptSignatures.push(() => commandHandler(sock, safeMsg, safeArgs));
  attemptSignatures.push(() => commandHandler(sock, safeMsg, q));
  attemptSignatures.push(() => commandHandler(sock, safeMsg));

  // Legacy Custom signatures
  if (paramLength < 4) {
    attemptSignatures.push(() => commandHandler(sock, chatId, senderId, userMessage, safeMsg, safeIsAdmin));
  }
  attemptSignatures.push(() => commandHandler(sock, chatId, q, senderId, safeIsAdmin, safeMsg));

  let lastError = null;

  for (const attempt of attemptSignatures) {
    try {
      const result = await attempt();
      // Mara tu command inapokamilika au kurudisha majibu, simamisha mzunguko hapo hapo
      return result;
    } catch (error) {
      lastError = error;

      // Kama error ni Mismatch ya Argument/Type tu, jaribu signature inayofuata
      const isParamMismatch = error instanceof TypeError && (
        error.message.includes('undefined') || 
        error.message.includes('not a function') ||
        error.message.includes('Cannot read properties')
      );

      if (isParamMismatch) {
        continue;
      }

      // Kama ni Logic Error ya ndani ya Command yenyewe, itupe nje badala ya kujaribu tena
      throw error;
    }
  }

  if (lastError) throw lastError;
}

module.exports = {
  invokeCommand,
  extractTextFromMessage,
  extractSenderId,
  extractChatId
};
