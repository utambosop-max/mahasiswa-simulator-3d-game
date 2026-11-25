import { defineConfig } from 'vite';

// Build server online menjadi SATU file (dist-server/server.mjs) yang cukup dijalankan dengan `node`.
export default defineConfig({
  build: {
    ssr: 'server/main.ts',
    outDir: 'dist-server',
    // false: jangan hapus cloudflared.exe (± 50 MB) yang sudah diunduh di folder ini
    emptyOutDir: false,
    target: 'node20',
    rollupOptions: { output: { entryFileNames: 'server.mjs' } },
  },
  ssr: { noExternal: true },
});
