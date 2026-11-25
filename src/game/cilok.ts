// M12: Mang Ujang, penjual cilok keliling. Logika murni + state bersama (seperti lalulintas.ts).
// Posisi gerobak = fungsi dari jam DUNIA NYATA (Date.now) → semua pemain online melihat gerobak
// di tempat yang sama tanpa pesan ke server. Rute bolak-balik, mangkal sebentar di tiap titik.
import f4 from '../data/fitur4.json';
import { sekarangMs } from '../online/jamServer';

const C = f4.cilok;
const JALUR = C.jalur as [number, number][];

type Potongan = { mulai: number; lama: number; dari: [number, number]; ke: [number, number] }; // dari === ke → mangkal
/** Jadwal satu putaran (maju lalu mundur), dihitung sekali saat modul dimuat. */
const JADWAL: Potongan[] = (() => {
  const urut = [...JALUR, ...JALUR.slice(1, -1).reverse()]; // 0,1,2,3,2,1 → kembali ke 0
  const hasil: Potongan[] = [];
  let t = 0;
  for (let i = 0; i < urut.length; i++) {
    const a = urut[i];
    const b = urut[(i + 1) % urut.length];
    hasil.push({ mulai: t, lama: C.berhentiDetik, dari: a, ke: a });
    t += C.berhentiDetik;
    const lama = Math.hypot(b[0] - a[0], b[1] - a[1]) / C.kecepatan;
    hasil.push({ mulai: t, lama, dari: a, ke: b });
    t += lama;
  }
  return hasil;
})();
const SIKLUS = JADWAL[JADWAL.length - 1].mulai + JADWAL[JADWAL.length - 1].lama;

/** Posisi gerobak sekarang (dibaca komponen 3D, interaksi, & suara). */
export const CILOK = { x: JALUR[0][0], z: JALUR[0][1], rotY: Math.PI / 2, mangkal: true };

/** Titik interaksi gerobak — array yang SAMA dipakai InteraksiDef & diubah isinya tiap frame (tanpa alokasi). */
export const TITIK_CILOK: [number, number] = [CILOK.x, CILOK.z - 0.9];

/**
 * Hitung posisi gerobak pada waktu `detik` (default: jam dunia nyata).
 * Mengembalikan true tepat saat gerobak MULAI mangkal (untuk bunyi lonceng "teng-teng").
 */
export function langkahCilok(detik = sekarangMs() / 1000): boolean {
  const t = ((detik % SIKLUS) + SIKLUS) % SIKLUS;
  let p = JADWAL[0];
  for (const j of JADWAL) if (t >= j.mulai) p = j;
  const k = p.lama > 0 ? Math.min(1, (t - p.mulai) / p.lama) : 1;
  const sebelum = CILOK.mangkal;
  CILOK.mangkal = p.dari === p.ke;
  CILOK.x = p.dari[0] + (p.ke[0] - p.dari[0]) * k;
  CILOK.z = p.dari[1] + (p.ke[1] - p.dari[1]) * k;
  if (!CILOK.mangkal) CILOK.rotY = Math.atan2(p.ke[0] - p.dari[0], p.ke[1] - p.dari[1]);
  // Pembeli berdiri di sisi gerobak yang menghadap jalan (z lebih kecil)
  TITIK_CILOK[0] = CILOK.x;
  TITIK_CILOK[1] = CILOK.z - 0.9;
  return CILOK.mangkal && !sebelum;
}
