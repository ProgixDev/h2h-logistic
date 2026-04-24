// Dynamic Expo config. Reads Mapbox tokens from environment so they never
// land in version control. Set in a local `.env` file (not committed) or in
// EAS secrets. See README-MAPBOX.md for details.

const MAPBOX_PUBLIC_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
const MAPBOX_DOWNLOADS_TOKEN =
  process.env.MAPBOX_DOWNLOADS_TOKEN ?? '';
const MAPBOX_MAPS_VERSION = '11.11.0';

module.exports = () => ({
  expo: {
    name: 'H2H Logistic',
    slug: 'h2h-logistic',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'h2hlogistic',
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: 'com.handtohand.logistic',
      supportsTablet: true,
      icon: './assets/expo.icon',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "H2H Logistic utilise votre position pour vous guider en temps réel pendant vos livraisons.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "H2H Logistic utilise votre position pour vous guider en temps réel pendant vos livraisons, même en arrière-plan.",
      },
    },
    android: {
      package: 'com.handtohand.logistic',
      adaptiveIcon: {
        backgroundColor: '#14248A',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
      ],
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#14248A',
          android: {
            image: './assets/images/splash-icon.png',
            imageWidth: 76,
          },
        },
      ],
      'expo-image',
      'expo-secure-store',
      'expo-font',
      'expo-maps',
      [
        '@rnmapbox/maps',
        {
          RNMapboxMapsVersion: MAPBOX_MAPS_VERSION,
        },
      ],
      [
        '@badatgil/expo-mapbox-navigation',
        {
          accessToken: MAPBOX_PUBLIC_TOKEN,
          mapboxMapsVersion: MAPBOX_MAPS_VERSION,
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
            deploymentTarget: '15.1',
          },
          android: {
            minSdkVersion: 24,
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'e75f43a5-9308-46f2-a879-9a5e8b48171b',
      },
    },
    owner: 'achrefdev',
  },
});
