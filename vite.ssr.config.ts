import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 预渲染用的 SSR 构建配置：
// 产物固定为 dist-ssr/entry-server.mjs，供 scripts/prerender.mjs 导入。
// 文档与 type:module 的兼容性要求后缀为 .mjs。
export default defineConfig({
  plugins: [react()],
  build: {
    ssr: 'src/entry-server.tsx',
    outDir: 'dist-ssr',
    emptyOutDir: true,
    ssrEmitAssets: false,
    rollupOptions: {
      output: {
        entryFileNames: 'entry-server.mjs',
        format: 'es',
      },
    },
  },
})
