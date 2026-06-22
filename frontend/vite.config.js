import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envDir: "../",
  server: {
    port: 5173,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5055",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://127.0.0.1:5055",
        ws: true,
      },
    },
  },
});
