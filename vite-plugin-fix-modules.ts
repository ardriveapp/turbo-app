// Custom Vite plugin to fix module resolution issues
export function fixModulesPlugin() {
  return {
    name: 'fix-modules',
    config() {
      return {
        resolve: {
          alias: {
            // Force browser-compatible versions
            'pino': 'pino/browser.js',
            '@walletconnect/environment': '@walletconnect/environment/dist/index.es.js',
          },
        },
      };
    },
  };
}