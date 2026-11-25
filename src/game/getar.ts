// Getar HP (bisa dimatikan di Pengaturan). localStorage dibungkus try/catch.
const KEY = 'mahasiswa-sim-getar';

function baca(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'mati';
  } catch {
    return true;
  }
}

let nyala = baca();

export const getarNyala = () => nyala;

export function setGetar(v: boolean) {
  nyala = v;
  try {
    localStorage.setItem(KEY, v ? 'nyala' : 'mati');
  } catch {
    // abaikan
  }
}

/** Getar singkat (ms). Diam jika dimatikan atau HP tidak mendukung. */
export function getar(ms: number | number[] = 10) {
  if (!nyala) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    // abaikan
  }
}
