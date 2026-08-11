import legacy from "@vitejs/plugin-legacy";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    legacy({
      targets: ["iOS >= 14", "Chrome >= 90"],
      modernPolyfills: true,
    }),
  ],
  build: {
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks(id) {
          return id.includes("/phaser/") ? "phaser" : undefined;
        }
      },
    },
  },
});
