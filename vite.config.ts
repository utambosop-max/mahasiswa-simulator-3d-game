import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' → path aset relatif, wajib agar APK Capacitor tidak layar putih
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // Three.js memang besar (± 1 MB, ± 320 kB gzip) — wajar untuk game 3D
  build: { chunkSizeWarningLimit: 1600 },
});
