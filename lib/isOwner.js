const settings = require('../settings');

function isOwner(senderId) {
    const owner = settings.ownerNumber + '@s.whatsapp.net';
    return senderId === owner;
}

module.exports = isOwner;
