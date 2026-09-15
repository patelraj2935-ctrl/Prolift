import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    // pdfmake is code-split via dynamic import() (loaded only when a PDF is
    // generated) and firebase is its own vendor chunk below. Both are large but
    // lazy/cacheable and don't block first paint, so lift the warning ceiling
    // above them to keep the build log clean.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Keep firebase in its own chunk so browsers cache it separately from
        // the app code. (pdfmake self-splits through its dynamic import.)
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
        },
      },
    },
  },
})
