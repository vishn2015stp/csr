let app;
let importError = null;

try {
    // Ensure dotenv loads from the project root, not the server/ subdirectory
    require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
    app = require('../server/server.js');
} catch (err) {
    importError = err;
    console.error('Vercel cold start import error:', err);
}

module.exports = (req, res) => {
    if (importError) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({
            error: "Failed to import server module during Vercel cold start",
            details: importError.message,
            stack: process.env.NODE_ENV === 'development' ? importError.stack : undefined
        });
    }
    return app(req, res);
};
