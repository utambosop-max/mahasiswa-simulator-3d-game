// Alat bersama mini-game fisika (M12): loop animasi, kanvas 2D, & fungsi gambar sederhana.
// Semua digambar prosedural di <canvas> — tanpa file gambar.
import { useEffect, useRef } from 'react';

/** Ukuran gambar internal kanvas (diskalakan CSS agar pas layar) */
export const LEBAR = 800;
export const TINGGI = 360;

export type Selesai = (skor: number) => void;

/**
 * Jalankan `langkah(dt, ctx)` tiap frame (requestAnimationFrame). dt dibatasi 0,05 dtk agar fisika stabil saat lag.
 * Fungsi terbaru selalu dipakai (lewat ref) tanpa memulai ulang loop.
 */
export function useLoop(kanvas: React.RefObject<HTMLCanvasElement | null>, langkah: (dt: number, ctx: CanvasRenderingContext2D) => void) {
  const fn = useRef(langkah);
  fn.current = langkah;
  useEffect(() => {
    let id = 0;
    let lalu = performance.now();
    const putar = (kini: number) => {
      const dt = Math.min(0.05, (kini - lalu) / 1000);
      lalu = kini;
      const ctx = kanvas.current?.getContext('2d');
      if (ctx) fn.current(dt, ctx);
      id = requestAnimationFrame(putar);
    };
    id = requestAnimationFrame(putar);
    return () => cancelAnimationFrame(id);
  }, [kanvas]);
}

/** Koordinat ketukan dalam satuan gambar internal (0..LEBAR, 0..TINGGI) */
export function titikKetuk(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
  const r = e.currentTarget.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * LEBAR, y: ((e.clientY - r.top) / r.height) * TINGGI };
}

export function kotak(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, isi: string, garis?: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = isi;
  ctx.fill();
  if (garis) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = garis;
    ctx.stroke();
  }
}

export function bulat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, isi: string, garis = '#3b2a20') {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = isi;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = garis;
  ctx.stroke();
}

export function tulis(ctx: CanvasRenderingContext2D, teks: string, x: number, y: number, ukuran = 22, warna = '#3b2a20', rata: CanvasTextAlign = 'center') {
  ctx.font = `800 ${ukuran}px system-ui, sans-serif`;
  ctx.textAlign = rata;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = warna;
  ctx.fillText(teks, x, y);
}

/** Bar tenaga/sudut berosilasi 0..1 (dipakai beberapa mini-game) */
export const osilasi = (t: number, kecepatan = 2.6) => (Math.sin(t * kecepatan - Math.PI / 2) + 1) / 2;

export function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, nilai: number, warna = '#ff8a3d', label = '') {
  kotak(ctx, x, y, w, h, h / 2, '#f3e2c7', '#3b2a20');
  kotak(ctx, x + 3, y + 3, Math.max(0, (w - 6) * nilai), h - 6, (h - 6) / 2, warna);
  if (label) tulis(ctx, label, x + w / 2, y - 14, 15);
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
