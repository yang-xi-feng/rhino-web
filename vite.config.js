import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 配置跨域代理
    proxy: {
      // 将所有以/api开头的请求代理到localhost:5173
      '/api': {
        target: 'http://jz-arch-ai-render-vue.test.crfsdi-gw.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/img': {
        target: 'https://fastly.picsum.photos',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/img/, ''),
      }
    }
  }
})
