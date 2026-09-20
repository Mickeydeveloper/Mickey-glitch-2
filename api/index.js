const { app, initializePersistence } = require('../index');

let persistencePromise;

module.exports = async function vercelHandler(req, res) {
    if (!persistencePromise) {
        persistencePromise = initializePersistence().catch((error) => {
            persistencePromise = null;
            throw error;
        });
    }

    try {
        await persistencePromise;
        return app(req, res);
    } catch (error) {
        console.error('[Vercel] Initialization failed:', error);
        return res.status(503).json({
            error: 'Server persistence haijaandaliwa. Weka MONGODB_URI na MONGODB_SESSION_SECRET kisha deploy tena.'
        });
    }
};