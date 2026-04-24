import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.touched.app',
  appName: 'Touched',
  webDir: 'out',
  server: {
    url: 'https://better-ivory.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#EDE4DA',
      androidSplashResourceName: 'splash',
      androidScaleType: 'FIT_XY',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#EDE4DA',
      overlaysWebView: true,
    },
  },
}

export default config
