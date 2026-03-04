// client/vite.config.ts
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// We use a manual service worker (src/sw.js) rather than vite-plugin-pwa
// so that the SW file is simply copied to the build output as-is.
// The plugin is still imported for its PWA manifest injection helper.

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Proxy all /api/* requests to the Express server during development.
    // This means the browser always calls the same origin — no CORS issues.
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Output the SW file without hashing so the browser can always find it
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
    },
  },
});
