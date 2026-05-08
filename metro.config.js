const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

// Stub for @react-native-community/netinfo (required by pusher-js React Native build)
const netinfoStub = path.resolve(__dirname, 'src/shims/netinfo.js');

// Path aliases resolution for Metro (same as babel-plugin-module-resolver)
const srcPath = path.resolve(__dirname, 'src');

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    // Resolve @react-native-community/netinfo to local stub so pusher-js works
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === '@react-native-community/netinfo') {
        return { type: 'sourceFile', filePath: netinfoStub };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
    extraNodeModules: {
      '@': srcPath,
      '@components': path.resolve(srcPath, 'components'),
      '@config': path.resolve(srcPath, 'config'),
      '@screens': path.resolve(srcPath, 'screens'),
      '@navigation': path.resolve(srcPath, 'navigation'),
      '@context': path.resolve(srcPath, 'context'),
      '@services': path.resolve(srcPath, 'services'),
      '@theme': path.resolve(srcPath, 'theme'),
      '@utils': path.resolve(srcPath, 'utils'),
      '@hooks': path.resolve(srcPath, 'hooks'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
