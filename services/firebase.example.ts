import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 複製這個檔案為 firebase.ts，並填入你自己的 Firebase 專案設定
// （Firebase Console → 專案設定 → 你的應用程式 → SDK 設定與配置）
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// browserLocalPersistence = 關掉 App / 重開瀏覽器後仍維持登入狀態
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
});
export const db = getFirestore(app);
export default app;
