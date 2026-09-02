# Warrior Asset Drop Location

正式角色檔案固定放置於：

```text
public/assets/characters/warrior/warrior.glb
```

目前狀態：`WAITING_FOR_WARRIOR_ASSET`

本目錄不得放入假 GLB、primitive 人形、舊方塊角色或展示用 placeholder。

`warrior.glb` 最低交付條件：

- GLB 2.0，Y-up，約 1 unit = 1 meter
- Character Mesh + SkinnedMesh + Humanoid Skeleton + Skin Weights
- PBR Materials，包含 Base Color、Normal、Metallic、Roughness、AO、Emissive
- 紅色能量裂紋使用 Emissive Map
- 獨立 Greatsword Mesh
- `WeaponSocket_R`
- Cape Bones
- In-place clips：`Idle`、`Run`、`Attack1`、`Attack2`、`Attack3`、`Dodge`、`Hit`、`Death`
- Root Motion 關閉
- Pivot 位於雙腳中央地面

Warrior Asset Lab 將從 `import.meta.env.BASE_URL` 組合此路徑並執行自動驗證。
