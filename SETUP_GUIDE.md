# 小堡 App — 完整設定指南

> 這份指南帶你從零開始完成所有設定。預計時間：**1-2 小時**（第一次）

---

## 目錄

1. [安裝必要軟體](#一安裝必要軟體)
2. [建立 Firebase 專案](#二建立-firebase-專案)
3. [啟用 Firebase Auth](#三啟用-firebase-auth)
4. [設定 Firestore Database](#四設定-firestore-database)
5. [設定 Firestore 安全規則](#五設定-firestore-安全規則)
6. [取得 Firebase 設定，填入 App](#六取得-firebase-設定填入-app)
7. [設定 Cloudinary（照片儲存）](#七設定-cloudinary照片儲存)
8. [部署到 Vercel](#八部署到-vercel)
9. [本機開發測試](#九本機開發測試)
10. [常見問題](#十常見問題)

---

## 一、安裝必要軟體

### Node.js

**下載**：https://nodejs.org → 點「LTS」版本

```bash
node -v   # 確認安裝：應顯示 v18 以上
```

### Vercel CLI

```bash
npm install -g vercel
```

### Firebase CLI（可選，用於部署安全規則）

```bash
npm install -g firebase-tools
```

---

## 二、建立 Firebase 專案

1. 前往 **https://console.firebase.google.com**，用 Google 帳號登入
2. 點「**＋ 新增專案**」
3. 輸入名稱（如 `小堡`），關閉 Google Analytics，點「建立專案」
4. 等待建立完成

---

## 三、啟用 Firebase Auth

1. 左側選單 → 「**Authentication**」→「開始使用」
2. 點「**Sign-in method**」分頁
3. 點「**電子郵件/密碼**」，開啟開關，儲存

---

## 四、設定 Firestore Database

1. 左側選單 → 「**Firestore Database**」→「建立資料庫」
2. 選「**以生產模式啟動**」→ 下一步
3. 地區選 `asia-east1`（台灣最快）→ 啟用

---

## 五、設定 Firestore 安全規則

進入 Firestore → 點「**規則**」分頁，把內容全部換成：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

點「**發布**」。

> 這是「登入才能讀寫」的規則，適合私人使用。

---

## 六、取得 Firebase 設定，填入 App

1. Firebase 控制台 → 點左上角 **⚙️ 設定** → 「專案設定」
2. 往下滾動到「您的應用程式」→ 點「**</>**」（Web 應用程式）
3. 輸入暱稱（如 `小堡`），不要勾選 Hosting，點「註冊應用程式」
4. 複製出現的設定值

5. 用 VS Code 開啟 `CoupleApp` 資料夾
6. 開啟 `services/firebase.ts`，把所有 `YOUR_...` 換成你的值：

```typescript
const firebaseConfig = {
  apiKey: "你的值",
  authDomain: "你的值",
  projectId: "你的值",
  storageBucket: "你的值",
  messagingSenderId: "你的值",
  appId: "你的值",
};
```

儲存（`Ctrl + S`）

---

## 七、設定 Cloudinary（照片儲存）

回憶相冊和大頭貼使用 Cloudinary 免費方案（25GB，無需信用卡）。

1. 前往 **https://cloudinary.com** → Sign Up（免費）
2. 登入後進入 **Settings → Upload → Upload presets**
3. 點「Add upload preset」
   - Mode 選 **Unsigned**
   - 記下 **Preset name**（例如 `lovepy`）
4. 頁面上方有你的 **Cloud name**（例如 `dtcni8tw0`）

5. 開啟 `services/cloudinaryService.ts`，填入你的值：

```typescript
const CLOUD_NAME = '你的 Cloud Name';
const UPLOAD_PRESET = '你的 Preset Name';
```

---

## 八、部署到 Vercel

> 部署後 iPhone/Android 用瀏覽器開連結，加到主畫面即可使用，不需 App Store。

### 建立 Vercel 帳號

前往 **https://vercel.com** → Sign Up → 用 Email 建立帳號

### 登入並部署

```bash
cd "C:\Users\a0311\OneDrive\桌面\小堡\CoupleApp"
vercel login    # 第一次需要登入
vercel          # 第一次部署（回答問題全部按 Enter）
```

完成後會顯示網址（如 `https://xiaobu.vercel.app`）。

### 之後更新

每次修改程式碼後：

```bash
vercel --prod
```

---

## 九、本機開發測試

```bash
cd "C:\Users\a0311\OneDrive\桌面\小堡\CoupleApp"
npm run dev
```

瀏覽器自動開啟，即時預覽。

---

## 十、常見問題

### App 顯示空白 / 行為異常

1. 確認 `services/firebase.ts` 的 6 個設定值都已填入
2. 確認 Firebase Auth 和 Firestore 都已啟用
3. 確認 Firestore 規則已發布（第五步）

---

### 照片上傳失敗

確認 `services/cloudinaryService.ts` 的 `CLOUD_NAME` 和 `UPLOAD_PRESET` 填正確，且 Preset 的 Mode 是 **Unsigned**。

---

### 配對碼輸入後顯示「邀請碼無效」

1. 確認輸入的是 6 碼英文大寫（App 會自動轉換）
2. 確認對方帳號已完成建立
3. 確認對方還沒配對過其他人

---

### iPhone 加入主畫面後仍顯示網址列

需要重新安裝：先移除主畫面圖示，再用 **Safari**（不是 Chrome）重新操作「加入主畫面」。

---

### Android 沒有出現「安裝」橫幅

1. 確認已部署到 Vercel（需要 HTTPS）
2. 確認 `public/icon-192.png` 和 `public/icon-512.png` 存在
3. 用 Chrome 開啟，等幾秒應出現橫幅；或點 Chrome 選單 → 「安裝應用程式」

---

## 第一次使用流程

1. 用手機 / 電腦開啟 Vercel 網址
2. 點「立即註冊」，輸入名字、Email、密碼
3. 進入配對畫面，記下你的邀請碼
4. 傳邀請碼給對方，對方同樣開啟網址、註冊，輸入你的邀請碼完成配對
5. 兩人都進入主畫面 🎉

---

## App 圖示設定

把你的圖片放到 `public/` 資料夾：

| 檔名 | 尺寸 | 用途 |
|------|------|------|
| `icon-192.png` | 192×192 | Android PWA 圖示 |
| `icon-512.png` | 512×512 | Android PWA 大圖示 |
| `apple-touch-icon.png` | 180×180 | iPhone 主畫面圖示 |

---

*祝你們的小堡順利建成！💕*

---

## 日常更新與部署

Vercel 已經連好 GitHub，所以 **`git push` 上去就會自動部署**。改完程式後，在 `CoupleApp` 資料夾執行：

```bash
# 1. 本機預覽（開發時邊改邊看）
npm run dev

# 2. 型別檢查（推上去前確認沒改壞）
npx tsc --noEmit

# 3. 推上 GitHub → Vercel 自動部署
git add -A
git commit -m "更新說明（簡述這次改了什麼）"
git push
```

**注意事項**
- 網址永遠不變，手機上加到主畫面的 PWA 會自動更新內容，不用重新下載。
- 新增圖鑑 3D 模型：把 `.glb` 放進 `public/models/`，在 `services/collectionService.ts` 的 `COLLECTIBLES` 加一筆設好 `model` 路徑，再 `git push`。
- `services/firebase.ts`、`services/cloudinaryService.ts` 含金鑰、已設為不上傳 GitHub（本機保留、照常部署）。