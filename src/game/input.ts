// Input gerak pemain: gabungan Virtual Joystick (HP) + WASD/panah (PC).
// Disimpan di objek biasa (bukan state React) agar tidak memicu re-render 60x per detik.

/** Ditulis oleh komponen Joystick. Nilai -1..1, y positif = ke bawah layar. */
export const joyInput = { x: 0, y: 0 };

const keys = new Set<string>();

const KIRI = ['KeyA', 'ArrowLeft'];
const KANAN = ['KeyD', 'ArrowRight'];
const ATAS = ['KeyW', 'ArrowUp'];
const BAWAH = ['KeyS', 'ArrowDown'];
const SEMUA = [...KIRI, ...KANAN, ...ATAS, ...BAWAH];

const ada = (daftar: string[]) => daftar.some((k) => keys.has(k));

/** Pasang listener keyboard. Mengembalikan fungsi pembersih. */
export function attachKeyboard(): () => void {
  const down = (e: KeyboardEvent) => {
    const target = e.target;
    if (
      e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey ||
      (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select')))
    ) {
      keys.clear();
      return;
    }
    if (SEMUA.includes(e.code)) {
      keys.add(e.code);
      e.preventDefault();
    }
  };
  const up = (e: KeyboardEvent) => keys.delete(e.code);
  const clear = () => keys.clear(); // jendela kehilangan fokus → lepas semua tombol

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', clear);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', clear);
    keys.clear();
  };
}

/** Baca arah gerak ke `out` (panjang 0..1). Keyboard diutamakan bila ditekan. */
export function readMove(out: { x: number; y: number }): void {
  const kx = (ada(KANAN) ? 1 : 0) - (ada(KIRI) ? 1 : 0);
  const ky = (ada(BAWAH) ? 1 : 0) - (ada(ATAS) ? 1 : 0);
  if (kx !== 0 || ky !== 0) {
    const len = Math.hypot(kx, ky); // diagonal tidak lebih cepat
    out.x = kx / len;
    out.y = ky / len;
    return;
  }
  out.x = joyInput.x;
  out.y = joyInput.y;
}
