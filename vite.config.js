import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/Zia/',
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        warriorAssetLab: resolve(import.meta.dirname, 'warrior-asset-lab/index.html'),
      },
    },
  },
})
