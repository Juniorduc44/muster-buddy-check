import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  base: './', // This ensures all assets use relative paths for IPFS compatibility
  server: {
    host: true, // Expose dev server to local network
  },
});