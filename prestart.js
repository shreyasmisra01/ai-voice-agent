// prestart.js
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'voice-output');

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
  console.log('"voice-output" folder created.');
} else {
  console.log('"voice-output" folder already exists.');
}
