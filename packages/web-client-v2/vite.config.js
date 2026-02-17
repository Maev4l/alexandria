// Edited by Claude.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { execSync } from "child_process";

// Get git commit hash for build identification
const getGitCommitHash = () => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
};

export default defineConfig({
  define: {
    __BUILD_HASH__: JSON.stringify(getGitCommitHash()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "logo144.png"],
      manifest: {
        name: "Alexandria",
        short_name: "Alexandria",
        description: "Manage your libraries and books",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "logo144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "logo192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "logo512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
          {
            src: "logo512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias "@" to src/ for cleaner imports (shadcn/ui convention)
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
