import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 金鑰從環境變數讀（本機放 .env.local，線上放 Vercel Environment Variables）
// Expo 規定 client 端變數需以 EXPO_PUBLIC_ 開頭，build 時會內嵌進前端
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// browserLocalPersistence = 關掉 App / 重開瀏覽器後仍維持登入狀態
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
});
export const db = getFirestore(app);
export default app;
