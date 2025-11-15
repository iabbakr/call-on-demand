import 'dotenv/config'; // make sure this is installed via `npm i dotenv`
const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getUniqueIdentifier = () => {
  if (IS_DEV) return 'com.yourname.callondemand.dev';
  if (IS_PREVIEW) return 'com.yourname.callondemand.preview';
  return 'com.yourname.callondemand';
};

const getAppName = () => {
  if (IS_DEV) return 'Call On Demand (Dev)';
  if (IS_PREVIEW) return 'Call On Demand (Preview)';
  return 'Call On Demand';
};

export default {
  expo: {
    name: getAppName(),
    slug: 'call-on-demand',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.jpg',
    userInterfaceStyle: 'automatic',

    scheme: 'callondemand', // ✅ deep linking & Paystack requirement

    ios: {
      bundleIdentifier: getUniqueIdentifier(),
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },

    android: {
      package: getUniqueIdentifier(),
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },

    extra: {
      eas: {
        projectId: 'aa4a2674-e56b-4fdd-9c49-499563436e06',
      },
      // ✅ Cloudinary
      CLOUDINARY_URL: process.env.CLOUDINARY_URL,
      CLOUDINARY_UPLOAD_PRESET: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
      CLOUDINARY_CLOUD_NAME: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,

      // ✅ Paystack
      PAYSTACK_PUBLIC_KEY: process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY,
      PAYSTACK_SECRET_KEY: process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY,

      // ✅ Firebase
      FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,

      // ✅ VTpass
      VTPASS_API_KEY: process.env.EXPO_PUBLIC_VTPASS_API_KEY,
      VTPASS_PUBLIC_KEY: process.env.EXPO_PUBLIC_VTPASS_PUBLIC_KEY,
      VTPASS_SECRET_KEY: process.env.EXPO_PUBLIC_VTPASS_SECRET_KEY,
      VTPASS_BASE_URL: process.env.VTPASS_BASE_URL,
    },
  },
};
