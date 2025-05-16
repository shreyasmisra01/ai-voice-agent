require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    FILE_ACCESS_KEY: process.env.FILE_ACCESS_KEY,
    PRODUCTION_BACKEND_URL: process.env.PRODUCTION_BACKEND_URL,

    urls: {
        OPENROUTER_API_BASE_URL: "https://openrouter.ai/api/v1",
        ELEVENLABS_API_BASE_URL: "https://api.elevenlabs.io"
    }
};
