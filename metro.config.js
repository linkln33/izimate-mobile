// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add path alias support
config.resolver = {
  ...config.resolver,
  alias: {
    '@': path.resolve(__dirname, '.'),
  },
};

// Ensure React CJS files are watched
config.watchFolders = [
  path.resolve(__dirname),
  path.resolve(__dirname, 'node_modules/react'),
];

// Make sure React files aren't blocked
config.resolver.blockList = config.resolver.blockList || [];
// Remove react from blockList if it's there
config.resolver.blockList = config.resolver.blockList.filter(
  (pattern) => !pattern.toString().includes('react')
);

// Block native-only modules on web
if (process.env.EXPO_PLATFORM === 'web' || process.env.PLATFORM === 'web') {
  config.resolver.blockList.push(
    /node_modules\/react-native-maps\/.*/,
    /node_modules\/react-native-google-places-autocomplete\/.*/
  );
}

module.exports = config;
