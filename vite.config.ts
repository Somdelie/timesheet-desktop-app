import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import electronRenderer from "vite-plugin-electron-renderer";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { copyFileSync, existsSync, mkdirSync } from "fs";

// Copy splash.html to dist-electron
function copySplashPlugin() {
  return {
    name: "copy-splash",
    closeBundle() {
      const src = path.resolve(__dirname, "electron/splash.html");
      const destDir = path.resolve(__dirname, "dist-electron");
      const dest = path.resolve(destDir, "splash.html");
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      if (existsSync(src)) {
        copyFileSync(src, dest);
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), // or your framework
    tailwindcss(),
    electron([
      {
        entry: "electron/main.ts",
        vite: {
          plugins: [copySplashPlugin()],
        },
      },
      {
        entry: "electron/preload.ts",
        onstart(args) {
          args.reload();
        },
      },
    ]),
    electronRenderer(),
  ],
  base: "./",
  build: {
    outDir: "dist",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
