// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Monorepo paths
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

// Watch the entire monorepo
config.watchFolders = [workspaceRoot];

// Native modules that need special handling to prevent duplicate registration
// These MUST resolve from a single location
const nativeModulesToDedupe = {
  // Force these to mobile's node_modules (where they exist)
  "react-native-gesture-handler": path.resolve(projectRoot, "node_modules/react-native-gesture-handler"),
  "react-native-screens": path.resolve(projectRoot, "node_modules/react-native-screens"),
  "react-native-safe-area-context": path.resolve(projectRoot, "node_modules/react-native-safe-area-context"),
  // These are only in root node_modules
  "react-native-reanimated": path.resolve(workspaceRoot, "node_modules/react-native-reanimated"),
  "@gorhom/bottom-sheet": path.resolve(workspaceRoot, "node_modules/@gorhom/bottom-sheet"),
};

config.resolver = {
  ...config.resolver,
  // Search mobile first, then root
  nodeModulesPaths: [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
  ],
  // Force native modules to specific locations
  extraNodeModules: nativeModulesToDedupe,
  // Block the root duplicate of gesture handler to prevent double registration
  blockList: [
    // Block gesture handler from root since we use mobile's copy
    new RegExp(`${workspaceRoot}/node_modules/react-native-gesture-handler/.*`),
  ],
};

module.exports = config;
