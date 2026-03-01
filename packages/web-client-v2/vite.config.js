// Edited by Claude.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

// ES module equivalent of __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get git commit hash for build identification
const getGitCommitHash = () => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
};

// Read API endpoint from output.json for local dev proxy
import { apiEndpoint } from './output.json';

export default defineConfig({
  define: {
    __BUILD_HASH__: JSON.stringify(getGitCommitHash()),
  },
  server: {
    proxy: {
      '/api': {
        target: apiEndpoint,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "logo144.png", "logo180.png", "logo192.png", "logo512.png"],
      manifest: {
        name: "Alexandria",
        short_name: "Alexandria",
        description: "Manage your libraries and books",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "logo144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "logo180.png",
            sizes: "180x180",
            type: "image/png",
          },
          {
            src: "logo192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "logo512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "logo512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
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
  build: {
    rollupOptions: {
      output: {
        // Split large vendor libraries into separate chunks
        manualChunks: {
          // AWS Amplify is large, isolate it
          amplify: ["aws-amplify"],
          // Barcode scanning library (only needed for AddBook)
          zxing: ["@zxing/browser", "@zxing/library"],
          // Lottie animation library (only needed for Onboarding)
          lottie: ["lottie-react", "lottie-web"],
          // React core (cached across deploys)
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
