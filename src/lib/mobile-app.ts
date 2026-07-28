export const MOBILE_APP = {
  scheme: 'schoolfinder',
  // Place built APK at public/downloads/schoolfinder.apk
  apkUrl: '/downloads/schoolfinder.apk',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.schoolfinder.mobile',
  // Set NEXT_PUBLIC_APPLE_APP_ID once the iOS app is live. Until then these stay
  // null so nothing links to a placeholder "id000000000" App Store page.
  appleAppId: process.env.NEXT_PUBLIC_APPLE_APP_ID || null,
  appStoreUrl: process.env.NEXT_PUBLIC_APPLE_APP_ID
    ? `https://apps.apple.com/app/schoolfinder/id${process.env.NEXT_PUBLIC_APPLE_APP_ID}`
    : null,
} as const;

export const BANNER_DISMISSED_KEY = 'sf_app_banner_dismissed';
