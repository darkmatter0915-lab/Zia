# 彈核熔爐 / Rift Forge

0.1 可玩研究版，2026-09-23。依公開玩法重新設計的獨立單人反彈 Roguelite，不是 BALL x PIT 原始碼或素材的復原。

## 執行與隔離

這個目錄新增於 public/rift-forge，由既有 Vite public 複製流程輸出到 dist/rift-forge。不更動 Zia 主介面、舊 ARPG、Warrior Asset Lab、既有 workflow 或 Vite 設定。網頁只依賴本目錄的 HTML、JavaScript 與 CSS，沒有外部 CDN。使用靜態 HTTP 伺服器開啟 index.html；部署成功時的相對入口為 /Zia/rift-forge/。入口存在於程式碼不等於已驗證線上部署。

規則測試：在這個目錄執行 `npm test`，或從 repo 根目錄執行 `node --test public/rift-forge/tests/engine.test.cjs`。無須安裝套件。package.json 的 CommonJS 邊界只用來讓獨立規則測試可在父專案 ESM 環境執行。

## 已實作

1 名角色、1 個原創向量場景、3 種小怪、1 個雙階段頭目、8 波敵襲。6 種基本球核及 3 組指定進化；四格配装；三選一升級；有限重抽；五種刻印；兩個波次間商店；結算傷害統計；三個有限等級的基地升級。

自動射擊及自動／手動瞄準。A/D 或左右方向鍵移動，Space 閃避，Q 脈衝，E 進化，Esc 暫停。手機左右按鈕移動，觸碰戰場瞄準。回收球可獲得脈衝能量。切換分頁自動暫停。合成音效可關閉。

只有指定配方進化，沒有任意兩球的通用融合；基地目前是升級面板，不是自由擺放經營地圖。所有數值及圖形均為本專案自訂，不代表原作內部規格。

## 研究重點

BALL x PIT：取反彈戰鬥、局內組合、局外成長的三層循環。Peglin：取瞄準與彈道路線的決策，沒有照搬回合制釘板。Brotato：取自動攻擊、可切手動瞄準與波次間補給。Vampire Survivors：取集中強化的成長感與跨局投資。Ballionaire：取可理解的觸發連鎖，不照搬經濟目標或佈置釘板。

參考遊戲的優點是本專案設計判斷，非人類玩家對照實驗結果。完整研究請參考隨交付原始碼套件附的 RESEARCH.zh-Hant.md。

## 驗證及限制

26 項 Node 規則測試通過。Chromium 1440×900、926×428 橫向觸控及 430×932 直向觸控三組流程測試通過，未觀察到 JavaScript 頁面錯誤。24 個固定策略、零基地加成種子依正常規則完整通關，並非在模擬中直接補血或強制擊殺。這不等於人類勝率、難度平衡、所有流派或樂趣已驗證。

瀏覽器測試環境限制網頁導航，採離線載入文件。存檔流程使用明確的記憶體測試介面，只驗證序列化及回讀，不能當作真實瀏覽器持久儲存證据。UI 分支測試會快速切到頭目，與正常规则模擬是不同測試。Safari/WebKit、iPhone 13 Pro Max 真機、發熱、音訊和穩定幀率尚未驗收。

存檔在獨立 rift-forge.v1. 本機前綴，沒有帳號或雲端。清除網站資料會失去進度，寫入失敗有提示。原作影片未完整取得，沒有逐格分析原作或拆解二進位。此為可玩研究版，不是商業完成版。

## 來源

- BALL x PIT 官方商品：https://store.steampowered.com/app/2062430/BALL_x_PIT/
- Peglin 官方商品：https://store.steampowered.com/app/1296610/Peglin/
- Brotato 官方商品：https://store.steampowered.com/app/1942280/Brotato/
- Vampire Survivors 官方商品：https://store.steampowered.com/app/1794680/Vampire_Survivors/
- Ballionaire 官方商品：https://store.steampowered.com/app/2667120/Ballionaire/

沒有搬用其他遊戲的角色、名稱、截圖、音效或程式碼。Canvas 場景、角色、敵人與特效由本專案的 render.js 繪製。
