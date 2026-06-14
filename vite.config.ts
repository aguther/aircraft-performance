import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: "react/app.js",
        chunkFileNames: "react/[name].js",
        assetFileNames: "react/[name][extname]",
      },
    },
  },
});

