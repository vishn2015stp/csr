let app;
let importError = null;

try {
    app = require('../server/server.js');
} catch (err) {
    importError = err;
}

module.exports = (req, res) => {
    if (importError) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({
            error: "Failed to import server module during Vercel cold start",
            details: importError.message,
            stack: importError.stack
        });
    }
    return app(req, res);
};
