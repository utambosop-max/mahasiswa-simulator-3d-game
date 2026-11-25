import type { CapacitorConfig } from '@capacitor/cli';

// Konfigurasi Capacitor: membungkus hasil build web (folder dist) menjadi aplikasi Android.
const config: CapacitorConfig = {
  appId: 'com.mahasiswasim.game',
  appName: 'Mahasiswa Simulator 3D',
  webDir: 'dist',
  android: {
    backgroundColor: '#fff1dc',
  },
  server: {
    // Mode online tersambung ke server di PC lewat ws://IP-PC:8787 (WiFi rumah, tanpa HTTPS).
    // Halaman https tidak boleh membuka ws:// (mixed content), jadi app memakai skema http
    // dan lalu lintas "cleartext" diizinkan.
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
