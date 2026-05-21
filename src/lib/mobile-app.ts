export const MOBILE_APP = {
  scheme: 'schoolfinder',
  // Place built APK at public/downloads/schoolfinder.apk
  apkUrl: '/downloads/schoolfinder.apk',
  // Update these when the app is published to the stores:
  appStoreUrl: 'https://apps.apple.com/app/schoolfinder/id000000000',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.schoolfinder.mobile',
  appleAppId: '000000000', // numeric App Store ID only
} as const;

export const BANNER_DISMISSED_KEY = 'sf_app_banner_dismissed';
