# Dark Fantasy Warrior 最終驗收清單

> 專案：Dark Fantasy Warrior  
> 交付版本／批次：`[待填]`  
> 交付日期：`[YYYY-MM-DD]`  
> 承製方：`[待填]`  
> 驗收方：`[待填]`  
> 驗收環境：`[DCC／OS／瀏覽器／裝置與版本]`

## 驗收結果標記

- `[ ]` 尚未檢查
- `[x]` 通過
- `[!]` 未通過；須在備註記錄問題與修正批次
- `[N/A]` 不適用；須說明原因

## A. 檔案與交付結構

- [ ] `final/warrior.glb` 存在，且為標準、未特殊壓縮版本（建議項目）。
- [ ] `final/warrior_web.glb` 存在，並記錄實際 Mesh／貼圖壓縮方式。
- [ ] 可編輯 DCC 來源檔存在，且可在申報版本的 Blender 或 Maya 開啟。
- [ ] `source/reference/` 包含實際使用或約定交付的參考資料。
- [ ] `textures/source/` 包含原始獨立 PBR 貼圖。
- [ ] `textures/exported/` 包含 GLB／Web 使用的輸出貼圖。
- [ ] `previews/turntable.mp4` 存在。
- [ ] `previews/animations.mp4` 存在。
- [ ] `previews/isometric_camera_test.mp4` 存在。
- [ ] `docs/bones_sockets.md` 已填妥。
- [ ] `docs/animation_events.json` 已將待填值替換為實際數據，且 JSON 語法有效。
- [ ] `docs/technical_report.md` 已填妥。
- [ ] `license/commercial_rights.txt` 已填妥並由雙方確認。

備註／證據：`[待填]`

## B. 座標與 Transform

- [ ] Up Axis 為 Y-up。
- [ ] 角色正面朝 +Z。
- [ ] `Warrior_Root` Position 為 `0, 0, 0`。
- [ ] `Warrior_Root` Rotation 為 `0, 0, 0`。
- [ ] `Warrior_Root` Scale 為 `1, 1, 1`。
- [ ] 雙腳中央位於世界原點。
- [ ] 腳底最低點位於 `Y = 0`。
- [ ] GLB 外層不存在用於隱藏修正的額外旋轉、縮放或空物件。

量測工具與結果：`[待填]`

## C. 骨架與 Socket

- [ ] 下列基本骨骼均可對應，且對應表完整：

```text
Root, Hips, Spine_01, Spine_02, Chest, Neck, Head,
Clavicle_L, UpperArm_L, LowerArm_L, Hand_L,
Clavicle_R, UpperArm_R, LowerArm_R, Hand_R,
UpperLeg_L, LowerLeg_L, Foot_L, Toe_L,
UpperLeg_R, LowerLeg_R, Foot_R, Toe_R
```

- [ ] 披風至少包含 `Cape_01`、`Cape_02`、`Cape_03`、`Cape_04`。
- [ ] 若披風骨骼多於 4 根，名稱不超過 `Cape_08`，並完整記錄。
- [ ] 必要 Socket `WeaponSocket_R` 存在、命名正確且掛載結果正確。
- [ ] 建議節點 `Sword_Base` 存在且位置正確，或已說明未採用原因。
- [ ] 建議節點 `Sword_Tip` 存在且位置正確，或已說明未採用原因。
- [ ] 建議節點 `VFX_Chest`、`VFX_Hand_R`、`VFX_Foot_L`、`VFX_Foot_R` 存在且位置正確，或已說明未採用原因。
- [ ] `bones_sockets.md` 記錄所有相關節點的父節點與局部 Transform。

備註／證據：`[待填]`

## D. Greatsword

- [ ] Greatsword 為獨立物件。
- [ ] Greatsword 可由 `WeaponSocket_R` 正確掛載或定位。
- [ ] Greatsword 不受角色 Skin Weight 影響。
- [ ] `Sword_Base`／`Sword_Tip`（若採用）跟隨武器且可定義有效劍刃區段。
- [ ] 大劍在 `Attack1`、`Attack2`、`Attack3` 的固定遊戲鏡頭中均可辨識。

備註／證據：`[待填]`

## E. 動畫 Clip 與烘焙

- [ ] `AnimationMixer` 可取得且只以正確大小寫辨識下列 8 個必要 Clip：

```text
Idle, Run, Attack1, Attack2, Attack3, Dodge, Hit, Death
```

- [ ] 不存在以 `idle`、`Run.001`、`Attack_01`、`mixamo.com`、`Take 001` 等錯誤名稱替代必要 Clip 的情況。
- [ ] 動畫至少以 30 FPS 烘焙（建議項目），或技術報告已說明實際 FPS。
- [ ] 所有 Constraint、IK 與控制器已 Bake 到骨骼。
- [ ] GLB 不依賴 Blender／Maya 專屬控制器。
- [ ] `animation_events.json` 為每個 Clip 記錄總長度、循環設定、命中時間、可取消時間、武器軌跡起訖；不適用欄位明確為 `null`。
- [ ] JSON 內各 Clip 的 `duration` 與 GLB Clip 實際長度一致。

Clip 清單／工具輸出：`[待填]`

## F. In-place 與切換

逐一檢查 `Idle`、`Run`、`Attack1`、`Attack2`、`Attack3`、`Dodge`、`Hit`、`Death`：

- [ ] Root X／Z 位移保持接近 0。
- [ ] Root 不持續旋轉。
- [ ] Hips 上下起伏與動作旋轉合理。
- [ ] `Dodge` 僅呈現動作表演，世界位移可由程式控制。
- [ ] `Death` 不使角色原點突然偏離數公尺。
- [ ] Clip 切換時不跳高、不縮放、不瞬間轉向。
- [ ] 各 Clip 水平漂移在建議的 2 公分內，或技術報告已記錄偏差。

| Clip | Max Root ΔX | Max Root ΔZ | 水平漂移 | Root 持續旋轉 | 結果／備註 |
|---|---:|---:|---:|---|---|
| Idle | `[待填]` | `[待填]` | `[待填]` | `[是／否]` | `[待填]` |
| Run | `[待填]` | `[待填]` | `[待填]` | `[是／否]` | `[待填]` |
| Attack1 | `[待填]` | `[待填]` | `[待填]` | `[是／否]` | `[待填]` |
| Attack2 | `[待填]` | `[待填]` | `[待填]` | `[是／否]` | `[待填]` |
| Attack3 | `[待填]` | `[待填]` | `[待填]` | `[是／否]` | `[待填]` |
| Dodge | `[待填]` | `[待填]` | `[待填]` | `[是／否]` | `[待填]` |
| Hit | `[待填]` | `[待填]` | `[待填]` | `[是／否]` | `[待填]` |
| Death | `[待填]` | `[待填]` | `[待填]` | `[是／否]` | `[待填]` |

## G. Skin Weight 與變形

- [ ] 每個 Vertex 最多 4 個 Bone Influences。
- [ ] 權重已正規化。
- [ ] 肩甲無嚴重塌陷。
- [ ] 胯甲無嚴重塌陷。
- [ ] 手肘、膝蓋與手腕無嚴重塌陷。
- [ ] 披風與身體在 8 個 Clip 中無大範圍穿模。
- [ ] `Attack1`、`Attack2`、`Attack3` 已從固定 3/4 鏡頭檢查輪廓。

備註／證據：`[待填]`

## H. Mesh、材質與 Draw Calls

| 指標 | 目標 | 實測 | 結果／說明 |
|---|---:|---:|---|
| 角色本體 | 30k～50k triangles | `[待填]` | `[待填]` |
| Greatsword | 5k～10k triangles | `[待填]` | `[待填]` |
| 總計 | ≤ 60k triangles | `[待填]` | `[待填]` |
| Material Slots | 建議 3，最多 4 | `[待填]` | `[待填]` |
| Max Bone Influences | ≤ 4／vertex | `[待填]` | `[待填]` |
| 主貼圖 | 2048 × 2048 | `[待填]` | `[待填]` |
| 角色＋武器 Draw Calls | 建議 ≤ 6 | `[待填]` | `[待填]` |

- [ ] 材質分配採 `MAT_ArmorBody`、`MAT_Cape`、`MAT_Greatsword`，或已記錄實際命名與偏差。
- [ ] 破損披風邊緣若使用透明，採 Alpha Mask／Alpha Clip。
- [ ] 盡量未使用 Alpha Blend；若使用，已記錄必要性與 iPhone 測試結果。

## I. PBR 貼圖

- [ ] 下列 Warrior 原始獨立貼圖全部存在：

```text
Warrior_BaseColor.png
Warrior_Normal.png
Warrior_Metallic.png
Warrior_Roughness.png
Warrior_Emissive.png
Warrior_AO.png
```

- [ ] 下列 Greatsword 原始獨立貼圖全部存在：

```text
Greatsword_BaseColor.png
Greatsword_Normal.png
Greatsword_Metallic.png
Greatsword_Roughness.png
Greatsword_Emissive.png
Greatsword_AO.png
```

- [ ] Base Color 使用 sRGB。
- [ ] Emissive 使用 sRGB。
- [ ] Normal、Metallic、Roughness、AO 使用 Linear。
- [ ] 紅色能量裂紋主要存在於 Emissive Map，而非只畫在 Base Color。
- [ ] 若 Web 版使用 ORM Packed Map／KTX2，仍保留全部原始獨立貼圖。

備註／證據：`[待填]`

## J. 固定遊戲鏡頭視覺驗收

測試條件：固定 3/4 斜俯視，角色在手機畫面約 180～260 px 高。

- [ ] 黑甲輪廓不糊成黑塊。
- [ ] 紅色裂紋清楚，Bloom 不爆白。
- [ ] 大劍在每個攻擊動作中均可辨識。
- [ ] 披風動態不遮住整個人物。
- [ ] `Attack1`、`Attack2`、`Attack3` 第一眼可辨識為不同動作。
- [ ] `isometric_camera_test.mp4` 真實反映上述測試條件。

測試畫面尺寸／角色像素高度／Bloom 設定：`[待填]`

## K. GLB 與平台驗收

- [ ] Three.js `GLTFLoader` 可直接載入 `warrior.glb`。
- [ ] Three.js `GLTFLoader` 可直接載入 `warrior_web.glb`。
- [ ] Three.js `AnimationMixer` 可取得全部 8 個必要 Clip。
- [ ] `warrior.glb` 通過 glTF Validator，Error 數為 0。
- [ ] `warrior_web.glb` 通過 glTF Validator，Error 數為 0。
- [ ] Chrome 無材質全黑、骨架錯位或動畫失效。
- [ ] Safari 無材質全黑、骨架錯位或動畫失效。
- [ ] iPhone WebGL 實機無材質全黑、骨架錯位或動畫失效。

| 測試平台 | OS／版本 | 瀏覽器／版本 | 裝置／GPU | 結果 | 證據／備註 |
|---|---|---|---|---|---|
| Chrome | `[待填]` | `[待填]` | `[待填]` | `[待填]` | `[待填]` |
| Safari | `[待填]` | `[待填]` | `[待填]` | `[待填]` | `[待填]` |
| iPhone WebGL | `[待填]` | `[待填]` | `[待填]` | `[待填]` | `[待填]` |

glTF Validator 報告位置：`[待填]`

## L. 商業權利與來源

- [ ] 永久商業使用權已明確授予。
- [ ] 全球使用權已明確授予。
- [ ] 修改模型、貼圖、骨架與動畫的權利已明確授予。
- [ ] 遊戲、網站、App、影片、廣告與宣傳素材的使用權已明確授予。
- [ ] 可將資產包含於編譯、封裝或加密後的遊戲產品中。
- [ ] 未包含任何未申報的第三方模型、貼圖、動畫或生成素材。
- [ ] 所有第三方素材（若有）均附來源與商業授權證明。
- [ ] 原作者不得於交付後撤回遊戲使用權。
- [ ] 獨家買斷／非獨家授權已明確勾選。
- [ ] 雙方資料、標的、日期、報酬與簽署欄位完整。

第三方素材附件位置：`[無／待填]`

## M. 驗收結論

- [ ] 全部強制項目通過，正式驗收。
- [ ] 有條件通過，條件與期限如下。
- [ ] 未通過，退回修正。

待修項目、責任方與期限：

```text
[待填]
```

驗收方簽署：`[待填]`  
日期：`[YYYY-MM-DD]`

