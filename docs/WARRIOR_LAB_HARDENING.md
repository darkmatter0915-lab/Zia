# Warrior Asset Lab 工程強化

本次只改善現有工程，不宣稱正式角色、美術或戰鬥內容完成。正式資產仍為 WAITING_FOR_WARRIOR_ASSET。

## 固定方向
Three.js + GLB/glTF + AnimationMixer；固定3/4 Perspective Camera；手機橫向；Vite Pages base=/Zia/。
不使用Sprite Sheet、2D Rig、PixiJS人物、假GLB、幾何人形、旧角色或展示板。DEBUG地板與兩指輸入測試不是遊戲美術或角色操作。

## 資產契約
正式位置：public/assets/characters/warrior/warrior.glb。
GLB 2.0，貼圖及buffer內嵌、Y-up、+Z向前、1unit=1m；Root位於地面腳底中央，頂層Warrior/Armature/Root不得藏縮放補正。
Mesh：SK_Warrior_Body、SK_Warrior_Cape、獨立SM_Greatsword；Socket用既有WeaponSocket_R，相容Socket_Weapon_R。
Humanoid約50–80bones，Cape_01至Cape_04…08；每頂點最多4權重；不採即時cloth。
8 clips：Idle、Run、Attack1、Attack2、Attack3、Dodge、Hit、Death。全部In-place，Run只需一套，遊戲旋轉角色；Idle/Run循環，Death保留末姿勢。
本體含武器≤60k triangles、建議≤4材質、主貼圖2K，PBR BaseColor/Normal/Metallic/Roughness/AO/Emissive，紅裂紋需Emissive Map、非黑Emissive係數及正強度。
需另交可編輯原稿、原始貼圖、Turntable、動畫預覽、Bone/Socket表、來源及商用/修改權利說明。黑紅母版與03仍是唯一美術基準。
64MiB是讀檔防誤傳安全上限，不是效能預算或推薦大小。

## 技術驗證邊界
Root與祖先會取樣位移、旋轉及縮放；沒有明確Root或無法解析軌道只能WARN，不會因未找到track就PASS。
Pivot用身體腳底与Foot_L/Foot_R中點估計，排除大劍及披風對全身中心的干擾，仍需人工中立姿勢驗收。
Draw Calls分開計算主繪製/含陰影，不計DEBUG，不能換算成60FPS保證。
報告永遠不自動認證美術、穿模、商用權利或iPhone效能，也不取代Khronos glTF Validator完整規範檢查。
缺資產、HTTP錯誤、離線、壞GLB、雜湊不符分開處理。

## 重現
npm ci
npm test
npm run build
npm run verify:dist
npx playwright install --with-deps chromium webkit
npm run test:browser

CI輸出實際瀏覽器截圖及JSON報告到lab-test-evidence。單元測試僅用無Mesh的Object3D及track，不輸出GLB。
手機截圖為瀏覽器橫向模擬，safe-area數字為測試注入值，不是實體iPhone截圖。兩指測試用Chromium CDP；WebKit對該項明確skip。
實體iPhone Safari、正式GLB/Draco/KTX2/Meshopt樣本、角色清晰度與60FPS均仍待驗收。

旧遊戲與四個runtime封存archive，不隨Vite發布；四個舊入口轉到lab。原個人中控台不重寫。
下一步是驗收此次lab工程，再接入符合契約的warrior.glb；不能先擴充技能、怪物、Boss或地下城。
