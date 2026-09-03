import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.reselltrack.app',
  appName: 'ResellTrack',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0F1117',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
}

export default config
