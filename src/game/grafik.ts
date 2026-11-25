// Pilihan kualitas grafik, disimpan terpisah dari save game (seperti pilihan suara).
// hemat = tanpa bayangan, resolusi 1× · tinggi = bayangan + resolusi hingga 1,75× · ultra = 2× (paling halus, berat)
export type Grafik = 'hemat' | 'tinggi' | 'ultra';
export const URUTAN_GRAFIK: readonly Grafik[] = ['hemat', 'tinggi', 'ultra'];

const KEY = 'mahasiswa-sim-grafik';

export function bacaGrafik(): Grafik {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'hemat' || v === 'ultra' ? v : 'tinggi';
  } catch {
    return 'tinggi';
  }
}

export function simpanGrafik(g: Grafik): void {
  try {
    localStorage.setItem(KEY, g);
  } catch {
    // abaikan: pilihan hanya berlaku sampai app ditutup
  }
}

/**
 * Resolusi gambar 3D (device pixel ratio). Di monitor PC (dpr 1) mode "tinggi" tetap 1,5×
 * agar tepian objek tidak bergerigi (supersampling = anti-aliasing tambahan).
 */
export function dprGrafik(g: Grafik, dprLayar: number): number {
  if (g === 'hemat') return 1;
  if (g === 'ultra') return 2;
  return Math.min(1.75, Math.max(1.5, dprLayar));
}
