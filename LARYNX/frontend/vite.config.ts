import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'react-vendor';
            }
            if (id.includes('/three/')) {
              return 'three-vendor';
            }
            if (id.includes('/@react-three/')) {
              return 'r3f-vendor';
            }
            if (id.includes('/gsap/') || id.includes('/motion/') || id.includes('/framer-motion/')) {
              return 'animation-vendor';
            }
            if (id.includes('/tone/')) {
              return 'audio-vendor';
            }
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
})
