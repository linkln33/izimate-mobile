/**
 * Helper script to download notification sounds
 * 
 * Usage:
 * 1. Visit the websites and find direct download URLs
 * 2. Update the URLs below
 * 3. Run: node scripts/download-sounds-helper.js
 * 
 * Or use this as a template for manual downloads
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');

// Ensure directory exists
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

// Sound URLs - UPDATE THESE with actual download URLs from the websites
const soundUrls = {
  // Get these URLs by:
  // 1. Visiting notificationsounds.com
  // 2. Right-clicking "Download" button
  // 3. Copying the link address
  notification: null, // Add URL here
  booking: null,      // Add URL here
  reminder: null,     // Add URL here
  message: null,      // Add URL here
  alarm: null,        // Add URL here
};

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('URL not provided'));
      return;
    }

    const protocol = url.startsWith('https') ? https : http;
    
    const file = fs.createWriteStream(filepath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        return downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete file on error
      reject(err);
    });
  });
}

async function downloadSounds() {
  console.log('🎵 Downloading Professional Notification Sounds\n');
  console.log('⚠️  Note: This script requires direct download URLs.');
  console.log('   Visit the websites and update the URLs in this script.\n');
  
  const sounds = [
    { name: 'notification.wav', url: soundUrls.notification },
    { name: 'booking.wav', url: soundUrls.booking },
    { name: 'reminder.wav', url: soundUrls.reminder },
    { name: 'message.wav', url: soundUrls.message },
    { name: 'alarm.wav', url: soundUrls.alarm },
  ];

  let downloaded = 0;
  let skipped = 0;

  for (const sound of sounds) {
    const filepath = path.join(soundsDir, sound.name);
    
    if (!sound.url) {
      console.log(`⏭️  Skipping ${sound.name} (no URL provided)`);
      skipped++;
      continue;
    }

    try {
      console.log(`📥 Downloading ${sound.name}...`);
      await downloadFile(sound.url, filepath);
      console.log(`✅ Downloaded ${sound.name}\n`);
      downloaded++;
    } catch (error) {
      console.error(`❌ Error downloading ${sound.name}:`, error.message);
      console.log(`   Please download manually from the websites.\n`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Downloaded: ${downloaded}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  
  if (skipped > 0) {
    console.log('\n📝 Next steps:');
    console.log('   1. Visit notificationsounds.com, freesound.org, or zapsplat.com');
    console.log('   2. Download the missing sounds');
    console.log('   3. Place them in assets/sounds/ with correct filenames');
    console.log('   4. Rebuild your app');
  }
}

// Run if called directly
if (require.main === module) {
  downloadSounds().catch(console.error);
}

module.exports = { downloadSounds, downloadFile };
