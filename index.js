const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');
const axios = require('axios');
const { twiml: { VoiceResponse } } = require('twilio');
const { v4: uuid } = require('uuid');

const config = require('./config')
const middleware = require('./middleware');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Make the audio files publicly available
app.use('/audio', middleware.customHeaderMiddleware, express.static(path.join(__dirname, 'voice-output')));

// System prompt
const systemPrompt = `
YOUR ROLE: 
You are a helpful and concise voice assistant for a consulting company which deals with the development of AI products. User will ask you questions about the development of AI products. 

INSTRUCTIONS YOU MUST FOLLOW:
- Speak in a natural, conversational tone, and keep your answers short and easy to understand as if you're speaking aloud. 
- Avoid long or complex explanations. Respond in a way that sounds good when converted to voice.
- Keep your answers short and concise.
- Avoid using complex language or jargon.
- Don't answer any other questions which are not about or related to the development of AI products. 
- If you can't understand the question, say "I'm sorry, I don't understand your question. Can you rephrase or repeat it?"
- If you don't know the answer to a question, say "I don't know."
- Be friendly and welcoming. If user is using foul language, then try to calm them down.

OUTPUT FORMAT YOU MUST FOLLOW:
- Return only a string format of the answer.
- Do not return any other kind of format
`

// Initialize OpenAI
const openai = new OpenAI({
  baseURL: config.urls.OPENROUTER_API_BASE_URL,
  apiKey: config.OPENROUTER_API_KEY
});

// Routes
app.get("/", async (req, res) => {
  res.redirect("/heartbeat");
})

app.get("/heartbeat", (req, res) => {
  res.status(200).send("API is running!");
})

app.get("/voice-id", async (req, res) => {
  try {
    const response = await axios.get(`${config.urls.ELEVENLABS_API_BASE_URL}/v2/voices`, {
      headers: {
        "xi-api-key": config.ELEVENLABS_API_KEY,
      }
    })

    const data = response.data;
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
})

app.post('/voice', async (req, res) => {
  const userSpeech = req.body.SpeechResult;

  if (!userSpeech) {
    return res.status(400).json({ error: 'SpeechResult is required' });
  }

  try {
    const gptResponse = await openai.chat.completions.create({
      model: 'deepseek/deepseek-prover-v2:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userSpeech }
      ]
    });

    const aiText = gptResponse.choices[0].message.content;

    const cleanedAiText = aiText.replace(/```[\s\S]*?```/g, '')   // Remove triple backtick blocks
    .replace(/`{1,3}/g, '')                // Remove inline or stray backticks
    .replace(/^\s*[\r\n]/gm, '')           // Remove empty lines
    .trim();

    console.log("Text generated now sending to elevenlabs for generating audio.")

    const elevenAudioUrl = await textToSpeech(cleanedAiText);

    console.log("Audio generated now sending to twilio for playback.")

    const twilioResponse = new VoiceResponse();

    if (elevenAudioUrl.hasError) {
      console.log(elevenAudioUrl.error)
      twilioResponse.say("Sorry, something went wrong. Please try again later.")
    } else {
      twilioResponse.play(elevenAudioUrl.url);
      console.log("Audio sent to twilio")
    }

    console.log("Response sent to twilio")
    res.type('text/xml');
    res.status(200).send(twilioResponse.toString());

  } catch (error) {
    console.error("Error at /voice endpoint: ", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper Function
async function textToSpeech(text) {
  try { 
    const voiceId = config.ELEVENLABS_VOICE_ID;
    
    console.log("Generating audio for text")

    const response = await axios.post(
      `${config.urls.ELEVENLABS_API_BASE_URL}/v1/text-to-speech/${voiceId}`,
      { text, voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
      {
        headers: {
        'xi-api-key': config.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    // Need to upload this buffer to a public audio URL (e.g. S3 or Firebase)
    // For now, saving it locally and exposing a url to access the file
    console.log("Generating audio file locally for testing.")
    
    const audioBuffer = response.data;
    const key = `output-${uuid()}.mp3`

    const filename = `./voice-output/${key}`;
    fs.writeFileSync(filename, audioBuffer);

    console.log("Generated the file!")


    
    return { url: `${config.PRODUCTION_BACKEND_URL}/audio/${key}`, hasError: false, error: null };
  } catch (error) {
    console.log(error)
    return { url: null, hasError: true, error: error.message };
  }
}

const PORT = config.PORT;
app.listen(PORT, () => console.log(`Server running on PORT:${PORT}`));

