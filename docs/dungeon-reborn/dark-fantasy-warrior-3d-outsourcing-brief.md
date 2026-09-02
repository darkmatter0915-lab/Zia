# Dark Fantasy Warrior — Three.js Web ARPG 3D 外包製作 Brief

## 1. 文件目的

本文件定義 Dark Fantasy Warrior 角色資產的建模、材質、Rig、Skin Weight、動畫、GLB 匯出、效能與權利交付標準。資產須可由 Three.js `GLTFLoader` 直接載入，並可由 `AnimationMixer` 取得指定動畫 Clip，供固定 3/4 斜俯視、手機優先的 Web ARPG 使用。

本案整體方向包含：

- In-place 角色動畫
- 獨立 Greatsword
- Cape Bones
- 以 Emissive Map 呈現的紅色能量裂紋
- 符合手機 WebGL 使用情境的三角面、材質與 Draw Call 預算

建模、Rig、Skin Weight 與角色動畫由承製的 3D 美術／動畫團隊完成；程式端整合（固定鏡頭、`AnimationMixer`、移動、三連擊、Dodge、碰撞與手機操作）以通過本文件驗收的 `warrior.glb` 為前提。

## 2. 條款用語

- **必須／不可**：交付與驗收的強制條件。
- **建議／盡量／可**：目標做法或最佳實務；若未採用，應在技術報告說明實際做法與原因。
- 所有名稱均區分大小寫。`Warrior_Root`、`Cape_01`～`Cape_04`、`WeaponSocket_R`、8 個必要 Clip 與第 13 節的固定檔名必須完全一致；人體基本骨骼角色可採實際名稱對應，但必須在 `bones_sockets.md` 完整申報。建議輔助節點若交付，也應採本文名稱。

## 3. 座標系與 Transform

交付資產必須符合：

- Up Axis：Y-up。
- 角色正面：+Z。
- `Warrior_Root` Position：`0, 0, 0`。
- `Warrior_Root` Rotation：`0, 0, 0`。
- `Warrior_Root` Scale：`1, 1, 1`。
- 雙腳中央落在世界原點。
- 腳底最低點位於 `Y = 0`。
- 不可在 GLB 外層以額外旋轉、縮放或空物件隱藏座標修正。
- `Root` 必須為 `Warrior_Root` 的直接子節點，`Hips` 必須為 `Root` 的直接子節點；不得插入可攜帶全域位移的空物件、控制器或替代骨骼。
- `Warrior_Root`、Skinned Mesh 節點及控制整體蒙皮的共同祖先不可另帶動畫 Transform；任何 Joint 若以三角形表面積加權後影響至少 99% 全部可見蒙皮表面，或至少 99% 可見人體蒙皮表面，即視為全域 Transform carrier，其動畫仍按 Root 門檻驗收。可見表面僅計入非退化且未被材質確定完全丟棄／全透明的三角形。

## 4. 骨架規格

骨架至少必須能對應下列人體骨骼角色；實際名稱、父子關係與任何對應資訊須記錄於 `bones_sockets.md`。採用本文名稱最利於自動驗收；若 `Root`／`Hips` 改名，承製方還須提供人工 In-place 量測證據：

```text
Root
Hips
Spine_01
Spine_02
Chest
Neck
Head
Clavicle_L
UpperArm_L
LowerArm_L
Hand_L
Clavicle_R
UpperArm_R
LowerArm_R
Hand_R
UpperLeg_L
LowerLeg_L
Foot_L
Toe_L
UpperLeg_R
LowerLeg_R
Foot_R
Toe_R
```

披風骨骼必須至少包含且使用下列完全一致的名稱：

```text
Cape_01
Cape_02
Cape_03
Cape_04
```

可依造型增加至 `Cape_08`。

## 5. Socket 與輔助節點

至少必須包含：

```text
WeaponSocket_R
```

建議一併建立：

```text
Sword_Base
Sword_Tip
VFX_Chest
VFX_Hand_R
VFX_Foot_L
VFX_Foot_R
```

`WeaponSocket_R` 必須位於 `Hand_R` 子樹，使其隨右手動畫移動。Greatsword Mesh 必須是 `WeaponSocket_R` 的後代節點；若交付 `Sword_Base`／`Sword_Tip`，兩者也必須位於同一武器子樹。`Sword_Base` 與 `Sword_Tip` 用於 Three.js 計算劍刃軌跡、Hitbox 與武器殘影。所有 Socket／輔助節點的父節點、局部 Position、Rotation、Scale 與用途須記錄於 `bones_sockets.md`。

## 6. Greatsword

- Greatsword 必須為獨立 Mesh 物件並直接包含於 GLB，其節點須位於 `WeaponSocket_R` 子樹；不可只交付空 Socket 或依賴執行期外部補掛未交付的武器。
- Greatsword 不可受角色 Skin Weight 影響。
- Greatsword 不可與身體或披風共用同一 Mesh definition。
- Greatsword Mesh 的 Bind Pose 世界 Transform 必須可逆且不可奇異；`WeaponSocket_R` 至 Mesh 之間任一祖先不得以零縮放或退化矩陣隱藏問題。
- 動畫期間，`WeaponSocket_R`／Greatsword 子樹的 Scale 必須維持 Bind 值。武器子樹 translation 會以完整祖先 Transform 合成後的世界空間影響驗收：同一時間比較實際姿勢與「僅將武器子樹 translation 還原 Bind 值」的反事實姿勢，差異超過 10 cm 會列為警告，超過 50 cm 為硬性失敗；正常手臂揮劍動作因同時存在於兩者而不計入。
- 大劍在每個攻擊動作與固定遊戲鏡頭中必須保持可辨識。

## 7. 動畫 Clip

GLB 必須包含以下 8 個 Clip，名稱與大小寫必須完全一致：

```text
Idle
Run
Attack1
Attack2
Attack3
Dodge
Hit
Death
```

不可交付為例如：

```text
idle
Run.001
Attack_01
mixamo.com
Take 001
```

動畫建議至少以 30 FPS 烘焙。所有 Constraint、IK 與控制器必須 Bake 到骨骼；GLB 不可依賴 Blender 或 Maya 專屬控制器。

每個必要 Clip 至少須有一條作用於實際變形人體（非 Cape）的骨骼 Channel；不可只動畫武器、披風或 VFX 輔助節點。`Run`、`Attack1`～`Attack3`、`Dodge`、`Hit`、`Death` 必須讓至少 1% 以非退化可見三角形表面積加權的人體蒙皮，其直接受權重 Joint 在完整父子階層合成後仍產生至少 1° 世界姿勢旋轉或 1 cm 世界位移；父子反向曲線若在受權重 Joint 的世界姿勢互相抵銷，不得計為有效幅度。不可用全程相同的空 Key、極小抖動或只影響極少表面的骨骼冒充有效動畫。`Attack1`～`Attack3` 會依各自插值規則在正規化時間軸重採樣姿勢後比較；即使 Key 數、時間點或四元數正負號不同，若實際人體姿勢等效仍視為相同，不可只加不同 VFX／空節點曲線冒充差異。額外 Clip 可以保留，但必須具有非空且唯一的名稱，在 `technical_report.md` 申報，並於 `animation_events.json` 提供完整事件欄位；不得取代或重名上述 8 個 Clip。

## 8. In-place 動畫驗收

所有動畫期間必須符合：

- Root 的 X／Z 位移保持接近 0。
- Root 不可持續旋轉。
- 允許 Hips 上下起伏與執行動作所需旋轉。
- `Dodge` 可有明顯前傾或翻滾表演，但實際世界位移由程式控制。
- `Death` 不可導致整個角色原點突然偏離數公尺。
- Clip 切換時，角色不可跳高、縮放或瞬間轉向。

自動驗收門檻如下；超過硬性安全線須修正或由雙方書面變更規格：

- Root 水平／垂直漂移目標 ≤ 2 cm，超過 10 cm 為硬性失敗。
- Root 旋轉目標 ≤ 2°，超過 10° 為硬性失敗。
- Hips 相對 Bind Pose 的水平偏移超過 10 cm 警告、超過 50 cm 硬性失敗。
- Hips 垂直起伏超過 50 cm 警告、超過 150 cm 硬性失敗。
- Hips 在 Clip 首尾相對 Bind Pose 的三維偏移超過 10 cm 警告、超過 50 cm 硬性失敗。
- Root 或 Hips 動畫縮放偏離基準值為硬性失敗；Hips 動作旋轉仍可依表演需要使用。
- Root 與 Hips 的動畫平移會合成估算整體水平位移；合成水平位移超過 10 cm 為硬性失敗，不得將同一段 Root Motion 分拆到兩層以規避門檻。
- 其他實際變形 Joint 相對 Bind Pose 的局部位移超過 50 cm 警告、超過 150 cm 硬性失敗；縮放比例偏離 Bind 超過 10% 警告、超過 50% 硬性失敗。

各 Clip 的 Root ΔX／ΔZ、水平／垂直漂移、旋轉及 Hips 指標須記錄於 `technical_report.md`。

## 9. Skin Weight 與變形品質

- 每個 Vertex 最多 4 個 Bone Influences。
- 權重必須正規化。
- 所有正權重必須收斂於 `JOINTS_0`／`WEIGHTS_0`；不得使用 `JOINTS_1`／`WEIGHTS_1` 規避每頂點 4 influences 或 Three.js Loader 支援範圍。
- 非武器 Skin Weight 必須以至少 `0.0001` 的實際有效權重涵蓋軀幹、左右手臂、左右腿與披風骨骼群；不可用極小 epsilon 權重假裝覆蓋。
- `Cape_01`、`Cape_02`、`Cape_03`、`Cape_04` 每一根都必須直接影響至少一個披風 Vertex，且有效權重至少為 `0.0001`。
- Active Skin 的 inverse-bind matrices 必須可完整解碼、數量與 joints 一致、為非奇異 affine 矩陣，且與 Joint／Skinned Mesh 的 Bind Pose 一致。
- 肩甲、胯甲、手肘、膝蓋與手腕不可嚴重塌陷。
- Greatsword 不可受角色 Skin Weight 影響。
- 披風與身體須避免大範圍穿模。
- `Attack1`、`Attack2`、`Attack3` 必須以固定 3/4 鏡頭檢查輪廓。

## 10. Mesh、材質與效能預算

| 項目 | 上限或建議 |
|---|---:|
| 角色本體 | 30k～50k triangles |
| Greatsword | 5k～10k triangles |
| 總計 | 不超過 60k triangles |
| Material Slots | 建議 3，最多 4 |
| Bone Influences | 每頂點最多 4 |
| 主貼圖 | 2048 × 2048 |
| 透明材質 | 盡量不使用 Alpha Blend |
| Draw Calls | 角色加武器盡量不超過 6 |

Material Slots 上限以 GLB 內全部 material definitions 計算，包含未被 Primitive 使用的殘留材質；交付前須清除無用 Slot。

角色本體與 Greatsword 均必須具有實際非零面積且可見的 triangle geometry；重複 index、零面積三角形或由材質確定完全丟棄／全透明的 Primitive 不得用來灌高預算數字或代替有效 Mesh。GLB 不得包含 Morph Targets；本案表情與動作變形一律以已申報的骨架／Skin 完成，避免未納入驗收與手機預算的額外變形資料。

推薦材質分配：

```text
MAT_ArmorBody
MAT_Cape
MAT_Greatsword
```

破損披風邊緣可使用 Alpha Mask／Alpha Clip；應避免半透明 Alpha Blend，以降低 iPhone 上的排序與效能風險。

## 11. PBR 貼圖交付

原始貼圖必須獨立交付：

```text
Warrior_BaseColor.png
Warrior_Normal.png
Warrior_Metallic.png
Warrior_Roughness.png
Warrior_Emissive.png
Warrior_AO.png
Greatsword_BaseColor.png
Greatsword_Normal.png
Greatsword_Metallic.png
Greatsword_Roughness.png
Greatsword_Emissive.png
Greatsword_AO.png
```

色彩空間：

| 貼圖 | 色彩空間 |
|---|---|
| Base Color | sRGB |
| Emissive | sRGB |
| Normal | Linear |
| Metallic | Linear |
| Roughness | Linear |
| AO | Linear |

- 紅色能量裂紋必須主要存在於 Emissive Map，不可只畫死在 Base Color。`Warrior_Root` 實際渲染到的材質至少一個必須引用能解析到實際 Image source 的 Emissive Texture，且 Emissive Factor 與 `KHR_materials_emissive_strength`（若使用）相乘後必須大於 0。空 Texture definition、全黑貼圖或 `emissiveStrength: 0` 均不合格；若貼圖同時含黑色與非黑色 texel，必須依實際 UV、`KHR_texture_transform` 與 Sampler wrap／filter 證明可見三角形會取樣到啟用色頻中的非黑 texel，不能只以整張影像的 channel max 代替。未提供時維持 `INCOMPLETE`；裂紋造型與實際亮度仍以固定鏡頭人工驗收。
- 所有 active material 已引用的 BaseColor、MetallicRoughness、Normal、AO、Emissive 與材質 extension Texture 均必須解析到存在且格式一致的 Image source；不可留下空 Texture definition。
- 本案 GLB 影像格式限定為標準版 PNG、Web 部署版 PNG 或 KTX2；不接受 JPEG／WebP 取代約定貼圖。Web 最終版本可轉換成 ORM Packed Map 與 KTX2；原始交付仍須保留上述獨立 PNG。
- 含混合透明度的 Alpha Mask／Alpha Blend 貼圖無法只靠像素極值證明實際表面可見；承製方必須在目標 Three.js Runtime 依實際 UV、Sampler wrap／filter、材質 Factor 與 Alpha Cutoff 提供畫面或量測證據。未提供時該項維持 `INCOMPLETE`，不視為自動通過。

## 12. 動畫事件資料

每段動畫須於 `animation_events.json` 提供：

- Clip 名稱
- 總長度
- 循環設定
- 主要命中時間
- 可取消時間
- 武器軌跡起始與結束時間

正式檔案採 Schema v1，時間單位固定為秒。`_meta.status` 在製作範本中為 `template`，正式交付必須改為 `delivery`。每個 Clip 都必須明列下列欄位；不適用的事件須填 `null`，不可省略：

```text
duration, loop,
hitStart, hitEnd,
cancelOpen, cancelClose,
comboOpen, comboClose,
weaponTrailStart, weaponTrailEnd
```

`Attack1`～`Attack3` 必須具有 `hitStart`／`hitEnd`、至少一組 cancel 或 combo window，以及 `weaponTrailStart`／`weaponTrailEnd`。所有非 `null` 時間須位於 `0..duration` 且起點不得晚於終點。Duration 只以 Animation Channel 實際引用的 Sampler 計算，未引用 Sampler 不得延長事件時間。JSON 不可缺少任何 GLB 內具名 Clip，也不可保留 GLB 已不存在的 stale Clip。Canonical 範本位於 `DarkFantasyWarrior/docs/animation_events.json`。

原始規格提供的 Attack1 時間已擴充為完整 Schema 示例如下；數值僅代表示例，正式交付須填入實際動畫量測結果：

```json
{
  "_meta": {
    "schemaVersion": 1,
    "timeUnit": "seconds",
    "status": "delivery"
  },
  "Attack1": {
    "duration": 0.62,
    "loop": false,
    "hitStart": 0.22,
    "hitEnd": 0.36,
    "cancelOpen": null,
    "cancelClose": null,
    "comboOpen": 0.38,
    "comboClose": 0.56,
    "weaponTrailStart": 0.18,
    "weaponTrailEnd": 0.38
  }
}
```

遊戲事件不以 GLB 能否保存為唯一依據；獨立 `animation_events.json` 為正式交付資料。

## 13. 交付內容與目錄

```text
DarkFantasyWarrior/
├─ final/
│  ├─ warrior.glb
│  └─ warrior_web.glb
├─ source/
│  ├─ warrior.blend（或 warrior.ma／warrior.mb）
│  └─ reference/
├─ textures/
│  ├─ source/
│  └─ exported/
├─ previews/
│  ├─ turntable.mp4
│  ├─ animations.mp4
│  └─ isometric_camera_test.mp4
├─ docs/
│  ├─ bones_sockets.md
│  ├─ animation_events.json
│  └─ technical_report.md
└─ license/
   └─ commercial_rights.txt
```

- `final/warrior.glb` 與 `final/warrior_web.glb` 均為正式必交檔案。
- `warrior.glb` 必須保留標準、未特殊壓縮且可完整數值檢查的 inspection master，作為 Skin Weight、Root Motion、材質與相容性主驗收檔；此項為強制條件，不是部署建議。
- `warrior.glb` 的 mandatory geometry、weight、inverse-bind 與 animation accessor 必須全數可解碼；不得以過大、未知或壓縮 accessor 將硬性檢查降級。
- `warrior_web.glb` 為手機部署版，可採用 Meshopt／Draco 與 KTX2；實際壓縮、glTF extensions 與 Decoder／Transcoder 需求須申報。壓縮資料須在本案 Three.js 版本實際解碼並附 Runtime 證據，未實際解碼前不視為完整驗收。
- DCC 可編輯來源檔必須命名為 `warrior.blend`、`warrior.ma` 或 `warrior.mb` 其中之一，並在技術報告記錄軟體與版本。
- `source/reference/` 若沒有第三方或委託方參考檔，可在技術報告明列 `N/A`；第三方素材授權證明不得以 `N/A` 規避。
- `textures/exported/` 若最終貼圖全部嵌入 GLB，可在技術報告明列 `N/A`；`textures/source/` 的 12 張獨立原始 PNG 仍為必交。

## 14. 商業權利

`commercial_rights.txt` 至少必須明確記載：

- 永久商業使用權。
- 全球使用權。
- 委託方可修改模型、貼圖、骨架與動畫。
- 可在遊戲、網站、App、影片、廣告與宣傳素材中使用。
- 可將資產包含於編譯、封裝或加密後的遊戲產品中。
- 不得包含未申報的第三方模型、貼圖、動畫或生成素材。
- 若存在第三方素材，必須附來源與商業授權證明。
- 原作者不得在交付後主張撤回遊戲使用權。
- 是否為獨家買斷必須明確標示。

正式權利文件須填妥雙方名稱、標的、日期、報酬、獨家性與簽署欄位；範本不取代雙方依適用法律完成的正式合約審閱。

## 15. 最終驗收環境與標準

除 Turntable 外，必須在下列固定遊戲情境驗收：

- 固定 3/4 斜俯視。
- 角色在手機畫面約 180～260 px 高。
- 黑甲輪廓不可糊成黑塊。
- 紅色裂紋須清楚，但 Bloom 不可爆白。
- 大劍在每個攻擊動作中均可辨識。
- 披風動態不可遮住整個人物。
- `Attack1`、`Attack2`、`Attack3` 第一眼能看出不同。
- Three.js `GLTFLoader` 可直接載入。
- Three.js `AnimationMixer` 可取得全部 8 個 Clip。
- glTF Validator 無 Error。
- Chrome、Safari 與 iPhone WebGL 不得出現材質全黑、骨架錯位或動畫失效。
- `extensionsRequired` 僅可使用本案 Three.js 整合明確支援且已申報的 extension；未知、vendor-only 或未配置 Decoder 的 required extension 為不合格。

驗收結果應填入 `docs/acceptance-checklist.md` 與交付包內的 `technical_report.md`；失敗項目須修正後重新驗收。

## 16. 完成交付條件

僅有「檔案能開啟」不視為完成。交付須同時具備：

1. 指定檔案與原始素材完整。
2. 座標、骨架、Socket、Clip 名稱與 In-place 行為符合規格。
3. Mesh、材質、Skin Weight、貼圖與效能指標符合上限或已就建議偏差提出說明。
4. glTF Validator、Three.js 與指定瀏覽器／裝置驗收通過。
5. 動畫事件、技術報告與商業權利文件完整。

## 17. 技術標準參考

- [Khronos glTF 2.0 Specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)
- [Khronos KTX 2.0 Specification](https://github.khronos.org/KTX-Specification/ktxspec.v2.html)
- [Three.js GLTFLoader 文件](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)

上述連結作為格式與 Loader 行為的技術依據；若製作工具預設值與本 Brief 的較嚴格交付條款不同，以本 Brief 與雙方書面約定為準。

