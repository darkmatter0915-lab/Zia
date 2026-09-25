# Rift Forge 0.5.0

本輪提升戰鬥辨識與手機操作，沿用既有角色圖集。

- 新增鑄造所地板美術，角色／怪物顯示尺寸提高約 8–16%，加強命中閃光、受擊後仰、反彈光環、目標標記與彈核尾跡。
- 新使用者預設方向鍵；點按產生短距離移動，長按持續移動，保留已存的滑桿偏好。點按輸入由遊戲幀消耗，避免短按落在兩幀之間。
- 同一橫直方向中的視窗高度變化不再清掉按住的方向；真正轉向／暫停仍會清除輸入。
- 增加閃避冷卻與脈衝充能顯示，升級選單明確說明選取後繼續。
- 啟動腳本失敗可重新載入；裝飾性地板載入失敗仍可遊玩。這是啟動容錯改善，不表示已重現使用者先前手機上的進入失敗。

## 美術來源

使用內建圖像生成功能生成原創地板；轉成 WebP 後供 Canvas 使用，未使用外部遊戲素材。

遊戲使用路徑：`public/rift-forge/assets/foundry-floor-v05.webp`（1536 × 1024）。

最終生成提示：

Use case: stylized-concept. Asset type: actual playable 2D fantasy game arena floor texture, not a promotional illustration. Create an original hand-painted dark alchemical foundry floor, landscape 3:2. Strict orthographic directly overhead view, flat floor plane filling the entire image, no horizon and no perspective vanishing point. Large worn blue-black slate flagstones with restrained chipped edges and subtle cool teal patina; a broad very faint engraved alchemical brass circle in the middle, elegant concentric metal inlays and radial geometry. Restrained ember seams and burn marks near the far left and right edges only. Rich painterly materials with physically convincing wear; compatible with brass armored fantasy characters, muted dark teal and tarnished bronze palette. The central 75 percent must be quiet and dark with low contrast so moving monsters, projectiles and damage numbers are easy to read. Balanced soft ambient light, no bright center light. Floor surface only, absolutely no walls, borders, pillars, stairs, props, creatures, characters, interface, words, letters, numbers, logos or watermarks. Production quality game environment texture, full bleed.

## 驗證

以 `node --test public/rift-forge/tests/engine.test.cjs`、正式建置與 `playwright.rift.config.cjs` 的 Chromium／WebKit 測試驗證。新增短按、尺寸變更不中斷移動、觸控瞄準與閃避、啟動失敗恢復及装飾圖載入失敗案例。桌面 WebKit／觸控模擬不等於實體 iPhone 驗收。
