import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The webview is built as a self-contained bundle with stable, non-hashed file
// names so the extension host can reference them deterministically when it
// builds the webview HTML.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist/webview",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "src/webview/main.tsx"),
      output: {
        entryFileNames: "webview.js",
        chunkFileNames: "webview.js",
        assetFileNames: "webview.[ext]"
      }
    }
  }
});
