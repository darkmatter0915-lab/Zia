import { resolve } from 'node:path'
import { defineConfig } from 'vite'
export default defineConfig({
 base: '/Zia/',
 define: { __LAB_BUILD__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 12) || 'local-hardening') },
 build: { target: 'es2020', sourcemap: true, rollupOptions: { input: Object.fromEntries(["index.html","warrior-asset-lab/index.html","dungeon-reborn/index.html","dungeon-reborn/play.html","dungeon-reborn/game/index.html","dungeon-reborn/mobile-v4/ios.html"].map((path, i) => ['page' + i, resolve(import.meta.dirname, path)])) } }
})
