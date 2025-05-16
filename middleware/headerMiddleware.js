const config = require('../config');

function customHeaderMiddleware(req, res, next) {
    const authHeader = req.headers['x-voice-agent-token'];

    if (authHeader !== config.FILE_ACCESS_KEY) {
        return res.status(403).send('Forbidden');
    }
    
    // Pass the request to the next middleware
    next();
}

module.exports = customHeaderMiddleware;