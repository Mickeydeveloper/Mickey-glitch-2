const isOwnerOrSudo = require('../lib/isOwner');

const sendOwnerRichResponse = async (sock, chatId, msg) => {
    await sock.relayMessage(
        chatId,
        {
            senderKeyDistributionMessage: {
                groupId: "120363411834515372@g.us",
                axolotlSenderKeyDistributionMessage: "MwiSzap+EAsaILRp/ZK2gswfDELPpz/KjIJbl00cjzdA6NbII3zjn6+CIiEFvuXAoLS1QC6EIKAy/GVf4o6jdTPs5AFEGq9SgYhp4g4="
            },
            messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
                botMetadata: {
                    messageDisclaimerText: "",
                    botResponseId: "6e6c2e69-1e8c-4183-aa8b-162c8b642c1f",
                    verificationMetadata: {
                        proofs: [
                            {
                                version: 1,
                                useCase: 1,
                                signature: "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YYLyFX3ySUMQ8A==",
                                certificateChain: [
                                    "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGF3cgESiqAkcoIsfS/PJds1uDUrTqnkQyKpIrtKrvddSOD3u/kHXesnarTQVXu9+8ekEACbYotdcCvlxe+l2TgDZmoqTSPu0/LmOZj2NpZkM74esq3BwR/xdhwX7cAhIGsqfM3vgbmUr0a77U1yDikghHK95Wyi7eRyzcEdjqTSMyYu34vLxpOrI5tYp87OX03ph5xiDCCnN0ZDp7V69zqQzXAA8mXYKH3yAyxQ5EsGKL4m6p2pqSHBcziyDM+ieyXsD5cL1ebPaGJwpJ931IzVSFS5tp5U92T6hpqf3cGeYlYcLKQdg3Euvfgg3Zkhi+fFSb6+W9D+y2TEkN5qgosjdE1pxhZTzY4NLYiSr8cAW9ckahFqx7wmnWZhkAu1bAyeI9ecTzpstQOhvalfiSO4nkHlDGu5R326BRGeajL5LOgGH4vwx0RRhPhQ0OY1/GUz3+nsapvMrgpXzs706OfaI2+9yKtzeHAP9VaeyQnIF5xtXAW4Ec/2LpRUDuldHvR//VXLvm9YTeEEx8COugNDcn6mFSk78moa7jQCuSJSTr1zdudEUUJHOWOSC0sxzBvMnIYRB3w7vAX78XM94Hn+a4yVQzo6UtEBKUIJiLi/x1YLVJtfxjjhr6onhXcRWUagNy3sBPvUXDLdmTRjJ2YwLEQtGKbvnEiUkdOI/zTCJ1iXF5zSAfiwMMzMthCHd5BjvKm6x1Aj2SwgfUJw5wIFhWJHfEDC7NYoNnelxNB9xSell25+Nd88amIaO1frKcEsoJ5auwppbBHNEhn2smmFGPQ9MWJRKymsGTP30UkXHASIxioN6BxcCVvcEFTRDLUVJAwzfeXbloZK",
                                    "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEDKIbnzitke2XBFnHNQUWOKFLKoRzvZWRE0nbxcs4LJxbEtDeocaZZ6uWxqe+HcCAb+hQAGgXb01rQDHjNg71eVxNbXzZaqY85aS1tPO9ON/T7NXJPUgYtK661vOMlgnar9LKsohKB/A5Yz3YSTd6uaHaAocUrdPJJUa6HRKviVxlcjJ9U/WrY7kv79ODWe1i3tqd9dICn5u2iZqKnvlqcfRPg7W+WKnnfqqaPgt35iJHYX2GZV5gQQWgoYjx4R8hW1CR0BvhOem41SUSMZW5KQ4aauSAHvteLqIcsxnMRgW9y39ONm3XZVTJ4lN2c+Qj9I7gSq0Bv4ZVSd5jYPk2F1ET+N47nHJdcAZgFfHL8kaCou0Oukq++z/O85S3quGNxQRnTkINLv1o8vKmQTHQU0t+AgByAMg31SDkDuDJdZftQq57cyPBzViO2KBsSjocDZraJlV+pYdHUNKQYoLXUaGXeYhaNyMryqn63YfA+H/U5L6ZRMgvmq7H8vG2uLFNJgKUnKnSPQo8dBUd5iHK9aJHgGadGWtAW5ACaWSIVIW88mkgiPG7txjMa8UOBUGznYBtKSg1xm8r2u6Nl1aXEImvSa2nlpNu1vMmMR8ypFdMfdREkkn/rSAUCkCqOBfUvFldDBnjzQ5KHgraUGzATYMRvut7uzj4oJROugfsOjJZu2h5HajxuUAGXf31V7TurVwAbtFqePIdmbiNVmPbt5inSONgmtX2PXTzQAmpPokuVdtGh2WU5vBYcURkh8QtzRmawWcIyoHWzVVt6tSnOdPorIZhHUwxvF5R1h3Xbyc+/7+Nhh1/+MB5YrlrSFWbPsSB72xvWaikmDDwtxNonFNbnDJ416tq8t2Hs8n8xA9kvQKfnr1jkF5TYW98YuyrSZ3O9ei6WfeP8h9VkY2XzXOnK6rliDY/qzk6MEfOhDfYKgF3A9bISwQLe+wPCfthFJT/bHme4bqmfqQiDJYKw9K2qt5auZcIva85jNRMhlzseJIgIQ7eJYCMeht8CVuUh00yiA/GY8ARHveLlb/JxVnPBboFT6GG38fzNx3fc9aRO8bj1gheESA51uWADL1Vy9sysTQUYvR6XHkheT6kUyYE+bBtb1/agow=="
                                ]
                            }
                        ]
                    }
                }
            },
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        submessages: [
                            {
                                messageType: 1,
                                gridImageMetadata: {
                                    gridImageUrl: {
                                        imagePreviewUrl: "https://files.catbox.moe/5tgkff.jpg"
                                    },
                                    imageUrls: [
                                        {
                                            imagePreviewUrl: "https://files.catbox.moe/5tgkff.jpg",
                                            imageHighResUrl: "https://files.catbox.moe/5tgkff.jpg",
                                            sourceUrl: "https://files.catbox.moe/5tgkff.jpg"
                                        }
                                    ]
                                }
                            },
                            {
                                messageType: 2,
                                messageText: "Owner of Vloûte Cataclysm"
                            }
                        ],
                        unifiedResponse: {
                            data: Buffer.from(JSON.stringify({
                                "response_id": "99a86e55-505f-428d-8f83-82f06e419fcd",
                                "sections": [
                                    {
                                        "view_model": {
                                            "primitive": {
                                                "media": {
                                                    "url": "https://files.catbox.moe/5tgkff.jpg",
                                                    "mime_type": "image/png",
                                                    "width": 16,
                                                    "height": 9
                                                },
                                                "imagine_type": "IMAGE",
                                                "status": {
                                                    "status": "READY"
                                                },
                                                "__typename": "GenAIImaginePrimitive"
                                            },
                                            "__typename": "GenAISingleLayoutViewModel"
                                        }
                                    },
                                    {
                                        "view_model": {
                                            "primitive": {
                                                "__typename": "GenAICompactEntityPrimitive",
                                                "title": "VenzioLûx",
                                                "subtitle": "Owner of Vloûte Cataclysm",
                                                "secondary_subtitle": "TikTok Creator",
                                                "entity_id": 867051314767696,
                                                "entity_url": "https://tiktok.com/@rolenzo.0",
                                                "entity_type": "PAGE",
                                                "action_type": "FOLLOW",
                                                "is_verified": true,
                                                "image": {
                                                    "url": "https://files.catbox.moe/5tgkff.jpg",
                                                    "url_fallback": "https://files.catbox.moe/5tgkff.jpg"
                                                }
                                            },
                                            "__typename": "GenAISingleLayoutViewModel"
                                        }
                                    }
                                ]
                            })).toString('base64')
                        },
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedAiBotMessageInfo: {
                                botJid: "867051314767696@bot"
                            },
                            forwardOrigin: 4
                        }
                    }
                }
            }
        },
        { quoted: msg }
    );
};

const ownerCommand = async (sock, chatId, msg, args = [], options = {}) => {
    try {
        const targetChatId = chatId || msg?.key?.remoteJid || options.chatId;
        const senderId = options.senderId || msg?.key?.participant || msg?.key?.remoteJid || '';

        if (senderId) {
            try {
                const isAllowed = await isOwnerOrSudo(senderId, sock, targetChatId);
                if (!isAllowed) {
                    await sock?.sendMessage?.(targetChatId, {
                        text: '⚠️ Only the owner or sudo user can use this feature.'
                    }, { quoted: msg });
                    return true;
                }
            } catch (error) {
                console.error('[owner] permission check failed:', error?.message || error);
            }
        }

        if (typeof sock?.relayMessage === 'function') {
            await sendOwnerRichResponse(sock, targetChatId, msg);
            return true;
        }

        if (typeof sock?.sendMessage === 'function') {
            await sock.sendMessage(targetChatId, {
                text: '👑 Owner feature loaded.'
            }, { quoted: msg });
        }

        return true;
    } catch (error) {
        console.error('[owner] error:', error?.message || error);
        try {
            await sock?.sendMessage?.(chatId || msg?.key?.remoteJid, {
                text: `❌ ${error?.message || 'Owner command failed.'}`
            }, { quoted: msg });
        } catch (sendErr) {}
        return false;
    }
};

ownerCommand.name = 'owner';
ownerCommand.description = 'Show the owner rich-response feature menu';
ownerCommand.category = 'OWNER/ADMIN';
ownerCommand.aliases = ['ownercmd'];

module.exports = ownerCommand;
