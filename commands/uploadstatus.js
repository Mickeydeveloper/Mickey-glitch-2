const uploadStatusCommand = {
    name: "groupstatus",

    aliases: [
        "gcsw",
        "swgc",
        "upgcsw",
        "upswgc",
        "uploadstatus",
        "upload-status",
        "gstatus"
    ],

    category: "group",

    permissions: {
        admin: true,
        group: true
    },

    description:
        "📤 Send text, image or video directly to WhatsApp Group Status",

    code: async (ctx) => {
        try {
            // ═══════════════════════════════════════════════
            // GROUP CHECK
            // ═══════════════════════════════════════════════

            const target =
                ctx.chatId ||
                ctx.msg?.key?.remoteJid;

            if (
                !target ||
                !target.endsWith("@g.us")
            ) {
                return await ctx.reply(
                    "❌ Command hii inafanya kazi ndani ya group tu."
                );
            }

            // ═══════════════════════════════════════════════
            // GET INPUT / CAPTION
            // ═══════════════════════════════════════════════

            const input = String(
                ctx.text ||
                ctx.quoted?.body ||
                ""
            ).trim();

            // ═══════════════════════════════════════════════
            // DETECT MEDIA
            // ═══════════════════════════════════════════════

            let type = null;

            try {
                type = ctx.isMedia([
                    "image",
                    "video"
                ]);
            } catch (e) {
                type = null;
            }

            // ═══════════════════════════════════════════════
            // NOTHING PROVIDED
            // ═══════════════════════════════════════════════

            if (!input && !type) {
                return await ctx.reply(
                    "📤 *GROUP STATUS*\n\n" +
                    "Reply kwenye image/video kisha tumia:\n" +
                    "`.groupstatus`\n\n" +
                    "Au tuma text:\n" +
                    "`.groupstatus Hello everyone!`"
                );
            }

            let content;

            // ═══════════════════════════════════════════════
            // IMAGE / VIDEO
            // ═══════════════════════════════════════════════

            if (
                type === "image" ||
                type === "video"
            ) {
                let buffer = null;

                // Current message
                try {
                    if (
                        ctx.msg?.media?.download
                    ) {
                        buffer =
                            await ctx.msg.media.download();
                    }
                } catch (e) {
                    console.log(
                        "[groupstatus] Current media download failed:",
                        e?.message
                    );
                }

                // Quoted message fallback
                if (!buffer) {
                    try {
                        if (
                            ctx.quoted?.media?.download
                        ) {
                            buffer =
                                await ctx.quoted.media.download();
                        }
                    } catch (e) {
                        console.log(
                            "[groupstatus] Quoted media download failed:",
                            e?.message
                        );
                    }
                }

                if (
                    !buffer ||
                    !Buffer.isBuffer(buffer) ||
                    buffer.length === 0
                ) {
                    return await ctx.reply(
                        "❌ Imeshindikana kupakua media.\n" +
                        "Jaribu ku-reply image/video tena kisha utumie command."
                    );
                }

                content = {
                    [type]: buffer,

                    ...(input
                        ? { caption: input }
                        : {})
                };
            }

            // ═══════════════════════════════════════════════
            // TEXT STATUS
            // ═══════════════════════════════════════════════

            else {
                content = {
                    text: input
                };
            }

            // ═══════════════════════════════════════════════
            // SEND TO GROUP STATUS
            // ═══════════════════════════════════════════════
            //
            // IMPORTANT:
            // Do NOT use status@broadcast here.
            // ctx.reply + groupStatus is the mechanism
            // used by the working command.
            // ═══════════════════════════════════════════════

            await ctx.reply({
                ...content,

                contextInfo: {
                    statusAudienceMetadata: {
                        audienceType: 1,

                        listName:
                            ctx.sender?.pushName ||
                            "Group Status",

                        listEmoji: "🏷️"
                    }
                },

                groupStatus: true
            });

            // ═══════════════════════════════════════════════
            // SUCCESS
            // ═══════════════════════════════════════════════

            return await ctx.reply(
                ctx.format?.info
                    ? ctx.format.info(
                        "Group status sent successfully!"
                    )
                    : "✅ Group status sent successfully!"
            );

        } catch (error) {

            console.error(
                "[groupstatus] Error:",
                error?.stack ||
                error?.message ||
                error
            );

            // ═══════════════════════════════════════════════
            // SAFE ERROR HANDLER
            // ═══════════════════════════════════════════════

            try {
                if (
                    ctx.helper?.handleError
                ) {
                    return await ctx.helper.handleError(
                        ctx,
                        error,
                        false
                    );
                }

                return await ctx.reply(
                    "❌ Imeshindikana kuweka Group Status.\n" +
                    "⚠️ " +
                    (
                        error?.message ||
                        "Unknown error"
                    )
                );

            } catch (fallbackError) {
                console.error(
                    "[groupstatus] Error handler failed:",
                    fallbackError?.message ||
                    fallbackError
                );

                return false;
            }
        }
    }
};

module.exports = uploadStatusCommand;