import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 3000,
        host: true,
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/three') || id.includes('node_modules/@react-three') || id.includes('node_modules/postprocessing') || id.includes('node_modules/three-stdlib')) {
                        return 'three-vendor';
                    }
                    if (id.includes('node_modules/tone')) {
                        return 'audio-vendor';
                    }
                    if (id.includes('node_modules/gsap') || id.includes('node_modules/@gsap') || id.includes('node_modules/motion')) {
                        return 'animation-vendor';
                    }
                    if (id.includes('node_modules/')) {
                        return 'app';
                    }
                }
            }
        }
    }
});
