# 小堡 💑 — 情侶專屬互動 App

> 一個為情侶打造、可安裝到手機的私人互動 PWA：把每天的喝水、紀念日、小遊戲都變成兩人一起經營的儀式。

<!-- 建議放一張首頁 / 圖鑑 / 棋盤的截圖或 GIF -->
<!-- ![demo](docs/demo.gif) -->

**🔗 Live Demo：** `<你的 Vercel 網址>`（手機開啟可「加入主畫面」全螢幕使用）

---

## ✨ 技術亮點

- **純網頁 PWA、免上架**：用 Expo Router 的 static export 輸出靜態網站部署到 Vercel，靠 Web App Manifest 的 `standalone` 模式＋ iOS 專屬 meta 標籤，做到「加到主畫面即全螢幕、像原生 App」。選這條路是因為使用者只有兩人、要能裝到手機，又不想付出 App Store／Play 雙平台上架審核與維護成本——改版只要推一次網站。

- **即時雙人同步**：兩支手機共享同一份雲端狀態，棋局落子、圖鑑進度、健康紀錄都用 Firestore `onSnapshot` 即時更新；下棋達標收藏這類「雙方可能同時觸發」的寫入，用 Firestore transaction 確保只成立一次，不自建後端或 WebSocket。

- **3D 圖鑑：model-viewer + CSS filter 剪影，並解掉 SSR 崩潰**：收集前用 CSS `filter: brightness/saturate` 把 `.glb` 模型壓成黑色剪影、隨週進度逐漸顯色，收集後可拖曳旋轉。改用 `@google/model-viewer` 而不自己寫 WebGL；但它載入時即 `class extends HTMLElement`，會在 Expo 靜態預渲染（Node）階段崩潰，因此改成**只在瀏覽器端動態 import**。

- **零依賴手勢縮放 ＋ 自製圍棋引擎**：棋盤的雙指縮放／平移用原生 Pointer Events 自己實作（且保留單指落子、捏合時自動鎖住避免誤點），不引入笨重手勢庫；圍棋的提子、禁同形（ko）、目數與領地計算、Komi 6.5 全部從零實作，並支援棋譜快照「復盤」逐手回放。

- **$0/月架構**：Firebase（Auth＋Firestore）＋ Cloudinary 圖床＋ Vercel 全用免費額度，私人規模長期零成本。

---

## 🛠 技術棧

| 項目 | 技術 |
| --- | --- |
| 前端框架 | React Native + Expo Router（web-only PWA） |
| 語言 | TypeScript（strict） |
| 後端 / 資料庫 | Firebase Auth + Firestore（即時訂閱） |
| 3D 模型 | @google/model-viewer（`.glb`） |
| 圖片儲存 | Cloudinary（免費圖床） |
| 部署 | Vercel（靜態輸出） |
| 安裝體驗 | PWA（manifest standalone + Service Worker） |

---

## 📦 功能總覽

**📖 圖鑑收藏挑戰（gamification 核心）**
把雙方每天的喝水、排便換算成每週進度；剪影隨進度顯色，達標解鎖圖鑑。部分圖鑑是可旋轉的 3D 模型，可點開放大檢視，首頁有收藏輪播展示。每週一 04:00 重置。

**💗 健康追蹤**
喝水、飲食（分早午晚餐／飲料／點心）、排便、月經週期；皆可補登過去日期、修改、刪除，並即時反映進圖鑑進度。月經支援加權平均預測下次來潮。

**🗓 共享生活**
TimeTree 風格行事曆（自動情侶節日＋自訂分類）、心情日記、Cloudinary 回憶相冊（可裁切焦點）、共同任務分類待辦、即時聊天。

**🎮 情侶遊戲（四款）**
選選看默契測驗、益智問答計分、五子棋、9/13/19 路圍棋（真實提子／棄手／讓子）。棋類對局結束後的**復盤逐手回放**。

> 詳細功能逐項說明見 [STRUCTURE.md](./STRUCTURE.md)。

---

## 🚀 快速開始

```bash
git clone <你的 repo 網址>
cd CoupleApp
npm install

# 複製設定範本並填入自己的金鑰
cp services/firebase.example.ts services/firebase.ts
cp services/cloudinaryService.example.ts services/cloudinaryService.ts

npm run dev        # 本機預覽
npx tsc --noEmit   # 型別檢查
vercel --prod      # 部署上線
```

---

## 📁 專案結構

詳見 [STRUCTURE.md](./STRUCTURE.md)

---

## ⚙️ 設定與部署

詳見 [SETUP_GUIDE.md](./SETUP_GUIDE.md)

---

*小堡 — 因為你們的每一天，都值得被好好記錄。*
