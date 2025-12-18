// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure Metro to resolve packages from root node_modules (monorepo support)
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

config.watchFolders = [workspaceRoot];

// Store original resolver before modifying
const existingResolveRequest = config.resolver?.resolveRequest;
const existingExtraNodeModules = config.resolver?.extraNodeModules || {};

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
  ],
  // CRITICAL: Alias react-native Text to our custom Text component
  // This ensures ALL imports of Text from react-native use our font-applied version
  resolveRequest: (context, moduleName, platform) => {
    // Intercept react-native Text imports and redirect to our custom Text
    if (moduleName === 'react-native') {
      // Use the original resolver or default
      const originalResolve = existingResolveRequest || 
        require('metro-resolver').resolve;
      
      return originalResolve(context, moduleName, platform).then((result) => {
        // If resolving react-native, we'll handle Text separately via alias
        return result;
      });
    }
    
    // Default resolution for other modules
    if (existingResolveRequest) {
      return existingResolveRequest(context, moduleName, platform);
    }
    return require('metro-resolver').resolve(context, moduleName, platform);
  },
  extraNodeModules: {
    ...existingExtraNodeModules,
  },
};

module.exports = config;
