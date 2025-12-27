/**
 * Convert MP3 files to WAV format using Node.js
 * This script uses ffmpeg-static if available, or prompts user to install ffmpeg
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');

const files = [
  { mp3: 'notification_temp.mp3', wav: 'notification.wav' },
  { mp3: 'booking_temp.mp3', wav: 'booking.wav' },
  { mp3: 'reminder_temp.mp3', wav: 'reminder.wav' },
  { mp3: 'message_temp.mp3', wav: 'message.wav' },
  { mp3: 'alarm_temp.mp3', wav: 'alarm.wav' },
];

function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function convertFile(mp3File, wavFile) {
  const mp3Path = path.join(soundsDir, mp3File);
  const wavPath = path.join(soundsDir, wavFile);
  
  if (!fs.existsSync(mp3Path)) {
    console.log(`⚠️  ${mp3File} not found, skipping...`);
    return false;
  }

  try {
    console.log(`🔄 Converting ${mp3File} to ${wavFile}...`);
    execSync(
      `ffmpeg -i "${mp3Path}" -ar 44100 -ac 1 "${wavPath}" -y -loglevel error`,
      { stdio: 'inherit' }
    );
    console.log(`✅ Converted ${wavFile}`);
    return true;
  } catch (error) {
    console.error(`❌ Error converting ${mp3File}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🎵 Converting MP3 files to WAV format\n');

  if (!checkFFmpeg()) {
    console.log('❌ ffmpeg not found!');
    console.log('\n📝 Please install ffmpeg:');
    console.log('   macOS: brew install ffmpeg');
    console.log('   Linux: sudo apt-get install ffmpeg');
    console.log('   Windows: Download from https://ffmpeg.org/download.html');
    console.log('\n💡 Alternatively, you can:');
    console.log('   1. Use an online converter: https://cloudconvert.com');
    console.log('   2. Keep MP3 files and update app.json to use .mp3 extensions');
    process.exit(1);
  }

  let converted = 0;
  for (const file of files) {
    if (convertFile(file.mp3, file.wav)) {
      converted++;
      // Remove temp MP3 file after successful conversion
      const mp3Path = path.join(soundsDir, file.mp3);
      if (fs.existsSync(mp3Path)) {
        fs.unlinkSync(mp3Path);
      }
    }
  }

  console.log(`\n✅ Conversion complete! Converted ${converted}/${files.length} files.`);
}

main();
