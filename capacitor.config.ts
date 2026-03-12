import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.btprox.app',
  appName: 'btprox',
  webDir: 'dist/client',
  server: {
    // Uncomment and set to your dev server IP for live reload during development:
    // url: 'https://192.168.x.x:4222',
    cleartext: true,
  },
};

export default config;
