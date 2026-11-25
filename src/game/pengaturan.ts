// Pengaturan tampilan kecil (zoom kamera, teks besar). localStorage dibungkus try/catch.
const KEY_ZOOM = 'mahasiswa-sim-zoom';
const KEY_TEKS = 'mahasiswa-sim-teks-besar';

export const PILIHAN_ZOOM = [0.75, 1, 1.3] as const;

export function bacaZoom(): number {
  try {
    const v = Number(localStorage.getItem(KEY_ZOOM));
    return Number.isFinite(v) && v >= 0.6 && v <= 1.6 ? v : 1;
  } catch {
    return 1;
  }
}
export function simpanZoom(v: number) {
  try {
    localStorage.setItem(KEY_ZOOM, String(v));
  } catch {
    // abaikan
  }
}

export function bacaTeksBesar(): boolean {
  try {
    return localStorage.getItem(KEY_TEKS) === 'ya';
  } catch {
    return false;
  }
}
// Ukuran dasar UI (rem) mengikuti tinggi kotak game: desain dibuat untuk tinggi 720 px → 16 px.
// Di HP (tinggi ± 400 px) tetap 16 px (tombol ≥ 56 px, sama seperti desain HP); di monitor besar membesar sampai 28 px.
let dasarPx = 16;
let teksBesar = false;
function terapkanUkuran() {
  const el = document.documentElement;
  el.style.fontSize = `${(dasarPx * (teksBesar ? 1.12 : 1)).toFixed(2)}px`;
  // Tinggi HUD (3,5 × ukuran dasar) TIDAK ikut "Teks besar" agar HUD tetap ≤ 15% tinggi layar (BUG-02).
  // Teks di dalamnya tetap membesar; minimap memakai variabel yang sama agar tidak menimpa ⚙️ (BUG-03).
  el.style.setProperty('--hud-h', `${(dasarPx * 3.5).toFixed(2)}px`);
}
export function setTinggiLayar(tinggi: number) {
  const baru = Math.max(16, Math.min(28, (tinggi / 720) * 16));
  if (Math.abs(baru - dasarPx) < 0.2) return;
  dasarPx = baru;
  terapkanUkuran();
}

/** Teks besar: semua ukuran Tailwind (rem) ikut membesar ±12%. */
export function terapkanTeksBesar(v: boolean) {
  teksBesar = v;
  terapkanUkuran();
  try {
    localStorage.setItem(KEY_TEKS, v ? 'ya' : 'tidak');
  } catch {
    // abaikan
  }
}
