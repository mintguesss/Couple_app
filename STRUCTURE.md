# 專案結構

## 目錄總覽

```
CoupleApp/
├── app/                     # Expo Router 路由（檔案即頁面）
│   ├── (auth)/              # 登入、註冊、配對流程
│   ├── (tabs)/              # 主分頁：首頁 / 行事曆 / 健康 / 聊天 / 更多
│   ├── collection/          # 圖鑑收藏頁
│   ├── games/               # 情侶遊戲（選選看 / 問答 / 五子棋；圍棋在元件）
│   ├── memory/              # 回憶相冊
│   ├── mood/                # 心情日記
│   ├── period/              # 月經追蹤
│   ├── records/             # 健康紀錄（喝水 / 飲食 / 排便）
│   ├── tasks/               # 共同任務
│   └── _layout.tsx          # 根佈局、登入路由守衛、PWA meta 注入
├── components/              # 可重用元件（見下表）
├── context/                 # AuthContext、CoupleContext（全域狀態）
├── hooks/                   # use-weekly-collection、use-poop-notification 等
├── services/               # Firebase / Firestore 存取層（每個功能一支）
├── public/                  # PWA 靜態資源
│   ├── manifest.json        # PWA manifest（standalone）
│   ├── sw.js                # Service Worker
│   └── models/<id>.glb      # 圖鑑 3D 模型
└── app.json                # Expo 設定（web static、PWA、圖示）
```

## 主要自訂元件

| 元件 | 用途 |
|------|------|
| `CollectibleReveal` | emoji 圖鑑的剪影逐漸顯現（CSS filter） |
| `CollectibleModel(.web)` | `.glb` 3D 圖鑑：剪影 / 可旋轉完整檢視（model-viewer，瀏覽器端動態載入） |
| `CollectibleLightbox` | 點圖鑑放大、自由旋轉縮放的燈箱 |
| `PinchZoom(.web)` | 棋盤雙指縮放／平移（原生 Pointer Events） |
| `ReviewBar` | 棋類復盤控制列（前後一手、跳頭尾、離開） |
| `WinModal` | 勝利彈窗（開新局 / 復盤） |
| `GoBoard13` | 圍棋棋盤與完整對局邏輯（提子、ko、目數） |
| `ImageCropModal` | 相片 / 大頭貼裁切（拖曳＋縮放） |

> `.web.tsx` 為網頁專屬實作，native 端只放安全 fallback（本專案實務上只部署網頁 PWA）。

---

## 功能逐項

### 📖 圖鑑收藏挑戰
- 雙方一起挑選本週想收集的圖鑑，達標收進收藏。
- 收集前只看得到黑色剪影，隨本週進度由暗轉亮（CSS `filter`，非透明度）。
- 3D 模型圖鑑：收集前剪影、收集後可拖曳／自動旋轉，點擊放大成燈箱。
- 首頁「我們的收藏 🏆」置中輪播展示，左右切換、圓點指示。
- 每週一 04:00 重置（週一 0:00~3:59 仍算上一週）。

**進度與達標公式**
- 喝水：每人每天 5 杯 → 雙方一週 `5 × 7 × 2 = 70` 杯
- 拉屎：雙方一週 9 次
- 進度 = `(min(喝水/70,1) + min(拉屎/9,1)) / 2`，再加上拉屎超過 9 次每多一次 +5%（可補喝水不足），上限 100%
- 滿 100% 即達標，收進本週選定圖鑑

### 💗 健康追蹤
- **喝水**：長條圖、補登過去日期、修改、刪除
- **飲食**：早午晚餐／飲料／點心分類，補登、改日期、刪除
- **排便**：按月份統計，補登、改日期、刪除；「我的／對方的」分頁
- **月經**：一次設定擁有者；記錄出血量與疼痛；歷史可改可刪；加權平均預測下次來潮
- 補登過去紀錄會即時算進本週圖鑑進度（即時訂閱）

### 🗓 共享生活
- **行事曆**：TimeTree 風格彩色事件條、10+ 情侶節日自動顯示、生日／紀念日標記、6 種內建分類＋自訂顏色名稱
- **心情日記**：五種心情＋備註，雙方互看，首頁只顯示今天
- **回憶相冊**：Cloudinary 上傳、縮圖焦點裁切（所見即所得）、燈箱檢視
- **共同任務**：六分類篩選、指派給我／對方／一起
- **聊天**：即時訊息

### 🎮 情侶遊戲
| 遊戲 | 說明 |
|------|------|
| 🎭 選選看 | 各選 A/B 後對比，計算默契（14 天 × 5 題） |
| 🧠 益智問答 | 四選一、各自作答後對比計分（14 天 × 5 題） |
| ⚫ 五子棋 | 即時同步，五子連線獲勝，可選誰先下 |
| ⬜ 圍棋 | 9/13/19 路、真實提子、禁全同、棄手、Komi 6.5、悔棋、讓子、執色 |

棋類共同功能：雙指縮放棋盤（單指仍可落子）、對局結束後復盤逐手回放。

---

## Firestore 資料結構

```
users/{userId}
  - name, inviteCode, coupleId, avatarUrl, birthday

inviteCodes/{code}
  - userId

couples/{coupleId}
  - members[], createdAt, anniversaryDate
  - periodOwnerId, customEventCategories[]

couples/{coupleId}/
  ├── health/{userId_date}     ← 每日健康（水、餐、睡眠）
  ├── poop/{id}                ← 排便（recordedAt 可補登過去日期）
  ├── events/{id}              ← 行事曆行程
  ├── moods/{id}               ← 心情日記
  ├── memories/{id}            ← 回憶相冊
  ├── tasks/{id}               ← 共同任務
  ├── periods/{id}             ← 月經（含 days[]）
  ├── chat/{id}                ← 聊天訊息
  ├── collection/{weekId}      ← 圖鑑收藏（每週一筆）
  ├── weeklyTarget/{weekId}    ← 本週選定要收集的圖鑑
  ├── game/thisorthat          ← 選選看
  ├── game/trivia              ← 益智問答
  ├── game/gomoku              ← 五子棋（含 history[]、marks[] 復盤棋譜）
  └── game/go13                ← 圍棋（含 history[]、marks[] 復盤棋譜）
```

---

## 圖鑑模型怎麼加

1. 取得 `.glb`（單檔、含貼圖、建議 < 20MB）。
2. 改英文小寫檔名放進 `public/models/<id>.glb`。
3. 在 `services/collectionService.ts` 的 `COLLECTIBLES` 加一筆並設定 `model: '/models/<id>.glb'`。
4. 重新整理即出現（收集前剪影、收集後可旋轉）。

> 開發時可把 `TEST_COLLECTED_IDS` 暫填 id 強制當已收集來預覽完整 3D，測完清空成 `[]`。
