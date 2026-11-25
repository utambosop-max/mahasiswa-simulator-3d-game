// Jam dinding bersama untuk hal yang "dihitung dari Date.now()" (lampu lalu lintas, gerobak cilok).
// Jam tiap HP bisa meleset beberapa detik/menit → saat online, pakai jam SERVER supaya semua pemain
// melihat lampu & gerobak yang sama. Offline: selisih = 0 (pakai jam HP sendiri).
// File ini sengaja tanpa import apa pun (dipakai src/game juga, aman dari import melingkar).

let selisihMs = 0;
const sampel: number[] = [];

/** Waktu sekarang (ms) menurut jam bersama. */
export const sekarangMs = () => Date.now() + selisihMs;

/**
 * Catat jam server dari pesan `jam`. Sampel = jamServer − jamHP saat diterima = selisihAsli − lama perjalanan,
 * jadi sampel TERBESAR dari beberapa detik terakhir adalah perkiraan terbaik (perjalanan paling cepat).
 */
export function catatJamServer(msServer: number) {
  if (typeof msServer !== 'number' || !Number.isFinite(msServer)) return;
  sampel.push(msServer - Date.now());
  if (sampel.length > 20) sampel.shift();
  selisihMs = Math.max(...sampel);
}

/** Keluar dari mode online → kembali ke jam HP. */
export function resetJamServer() {
  sampel.length = 0;
  selisihMs = 0;
}
