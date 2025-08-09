import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Determine base path based on environment
  let base = "/";
  
  if (mode === "production") {
    // Check if we're building for GitHub Pages specifically
    // You can set this via environment variable: VITE_DEPLOY_TARGET=github
    const deployTarget = process.env.VITE_DEPLOY_TARGET;
    if (deployTarget === "github") {
      base = "/muster-buddy-check/";
    }
    // Otherwise use "/" for Netlify and other deployments
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base, // Set the base path
  };
});