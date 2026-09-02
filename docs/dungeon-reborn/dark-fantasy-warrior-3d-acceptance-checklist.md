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

- [ ] `final/warrior.glb` 存在，且為標準、未特殊壓縮、mandatory accessor 可完整數值檢查的 inspection master。
- [ ] `final/warrior_web.glb` 存在，記錄實際 Mesh／貼圖壓縮方式，並附本案 Three.js 版本成功解碼的 Runtime 證據。
- [ ] `source/warrior.blend`、`source/warrior.ma` 或 `source/warrior.mb` 至少一個存在，且可在申報版本的 DCC 開啟。
- [ ] `source/reference/` 包含實際使用或約定交付的參考資料；若無，技術報告已明列 `N/A`。
- [ ] `textures/source/` 包含原始獨立 PBR 貼圖。
- [ ] `textures/exported/` 包含 GLB／Web 使用的輸出貼圖；若全部嵌入 GLB，技術報告已明列 `N/A`。
- [ ] `previews/turntable.mp4` 存在。
- [ ] `previews/animations.mp4` 存在。
- [ ] `previews/isometric_camera_test.mp4` 存在。
- [ ] `docs/bones_sockets.md` 已填妥。
- [ ] `docs/animation_events.json` 已將 `_meta.status` 改為 `delivery`，保留 `schemaVersion: 1`、`timeUnit: seconds`，將待填值替換為實際數據且 JSON 語法有效。
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
- [ ] `Root` 為 `Warrior_Root` 直接子節點，`Hips` 為 `Root` 直接子節點。
- [ ] `Warrior_Root`、Skinned Mesh 節點與全域 Transform carrier 沒有隱藏動畫 Transform；以非退化可見三角形表面積加權後，影響 ≥ 99% 全部可見蒙皮表面或 ≥ 99% 可見人體蒙皮表面的 Joint 均已納入檢查。

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

- [ ] 披風至少包含完全一致命名的 `Cape_01`、`Cape_02`、`Cape_03`、`Cape_04`。
- [ ] 若披風骨骼多於 4 根，名稱不超過 `Cape_08`，並完整記錄。
- [ ] 必要 Socket `WeaponSocket_R` 存在、命名正確且掛載結果正確。
- [ ] `WeaponSocket_R` 位於 `Hand_R` 子樹。
- [ ] 建議節點 `Sword_Base` 存在且位置正確，或已說明未採用原因。
- [ ] 建議節點 `Sword_Tip` 存在且位置正確，或已說明未採用原因。
- [ ] 建議節點 `VFX_Chest`、`VFX_Hand_R`、`VFX_Foot_L`、`VFX_Foot_R` 存在且位置正確，或已說明未採用原因。
- [ ] `bones_sockets.md` 記錄所有相關節點的父節點與局部 Transform。

備註／證據：`[待填]`

## D. Greatsword

- [ ] Greatsword 為獨立物件。
- [ ] Greatsword Mesh 節點位於 `WeaponSocket_R` 子樹，並非只有空 Socket。
- [ ] Greatsword 與身體／披風不共用同一 Mesh definition。
- [ ] Greatsword 不受角色 Skin Weight 影響。
- [ ] Greatsword Mesh 的 Bind Pose 世界 Transform 可逆且非奇異，`WeaponSocket_R` 至 Mesh 的祖先沒有零縮放／退化矩陣。
- [ ] 所有 Clip 中 `WeaponSocket_R`／Greatsword 子樹的 Scale 維持 Bind 值。
- [ ] 武器子樹 translation 經完整祖先 Transform 合成後，相對同時間「武器 translation 還原 Bind 值」的世界空間影響未超過 50 cm；超過 10 cm 的警告均已記錄並人工確認不會移出鏡頭，正常手臂動作未被誤算。
- [ ] `Sword_Base`／`Sword_Tip`（若採用）位於武器子樹、跟隨武器且可定義有效劍刃區段。
- [ ] 大劍在 `Attack1`、`Attack2`、`Attack3` 的固定遊戲鏡頭中均可辨識。

備註／證據：`[待填]`

## E. 動畫 Clip 與烘焙

- [ ] `AnimationMixer` 可用正確大小寫取得下列 8 個必要 Clip，且每個名稱只出現一次：

```text
Idle, Run, Attack1, Attack2, Attack3, Dodge, Hit, Death
```

- [ ] 不存在以 `idle`、`Run.001`、`Attack_01`、`mixamo.com`、`Take 001` 等錯誤名稱替代必要 Clip 的情況。
- [ ] 額外 Clip（若有）已在技術報告申報，且不取代或重名 8 個必要 Clip。
- [ ] 所有 Clip 均有非空且唯一的名稱；每個必要 Clip 至少驅動一個實際人體 Skin Joint，而非只驅動披風、武器或 VFX。
- [ ] 每個非 `Idle` 必要 Clip 均讓至少 1% 以非退化可見三角形表面積加權的人體蒙皮，其直接受權重 Joint 在完整父子階層合成後仍產生至少 1° 世界姿勢旋轉或 1 cm 世界位移；不是空 Key、微小抖動、極低表面覆蓋或父子曲線互相抵銷的假動畫。
- [ ] `Attack1`～`Attack3` 依各自插值在正規化時間軸重採樣後，實際人體姿勢仍互不相同；差異不是只來自 Key 數／時間、四元數正負號、VFX 或空節點。
- [ ] 動畫至少以 30 FPS 烘焙（建議項目），或技術報告已說明實際 FPS。
- [ ] 所有 Constraint、IK 與控制器已 Bake 到骨骼。
- [ ] GLB 不依賴 Blender／Maya 專屬控制器。
- [ ] `animation_events.json` 為每個 Clip 記錄總長度、循環設定、命中時間、可取消時間、武器軌跡起訖；不適用欄位明確為 `null`。
- [ ] 每個 Clip 均明列 10 個 Schema 欄位；`Attack1`～`Attack3` 各具有 hit window、cancel／combo window 與 weapon trail window。
- [ ] JSON 內各 Clip 的 `duration` 與 GLB Clip 實際長度一致。
- [ ] JSON 包含 GLB 內每個具名 Clip 且沒有 stale Clip；Duration 僅依 Animation Channel 實際引用的 Sampler 計算，未引用 Sampler 未被拿來延長時間。

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
- [ ] Root 超過 10 cm 水平／垂直或 10° 旋轉的硬性失敗線均未觸發。
- [ ] Hips 水平偏移 ≤ 50 cm、垂直偏移 ≤ 150 cm、Clip 首尾相對 Bind Pose 偏移 ≤ 50 cm；超過建議線的項目均已說明。
- [ ] Root／Hips 沒有動畫縮放。
- [ ] Root＋Hips 合成水平位移 ≤ 10 cm，沒有把同一段 Root Motion 分拆到兩層規避門檻。
- [ ] 其他變形 Joint 的局部位移未超過 150 cm、相對 Bind 縮放差異未超過 50%；超過 50 cm／10% 的建議線均已說明。

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
- [ ] 所有正權重均位於 `JOINTS_0`／`WEIGHTS_0`，未使用 `JOINTS_1`／`WEIGHTS_1`。
- [ ] ≥ `0.0001` 的有效權重實際涵蓋軀幹、左右手臂、左右腿與披風骨骼群，不是以 epsilon 權重或全部頂點綁 `Root` 冒充。
- [ ] `Cape_01`～`Cape_04` 每一根都直接影響至少一個披風 Vertex，且權重 ≥ `0.0001`。
- [ ] Active Skin 的 inverse-bind matrices 數量正確、非奇異、為 affine，且與 Bind Pose 一致。
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

- [ ] Material Slots 數量包含未使用的 material definitions；GLB 內總數不超過 4。
- [ ] 角色本體與 Greatsword 均有非零面積且可見的 triangle；沒有以重複 index、零面積或材質確定完全丟棄／全透明的 Primitive 冒充有效幾何。
- [ ] GLB 不含 Morph Targets；所有角色變形由已申報的骨架／Skin 完成。

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
- [ ] 角色實際使用的材質至少一個引用可解析到實際 Image source 的 Emissive Texture；Emissive Factor × `KHR_materials_emissive_strength` 大於 0，且實際可見三角形會取樣到啟用色頻中的非黑 texel。
- [ ] 若 Emissive Texture 同時含黑色與非黑色 texel，已依實際 UV、`KHR_texture_transform` 與 Sampler wrap／filter 提供取樣證據；未以整張影像的 channel max 冒充裂紋可見。
- [ ] 所有 active PBR TextureInfo 均解析到存在且格式一致的 Image source，沒有空 Texture definition。
- [ ] GLB 影像僅使用約定的 PNG，或在 Web 版使用 KTX2；沒有以 JPEG／WebP 取代。
- [ ] 若 Web 版使用 ORM Packed Map／KTX2，仍保留全部原始獨立 PNG。
- [ ] 若 active 材質使用混合 Alpha 值，已在目標 Three.js Runtime 依實際 UV、Sampler wrap／filter、材質 Factor 與 Alpha Cutoff 提供可見性證據；未以像素極值代替實際取樣驗證。

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
- [ ] `warrior.glb` 作為 inspection master，未使用 Draco／Meshopt／KTX2 等部署壓縮，且 mandatory accessor 均已完整數值檢查。
- [ ] `warrior_web.glb` 的 Meshopt／Draco／KTX2（若有）已由本案指定 Three.js 版本及實際 Decoder／Transcoder 成功解碼，而非只檢查 extension 宣告；證據不足時結果標為 `INCOMPLETE`。
- [ ] `extensionsRequired` 僅含本案 Runtime 已支援、已配置並在技術報告申報的 extension。
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

