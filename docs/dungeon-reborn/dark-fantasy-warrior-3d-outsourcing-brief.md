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
- 所有名稱均區分大小寫；文件中以程式碼格式標示者，應依原字串交付。

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

## 4. 骨架規格

骨架至少必須能對應下列骨骼；實際名稱、父子關係與任何對應資訊須記錄於 `bones_sockets.md`：

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

披風骨骼必須至少包含：

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

`Sword_Base` 與 `Sword_Tip` 用於 Three.js 計算劍刃軌跡、Hitbox 與武器殘影。所有 Socket／輔助節點的父節點、局部 Position、Rotation、Scale 與用途須記錄於 `bones_sockets.md`。

## 6. Greatsword

- Greatsword 必須為獨立物件，並可由 `WeaponSocket_R` 正確掛載或定位。
- Greatsword 不可受角色 Skin Weight 影響。
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

## 8. In-place 動畫驗收

所有動畫期間必須符合：

- Root 的 X／Z 位移保持接近 0。
- Root 不可持續旋轉。
- 允許 Hips 上下起伏與執行動作所需旋轉。
- `Dodge` 可有明顯前傾或翻滾表演，但實際世界位移由程式控制。
- `Death` 不可導致整個角色原點突然偏離數公尺。
- Clip 切換時，角色不可跳高、縮放或瞬間轉向。

水平漂移誤差建議控制在 2 公分以內。各 Clip 的 Root X／Z 最大漂移與旋轉結果須記錄於 `technical_report.md`。

## 9. Skin Weight 與變形品質

- 每個 Vertex 最多 4 個 Bone Influences。
- 權重必須正規化。
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

- 紅色能量裂紋必須主要存在於 Emissive Map，不可只畫死在 Base Color。
- Web 最終版本可轉換成 ORM Packed Map 與 KTX2；原始交付仍須保留上述獨立貼圖。

## 12. 動畫事件資料

每段動畫須於 `animation_events.json` 提供：

- Clip 名稱
- 總長度
- 循環設定
- 主要命中時間
- 可取消時間
- 武器軌跡起始與結束時間

原始規格提供的 Attack1 示例如下；數值僅代表示例，正式交付須填入實際動畫量測結果：

```json
{
  "Attack1": {
    "duration": 0.62,
    "hitStart": 0.22,
    "hitEnd": 0.36,
    "comboOpen": 0.38,
    "comboClose": 0.56
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
│  ├─ warrior.blend
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

- `warrior.glb`：建議保留標準、未特殊壓縮版本。
- `warrior_web.glb`：可為採用 Meshopt／Draco 與貼圖壓縮的手機部署版。
- `warrior.blend` 為建議名稱；若實際製作使用 Maya，應交付對應可編輯來源檔，並在技術報告中說明檔名與版本。

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

驗收結果應填入 `docs/acceptance-checklist.md` 與交付包內的 `technical_report.md`；失敗項目須修正後重新驗收。

## 16. 完成交付條件

僅有「檔案能開啟」不視為完成。交付須同時具備：

1. 指定檔案與原始素材完整。
2. 座標、骨架、Socket、Clip 名稱與 In-place 行為符合規格。
3. Mesh、材質、Skin Weight、貼圖與效能指標符合上限或已就建議偏差提出說明。
4. glTF Validator、Three.js 與指定瀏覽器／裝置驗收通過。
5. 動畫事件、技術報告與商業權利文件完整。

