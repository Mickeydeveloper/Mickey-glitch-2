const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function ensureGroupAndAdmin(sock, chatId, senderId) {
    const isGroup = chatId.endsWith('@g.us');
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'This command can only be used in groups.' });
        return { ok: false };
    }
    // Check admin status of sender and bot
    const isAdmin = require('../lib/isAdmin');
    const adminStatus = await isAdmin(sock, chatId, senderId);
    if (!adminStatus.isBotAdmin) {
        await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' });
        return { ok: false };
    }
    if (!adminStatus.isSenderAdmin) {
        await sock.sendMessage(chatId, { text: 'Only group admins can use this command.' });
        return { ok: false };
    }
    return { ok: true };
}

async function setGroupDescription(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId);
    if (!check.ok) return;
    const desc = (text || '').trim();
    if (!desc) {
        await sock.sendMessage(chatId, { text: 'Usage: .setgdesc <description>' }, { quoted: message });
        return;
    }
    try {
        await sock.groupUpdateDescription(chatId, desc);
        await sock.sendMessage(chatId, { text: '✅ Group description updated.' }, { quoted: message });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Failed to update group description.' }, { quoted: message });
    }
}

async function setGroupName(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId);
    if (!check.ok) return;
    const name = (text || '').trim();
    if (!name) {
        await sock.sendMessage(chatId, { text: 'Usage: .setgname <new name>' }, { quoted: message });
        return;
    }
    try {
        await sock.groupUpdateSubject(chatId, name);
        await sock.sendMessage(chatId, { text: '✅ Group name updated.' }, { quoted: message });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Failed to update group name.' }, { quoted: message });
    }
}

async function setGroupPhoto(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId);
    if (!check.ok) return;

    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMessage = quoted?.imageMessage || quoted?.stickerMessage;
    if (!imageMessage) {
        await sock.sendMessage(chatId, { text: 'Reply to an image/sticker with .setgpp' }, { quoted: message });
        return;
    }
    try {
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        const imgPath = path.join(tmpDir, `gpp_${Date.now()}.jpg`);
        fs.writeFileSync(imgPath, buffer);

        await sock.updateProfilePicture(chatId, { url: imgPath });
        try { fs.unlinkSync(imgPath); } catch (_) {}
        await sock.sendMessage(chatId, { text: '✅ Group profile photo updated.' }, { quoted: message });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Failed to update group profile photo.' }, { quoted: message });
    }
}

async function addMetaAI(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId);
    if (!check.ok) return;

    try {
        const botJid = '867051314767696@bot';
        await sock.groupParticipantsUpdate(chatId, [botJid], 'add');
        await sock.sendMessage(chatId, { text: '✅ Sukses add Meta AI ke grup' }, { quoted: message });
    } catch (e) {
        console.error('addMetaAI error:', e);
        await sock.sendMessage(chatId, { text: `❌ Gagal menambahkan Meta AI: ${e?.message || e}` }, { quoted: message });
    }
}

function getJids(text = '') {
    return String(text)
        .split(/[\s,]+/)
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.includes('@') ? value : `${value.replace(/\D/g, '')}@s.whatsapp.net`)
        .filter((value) => value !== '@s.whatsapp.net');
}

function getFirstArg(text = '') {
    return String(text).trim().split(/\s+/).filter(Boolean)[0] || '';
}

async function runGroupAction(sock, chatId, senderId, text, message, action, successText) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId);
    if (!check.ok) return;
    try {
        await action();
        await sock.sendMessage(chatId, { text: `✅ ${successText}` }, { quoted: message });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ ${error?.message || 'Group action failed.'}` }, { quoted: message });
    }
}

async function groupInfo(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId);
    if (!check.ok) return;
    try {
        const metadata = await sock.groupMetadata(chatId);
        await sock.sendMessage(chatId, { text: JSON.stringify(metadata, null, 2) }, { quoted: message });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ ${error?.message || 'Failed to get group info.'}` }, { quoted: message });
    }
}

async function groupInvite(sock, chatId, senderId, text, message) {
    await runGroupAction(sock, chatId, senderId, text, message, async () => {
        const code = await sock.groupInviteCode(chatId);
        await sock.sendMessage(chatId, { text: `🔗 https://chat.whatsapp.com/${code}` }, { quoted: message });
    }, 'Group invite link generated.');
}

async function groupRevokeInvite(sock, chatId, senderId, text, message) {
    await runGroupAction(sock, chatId, senderId, text, message, () => sock.groupRevokeInvite(chatId), 'Group invite link revoked.');
}

async function groupLeave(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId);
    if (!check.ok) return;
    try {
        await sock.groupLeave(chatId);
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ ${error?.message || 'Failed to leave group.'}` }, { quoted: message });
    }
}

async function groupParticipants(sock, chatId, senderId, text, message, action) {
    const jids = getJids(text);
    if (!jids.length) {
        await sock.sendMessage(chatId, { text: 'Usage: command <phone number(s)>' }, { quoted: message });
        return;
    }
    await runGroupAction(sock, chatId, senderId, text, message, () => sock.groupParticipantsUpdate(chatId, jids, action), `${action} request sent.`);
}

async function groupAdd(sock, chatId, senderId, text, message) {
    return groupParticipants(sock, chatId, senderId, text, message, 'add');
}

async function groupRemove(sock, chatId, senderId, text, message) {
    return groupParticipants(sock, chatId, senderId, text, message, 'remove');
}

async function groupPromote(sock, chatId, senderId, text, message) {
    return groupParticipants(sock, chatId, senderId, text, message, 'promote');
}

async function groupDemote(sock, chatId, senderId, text, message) {
    return groupParticipants(sock, chatId, senderId, text, message, 'demote');
}

async function groupApprove(sock, chatId, senderId, text, message) {
    const jids = getJids(text);
    if (!jids.length) {
        await sock.sendMessage(chatId, { text: 'Usage: groupApprove <phone number(s)>' }, { quoted: message });
        return;
    }
    await runGroupAction(sock, chatId, senderId, text, message, () => sock.groupRequestParticipantsUpdate(chatId, jids, 'approve'), 'Join requests approved.');
}

async function groupSettings(sock, chatId, senderId, text, message) {
    const setting = getFirstArg(text);
    const settings = {
        announcement: 'announcement',
        open: 'not_announcement',
        locked: 'locked',
        unlocked: 'unlocked',
        adminonly: 'announcement'
    };
    if (!settings[setting]) {
        await sock.sendMessage(chatId, { text: 'Usage: groupSettings announcement|open|locked|unlocked' }, { quoted: message });
        return;
    }
    await runGroupAction(sock, chatId, senderId, text, message, () => sock.groupSettingUpdate(chatId, settings[setting]), 'Group settings updated.');
}

async function groupMemberAddMode(sock, chatId, senderId, text, message) {
    const mode = getFirstArg(text);
    if (!['admin_add', 'all_member_add'].includes(mode)) {
        await sock.sendMessage(chatId, { text: 'Usage: groupMemberAddMode admin_add|all_member_add' }, { quoted: message });
        return;
    }
    await runGroupAction(sock, chatId, senderId, text, message, () => sock.groupMemberAddMode(chatId, mode), 'Member add mode updated.');
}

async function groupEphemeral(sock, chatId, senderId, text, message) {
    const seconds = Number(getFirstArg(text));
    if (!Number.isInteger(seconds) || seconds < 0) {
        await sock.sendMessage(chatId, { text: 'Usage: groupEphemeral <seconds> (0 disables)' }, { quoted: message });
        return;
    }
    await runGroupAction(sock, chatId, senderId, text, message, () => sock.groupToggleEphemeral(chatId, seconds), 'Temporary messages updated.');
}

async function groupJoinApproval(sock, chatId, senderId, text, message) {
    const mode = getFirstArg(text);
    if (!['on', 'off'].includes(mode)) {
        await sock.sendMessage(chatId, { text: 'Usage: groupJoinApproval on|off' }, { quoted: message });
        return;
    }
    await runGroupAction(sock, chatId, senderId, text, message, () => sock.groupJoinApprovalMode(chatId, mode), 'Join approval mode updated.');
}

async function groupRequests(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId);
    if (!check.ok) return;
    try {
        const requests = await sock.groupRequestParticipantsList(chatId);
        await sock.sendMessage(chatId, { text: JSON.stringify(requests, null, 2) }, { quoted: message });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ ${error?.message || 'Failed to get join requests.'}` }, { quoted: message });
    }
}

async function groupInviteInfo(sock, chatId, senderId, text, message) {
    const code = getFirstArg(text);
    if (!code) {
        await sock.sendMessage(chatId, { text: 'Usage: groupInviteInfo <invite code>' }, { quoted: message });
        return;
    }
    try {
        const info = await sock.groupGetInviteInfo(code);
        await sock.sendMessage(chatId, { text: JSON.stringify(info, null, 2) }, { quoted: message });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ ${error?.message || 'Failed to get invite info.'}` }, { quoted: message });
    }
}

async function groupFetchAll(sock, chatId, senderId, text, message) {
    try {
        const groups = await sock.groupFetchAllParticipating();
        await sock.sendMessage(chatId, { text: JSON.stringify(groups, null, 2) }, { quoted: message });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ ${error?.message || 'Failed to fetch groups.'}` }, { quoted: message });
    }
}

async function groupRemovePhoto(sock, chatId, senderId, text, message) {
    await runGroupAction(sock, chatId, senderId, text, message, () => sock.removeProfilePicture(chatId), 'Group profile photo removed.');
}

async function groupUpdateMemberLabel(sock, chatId, senderId, text, message) {
    const label = String(text || '').trim();
    if (!label) {
        await sock.sendMessage(chatId, { text: 'Usage: groupUpdateMemberLabel <label>' }, { quoted: message });
        return;
    }
    await runGroupAction(sock, chatId, senderId, text, message, () => sock.updateMemberLabel(chatId, label), 'Member label updated.');
}

async function groupAcceptInvite(sock, chatId, senderId, text, message) {
    const code = getFirstArg(text);
    if (!code) {
        await sock.sendMessage(chatId, { text: 'Usage: groupAcceptInvite <invite code>' }, { quoted: message });
        return;
    }
    try {
        const jid = await sock.groupAcceptInvite(code);
        await sock.sendMessage(chatId, { text: `✅ Joined group: ${jid}` }, { quoted: message });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ ${error?.message || 'Failed to accept invite.'}` }, { quoted: message });
    }
}

async function groupCreate(sock, chatId, senderId, text, message) {
    const parts = String(text).trim().split(/\s+/);
    const subject = parts.shift();
    const participants = getJids(parts.join(' '));
    if (!subject) {
        await sock.sendMessage(chatId, { text: 'Usage: groupCreate <name> <phone number(s)>' }, { quoted: message });
        return;
    }
    try {
        const group = await sock.groupCreate(subject, participants);
        await sock.sendMessage(chatId, { text: `✅ Group created: ${group?.id || group?.gid || 'success'}` }, { quoted: message });
    } catch (error) {
        await sock.sendMessage(chatId, { text: `❌ ${error?.message || 'Failed to create group.'}` }, { quoted: message });
    }
}

module.exports = {
    setGroupDescription,
    setGroupName,
    setGroupPhoto,
    addMetaAI,
    groupInfo,
    groupInvite,
    groupRevokeInvite,
    groupAcceptInvite,
    groupLeave,
    groupCreate,
    groupAdd,
    groupRemove,
    groupPromote,
    groupDemote,
    groupApprove,
    groupSettings,
    groupMemberAddMode,
    groupEphemeral,
    groupJoinApproval,
    groupRequests,
    groupInviteInfo,
    groupFetchAll,
    groupRemovePhoto,
    groupUpdateMemberLabel
};


