let persistencePromise;
let app;
let initializePersistence;
let loadPromise;

async function loadApplication() {
    if (!loadPromise) {
        process.env.VERCEL = '1';
        loadPromise = Promise.resolve().then(() => {
            ({ app, initializePersistence } = require('../index'));
        }).catch((error) => {
            loadPromise = null;
            throw error;
        });
    }

    await loadPromise;
}

module.exports = async function vercelHandler(req, res) {
    try {
        await loadApplication();

        if (!persistencePromise) {
            persistencePromise = initializePersistence().catch((error) => {
                persistencePromise = null;
                throw error;
            });
        }

        await persistencePromise;
        return app(req, res);
    } catch (error) {
        console.error('[Vercel] Function initialization failed:', error);
        return res.status(503).json({
            error: 'Server haijaandaliwa. Angalia Vercel Runtime Logs kwa sababu ya startup failure.'
        });
    }
};