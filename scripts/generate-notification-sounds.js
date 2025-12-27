/**
 * Script to generate simple notification sound files
 * This creates basic WAV files that can be used for notifications
 * 
 * Run with: node scripts/generate-notification-sounds.js
 * 
 * Note: For production, consider using professional sound files from:
 * - https://freesound.org
 * - https://notificationsounds.com
 * - https://www.zapsplat.com
 */

const fs = require('fs');
const path = require('path');

// Ensure sounds directory exists
const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

// Simple WAV file generator for basic beep sounds
function generateWAVFile(filename, frequency = 800, duration = 0.3, sampleRate = 44100) {
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2); // WAV header + 16-bit samples
  
  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4); // File size - 8
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // Audio format (PCM)
  buffer.writeUInt16LE(1, 22); // Number of channels (mono)
  buffer.writeUInt32LE(sampleRate, 24); // Sample rate
  buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  buffer.writeUInt16LE(2, 32); // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40); // Data chunk size
  
  // Generate sine wave samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Apply envelope (fade in/out) to avoid clicks
    const envelope = Math.min(1, t * 10) * Math.min(1, (duration - t) * 10);
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3; // 30% volume
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }
  
  fs.writeFileSync(path.join(soundsDir, filename), buffer);
  console.log(`✅ Generated: ${filename}`);
}

console.log('🎵 Generating notification sound files...\n');

// Generate different notification sounds
try {
  // General notification - pleasant beep
  generateWAVFile('notification.wav', 800, 0.3);
  
  // Booking notification - slightly higher pitch
  generateWAVFile('booking.wav', 1000, 0.4);
  
  // Reminder - gentle chime
  generateWAVFile('reminder.wav', 600, 0.5);
  
  // Message - quick double beep
  generateWAVFile('message.wav', 1200, 0.2);
  
  // Alarm - urgent triple beep
  generateWAVFile('alarm.wav', 1500, 0.6);
  
  console.log('\n✨ All sound files generated successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Test the sounds by playing them');
  console.log('2. For production, consider replacing with professional sounds from:');
  console.log('   - https://freesound.org');
  console.log('   - https://notificationsounds.com');
  console.log('   - https://www.zapsplat.com');
  console.log('3. Rebuild your app: npx expo prebuild --clean');
} catch (error) {
  console.error('❌ Error generating sounds:', error);
  process.exit(1);
}
