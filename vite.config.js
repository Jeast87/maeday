import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Needed for Cloudflare Pages
export default defineConfig({
  plugins: [react()],
  base: "./",
});