#!/bin/bash

# Download Professional Notification Sounds from notificationsounds.com
# These are direct download URLs for MP3 format (we'll convert to WAV)

set -e

SOUNDS_DIR="assets/sounds"
mkdir -p "$SOUNDS_DIR"

echo "🎵 Downloading Professional Notification Sounds"
echo "================================================"
echo ""

# Direct download URLs from notificationsounds.com
# These are the actual MP3 download links extracted from the website

declare -A SOUNDS=(
  ["notification.wav"]="https://proxy.notificationsounds.com/soft-subtle-ringtones/slick-notification/download/file-sounds-1329-slick.mp3"
  ["booking.wav"]="https://proxy.notificationsounds.com/free-jingles-and-logos/joyous-chime-notification/download/file-sounds-1347-joyous.mp3"
  ["reminder.wav"]="https://proxy.notificationsounds.com/free-jingles-and-logos/dutifully-notification-tone/download/file-sounds-1227-dutifully.mp3"
  ["message.wav"]="https://proxy.notificationsounds.com/message-tones/pristine-609/download/file-sounds-1150-pristine.mp3"
  ["alarm.wav"]="https://proxy.notificationsounds.com/notification-sounds/sharp-592/download/file-sounds-1139-sharp.mp3"
)

# Check if ffmpeg is installed (needed for conversion)
if ! command -v ffmpeg &> /dev/null; then
  echo "⚠️  ffmpeg not found. Will download MP3 files."
  echo "   Install ffmpeg to convert to WAV: brew install ffmpeg"
  echo ""
  CONVERT=false
else
  CONVERT=true
  echo "✅ ffmpeg found. Will convert MP3 to WAV format."
  echo ""
fi

# Download each sound
for filename in "${!SOUNDS[@]}"; do
  url="${SOUNDS[$filename]}"
  mp3_file="${filename%.wav}.mp3"
  wav_file="$filename"
  
  echo "📥 Downloading $filename..."
  
  # Download MP3
  if curl -L -f -o "$SOUNDS_DIR/$mp3_file" "$url" 2>/dev/null; then
    echo "   ✅ Downloaded MP3"
    
    # Convert to WAV if ffmpeg is available
    if [ "$CONVERT" = true ]; then
      echo "   🔄 Converting to WAV..."
      if ffmpeg -i "$SOUNDS_DIR/$mp3_file" -ar 44100 -ac 1 "$SOUNDS_DIR/$wav_file" -y -loglevel error 2>/dev/null; then
        rm "$SOUNDS_DIR/$mp3_file"  # Remove MP3 after conversion
        echo "   ✅ Converted to WAV"
      else
        echo "   ⚠️  Conversion failed, keeping MP3"
      fi
    else
      echo "   ⚠️  Keeping MP3 format (install ffmpeg to convert)"
    fi
  else
    echo "   ❌ Download failed for $filename"
    echo "   Please download manually from:"
    echo "   https://notificationsounds.com"
  fi
  echo ""
done

echo "📊 Summary:"
echo "   Files location: $SOUNDS_DIR"
ls -lh "$SOUNDS_DIR" | grep -E "\.(wav|mp3)$" || echo "   No sound files found"

echo ""
echo "✅ Done!"
echo ""
echo "📝 Next steps:"
echo "   1. Verify all files are in assets/sounds/"
echo "   2. Update app.json to list all sound files"
echo "   3. Rebuild app: npx expo prebuild --clean"
echo ""
