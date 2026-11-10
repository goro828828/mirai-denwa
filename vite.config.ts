import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // 相対パスで出力（サブディレクトリや静的ホスティングでもそのまま動く）
  base: './',
  plugins: [react()],
})
