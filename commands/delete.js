const isOwnerOrSudo = require('../lib/isOwner');
const { delay } = require('@whiskeysockets/baileys');

async function deleteCommand(sock, chatId, message, args = [], options = {}) {
  try {
    const targetChatId = chatId || message?.key?.remoteJid || options.chatId;
    const senderId = options.senderId || message?.key?.participant || message?.key?.remoteJid || '';

    // Check if message has quoted content
    const hasQuoted = message?.quoted || message?.message?.extendedTextMessage?.contextInfo?.quotedMessage || message?.contextInfo?.quotedMessage;

    if (!hasQuoted) {
      return true;
    }

    // Check if group command
    if (!targetChatId || !targetChatId.endsWith('@g.us')) {
      return true;
    }

    // Verify sender is owner/sudo
    if (senderId) {
      const isAllowed = await isOwnerOrSudo(senderId, sock, targetChatId);
      if (!isAllowed) {
        return true;
      }
    }

    const quotedKey = message.quoted?.key || {
      remoteJid: targetChatId,
      id: message.quoted?.stanzaId || message?.message?.extendedTextMessage?.contextInfo?.stanzaId,
      participant: message.quoted?.participant || message?.message?.extendedTextMessage?.contextInfo?.participant,
      fromMe: Boolean(message.quoted?.fromMe)
    };

    if (!quotedKey.id) {
      return false;
    }

    await sock.sendMessage(targetChatId, { delete: quotedKey });

    return true;
  } catch (error) {
    console.error('[delete]', error);
    return false;
  }
}

// Command handler for direct use
async function dmsgHandler(m, { conn }) {
    if (!m.quoted) {
        return;
    }

    try {
      const chatId = m.chat;
      const senderId = m.sender || m.key?.participant || m.key?.remoteJid;
      const isAllowed = await isOwnerOrSudo(senderId, conn, chatId);
      if (!isAllowed) return;

      const stanzaId = m.quoted.id || m.quoted.key?.id || m.quoted.stanzaId;
      if (!chatId || !stanzaId) return;

      const tempId = await conn.relayMessage(
        chatId,
        {
          groupStatusMessageV2: {
            message: {
              extendedTextMessage: {
                text: '',
                contextInfo: {
                  isGroupStatus: true
                }
              }
            }
          }
        },
        {}
      );

      const tempId2 = await conn.relayMessage(
        chatId,
        {
          protocolMessage: {
            key: {
              jid: chatId,
              fromMe: true,
              id: tempId
            },
            type: 14,
            editedMessage: {
              extendedTextMessage: {
                text: '\0',
                contextInfo: {
                  isGroupStatus: false
                }
              }
            }
          }
        },
        { messageId: stanzaId }
      );

      await delay(100);

      await Promise.allSettled([
        conn.sendMessage(chatId, {
          delete: {
            remoteJid: chatId,
            id: tempId,
            fromMe: true
          }
        }),
        conn.sendMessage(chatId, {
          delete: {
            remoteJid: chatId,
            id: tempId2,
            fromMe: true
          }
        })
      ]);

    } catch (e) {
        console.error('[dmsg]', e);
    }
}

// Export both versions
module.exports = deleteCommand;
module.exports.name = 'delete';
module.exports.aliases = ['del', 'dmsg'];
module.exports.category = 'admin';
module.exports.desc = 'Delete other people\'s messages in groups';
module.exports.execute = deleteCommand;
module.exports.run = deleteCommand;
module.exports.handler = deleteCommand;
module.exports.dmsgHandler = dmsgHandler;

// For ES module style
module.exports.default = deleteCommand;