# Zia Personal OS

Zia 是一個本機優先、可安裝的個人中控台。它把任務、餐廳營運、旅行、投資、車輛、遊戲與筆記放進同一個響應式網頁應用程式。

## 已完成的功能

- 總覽：今日焦點、狀態卡、最近動態與快速新增任務
- 任務：新增、編輯、刪除、完成、期限、優先順序與分類篩選
- 餐廳：每日營運日報、來客與客單計算、例行檢查、庫存與低庫存提示
- 旅遊：多旅程、日期、狀態、預算、行程時間軸、預訂資訊與出發清單
- 投資：手動持股、平均成本、目前價格、市值與未實現損益
- 車庫：汽車與重機、里程、保養門檻、保險日期、保養紀錄與騎乘前檢查
- 遊戲：平台、狀態、進度、評分與遊玩筆記
- 筆記：標題、標籤、內容、搜尋與更新時間
- 系統：深淺主題、四色強調色、緊湊模式、全域搜尋、JSON 匯入與匯出
- PWA：可加入手機主畫面，支援已載入內容的離線開啟
- 部署：推送到 `main` 後由 GitHub Actions 建置並部署 GitHub Pages

## 資料模式

Zia 不需要帳號，也不會將個人資料傳到外部服務。資料儲存在目前瀏覽器的 `localStorage`，並透過 `BroadcastChannel` 在同一瀏覽器的分頁間同步。

請定期到「設定」匯出 JSON 備份。清除瀏覽器網站資料會一併刪除 Zia 的本機資料。

投資模組採手動價格模式，不會把過期或推測資料偽裝成即時行情。

## 本機啟動

需要 Node.js 22 或以上版本。

```bash
npm install
npm run dev
```

Vite 會顯示本機網址。手機與電腦在同一網路時，也可以使用：

```bash
npm run dev -- --host
```

## 檢查與建置

```bash
npm run check
npm run build
npm run preview
```

`npm run check` 會檢查必要檔案、JavaScript 語法與相對匯入路徑。正式輸出位於 `dist/`。

## GitHub Pages

專案的 Vite base 已設定為 `/Zia/`。部署工作流程位於：

```text
.github/workflows/deploy.yml
```

GitHub 儲存庫的 Pages 來源需設為 **GitHub Actions**。部署完成後，預期網址為：

```text
https://darkmatter0915-lab.github.io/Zia/
```

## 專案結構

```text
Zia/
├── .github/workflows/deploy.yml
├── docs/
│   ├── PRODUCT.md
│   └── ROADMAP.md
├── public/
│   ├── icons/zia-icon.svg
│   ├── manifest.webmanifest
│   └── sw.js
├── scripts/check.mjs
├── src/
│   ├── app.js
│   ├── data.js
│   ├── forms.js
│   ├── main.js
│   ├── store.js
│   ├── style.css
│   ├── utils.js
│   └── views.js
├── index.html
├── package.json
└── vite.config.js
```

## 技術選擇

- 原生 JavaScript ES Modules
- Vite 7
- 無前端框架與執行期依賴
- Local-first persistence
- Responsive PWA
- GitHub Actions + GitHub Pages

這個結構刻意保持輕量，之後可以逐步接入登入、雲端同步、通知或外部 API，而不必先背上一整台技術卡車。
