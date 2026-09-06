import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.reselltrack.app',
  appName: 'ResellTrack',
  webDir: 'dist',

  // ── Android-specific settings ─────────────────────────────────────────────
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,  // set true for dev builds
  },

  server: {
    androidScheme: 'https',
    // Uncomment below to use live reload during development:
    // url: 'http://YOUR_LOCAL_IP:5173',
    // cleartext: true,
    allowNavigation: [
      'devqrpcxaxjcxdixwitw.supabase.co',
      '*.supabase.co',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
    ],
  },

  plugins: {
    // ── Splash Screen ────────────────────────────────────────────────────────
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#0D0F14',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    // ── Status Bar ───────────────────────────────────────────────────────────
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0D0F14',
      overlaysWebView: false,
    },

    // ── Keyboard ─────────────────────────────────────────────────────────────
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },

    // ── Local Notifications ──────────────────────────────────────────────────
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#F5A623',
      sound: 'beep.wav',
    },
  },
}

export default config
