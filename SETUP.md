# CoupleApp 設置與部署指南

本指南提供從零開始設置CoupleApp的詳細步驟，包括開發環境、Firebase配置、代碼實現和部署。請按順序執行每個步驟。

## 目錄
1. [開發環境設置](#開發環境設置)
2. [Firebase 設置](#firebase-設置)
3. [專案初始化](#專案初始化)
4. [核心功能實現](#核心功能實現)
5. [測試與調試](#測試與調試)
6. [建置與部署](#建置與部署)

## 開發環境設置

### 1. 安裝Node.js
- 前往 [https://nodejs.org/](https://nodejs.org/) 下載並安裝Node.js v18+。
- 安裝後，在終端機執行 `node -v` 和 `npm -v` 確認版本。

### 2. 安裝Expo CLI
```bash
npm install -g @expo/cli
```

### 3. 安裝VS Code（推薦IDE）
- 下載並安裝 [Visual Studio Code](https://code.visualstudio.com/)。
- 安裝以下擴展：
  - React Native Tools
  - Firebase
  - Prettier

### 4. 安裝手機模擬器（選用）
- **Android**：安裝 [Android Studio](https://developer.android.com/studio)，設定AVD。
- **iOS**：安裝 [Xcode](https://developer.apple.com/xcode/)（僅限macOS）。

## Firebase 設置

Firebase 是我們的主要雲端服務，提供身份驗證、資料庫、存儲和通知功能。

### 1. 註冊Google帳戶
- 如果沒有Google帳戶，請前往 [https://accounts.google.com/](https://accounts.google.com/) 註冊一個。

### 2. 創建Firebase專案
1. 前往 [https://console.firebase.google.com/](https://console.firebase.google.com/)。
2. 點擊「創建專案」或「Create a project」。
3. 輸入專案名稱：`couple-app-project`（或自訂名稱）。
4. 啟用Google Analytics（可選，但推薦用於基本統計）。
5. 選擇Google Analytics帳戶（或創建新帳戶）。
6. 點擊「創建專案」，等待完成。

### 3. 啟用Firebase服務
在Firebase控制台中：

#### Authentication（身份驗證）
1. 在左側選單點擊「Authentication」。
2. 點擊「開始使用」或「Get started」。
3. 前往「Sign-in method」標籤。
4. 啟用「Email/Password」提供者（點擊啟用，儲存）。

#### Firestore Database（資料庫）
1. 在左側選單點擊「Firestore Database」。
2. 點擊「創建資料庫」或「Create database」。
3. 選擇「開始使用測試模式」（稍後可調整安全規則）。
4. 選擇資料庫位置（建議選擇離用戶最近的地區，如asia-southeast1）。

#### Storage（檔案存儲）
1. 在左側選單點擊「Storage」。
2. 點擊「開始使用」或「Get started」。
3. 選擇「開始使用測試模式」。

#### Cloud Messaging（推送通知）
1. 在左側選單點擊「Cloud Messaging」。
2. 點擊「開始使用」或「Get started」。
3. （iOS需要額外配置，稍後處理）

#### Functions（雲端函數，後端）
1. 在左側選單點擊「Functions」。
2. 點擊「開始使用」或「Get started」。
3. 選擇「Upgrade project」以啟用計費（免費層足夠）。
4. 選擇Node.js版本（建議18）。

### 4. 獲取專案配置
1. 在Firebase控制台，點擊齒輪圖標 > 「專案設定」或「Project settings」。
2. 在「General」標籤，滾動到「Your apps」部分。
3. 點擊「Add app」 > 選擇「Web app」圖標（</>）。
4. 輸入App nickname：`CoupleApp`。
5. 點擊「Register app」。
6. 複製「Firebase configuration」中的配置物件，類似：
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef123456"
   };
   ```
7. 儲存這些配置，稍後用於代碼中。

### 5. 設置安全規則
#### Firestore 安全規則
1. 在Firestore控制台，點擊「Rules」標籤。
2. 替換為以下規則（確保只有已驗證用戶能訪問自己的數據）：
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // 允許已驗證用戶讀寫自己的數據
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
3. 點擊「Publish」。

#### Storage 安全規則
1. 在Storage控制台，點擊「Rules」標籤。
2. 替換為以下規則：
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=*} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
3. 點擊「Publish」。

## 專案初始化

### 1. 創建專案
```bash
npx create-expo-app CoupleApp
cd CoupleApp
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 安裝Firebase SDK
```bash
npm install firebase
```

### 4. 安裝其他必要套件
```bash
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install @react-native-async-storage/async-storage
npm install react-native-vector-icons
```

### 5. 配置Firebase
1. 在專案根目錄創建 `firebase.js` 檔案。
2. 貼上之前複製的Firebase配置：
   ```javascript
   import { initializeApp } from 'firebase/app';
   import { getAuth } from 'firebase/auth';
   import { getFirestore } from 'firebase/firestore';
   import { getStorage } from 'firebase/storage';

   const firebaseConfig = {
     // 貼上你的配置
   };

   const app = initializeApp(firebaseConfig);
   export const auth = getAuth(app);
   export const db = getFirestore(app);
   export const storage = getStorage(app);
   ```

## 核心功能實現

### 1. 用戶註冊與登入
- 創建登入/註冊畫面
- 使用Firebase Auth實現email/password驗證
- 實現邀請碼配對邏輯

### 2. 即時訊息
- 使用Firestore實時監聽訊息
- 實現文字和圖片發送

### 3. 共享日曆
- 使用Firestore存儲事件
- 實現提醒推送

### 4. 健康追蹤（植物成長遊戲）
- 創建健康記錄介面
- 實現植物成長動畫
- 存儲數據到Firestore

### 5. 其他功能
- 依序實現照片牆、心情日記、遊戲等

## 測試與調試

### 1. 本地測試
```bash
npx expo start
```
- 使用Expo Go app掃描QR碼測試

### 2. 模擬器測試
- Android：`npx expo run:android`
- iOS：`npx expo run:ios`

### 3. 調試技巧
- 使用React DevTools
- 查看Firebase控制台的數據
- 測試推送通知

## 建置與部署

### 1. 建置APK/IPA
```bash
# Android
npx expo build:android

# iOS（需要Apple開發者帳戶）
npx expo build:ios
```

### 2. 上架應用商店
#### Google Play
1. 前往 [Google Play Console](https://play.google.com/console/)
2. 創建應用程式
3. 上傳APK，填寫描述
4. 提交審核

#### App Store
1. 前往 [App Store Connect](https://appstoreconnect.apple.com/)
2. 創建應用程式
3. 上傳IPA，填寫描述
4. 提交審核

### 3. 後續維護
- 使用Expo OTA推送更新
- 監控Firebase使用量
- 定期備份數據

## 常見問題

### Q: Firebase免費層夠用嗎？
A: 對於小規模用戶（<100人）完全夠用。

### Q: 如何處理iOS推送通知？
A: 需要Apple開發者帳戶，並在Firebase中配置APNs憑證。

### Q: 數據安全如何保證？
A: Firebase安全規則確保只有已驗證用戶能訪問數據。

如果遇到問題，請檢查Firebase文檔或Expo文檔。