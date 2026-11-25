import { useEffect, useRef } from 'react';
import { joyInput } from '../game/input';

const RADIUS = 52; // px, jarak maksimal knob dari pusat basis
const DEAD = 0.12; // dead zone (proporsi radius) — dipetakan ulang agar tidak "loncat"
const UKURAN_BASIS = 136; // px

/**
 * Joystick MELAYANG anti-macet (lihat skill android-capacitor-builder §A3):
 * - Zona sentuh tak terlihat di ± 45% kiri layar; basis muncul di titik jempol menyentuh.
 * - Pointer Events + pointer capture + lacak satu pointerId + reset di semua event akhir.
 * - Output analog: besar dorongan = kecepatan.
 */
export function Joystick() {
  const zona = useRef<HTMLDivElement>(null);
  const basis = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);
  const pusat = useRef({ x: 0, y: 0 });

  /** Letakkan basis di posisi (koordinat relatif zona) dan tampilkan aktif/diam. */
  const taruhBasis = (x: number | null, y: number | null, aktif: boolean) => {
    const b = basis.current;
    if (!b) return;
    if (x === null || y === null) {
      // Posisi istirahat: kiri bawah, samar sebagai petunjuk
      b.style.left = '';
      b.style.top = '';
      b.style.right = '';
      b.style.bottom = '';
      b.dataset.diam = '1';
    } else {
      b.style.left = `${x - UKURAN_BASIS / 2}px`;
      b.style.top = `${y - UKURAN_BASIS / 2}px`;
      delete b.dataset.diam;
    }
    b.style.opacity = aktif ? '1' : '0.45';
  };

  const reset = () => {
    activeId.current = null;
    joyInput.x = 0;
    joyInput.y = 0;
    if (knob.current) knob.current.style.transform = 'translate(0px, 0px)';
    taruhBasis(null, null, false);
  };

  useEffect(() => {
    reset();
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);
    return () => {
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', reset);
      reset();
    };
  }, []);

  const update = (cx: number, cy: number) => {
    let dx = cx - pusat.current.x;
    let dy = cy - pusat.current.y;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    const m = Math.min(1, len / RADIUS); // besar dorongan 0..1
    if (m < DEAD || len === 0) {
      joyInput.x = 0;
      joyInput.y = 0;
      return;
    }
    // Petakan ulang [DEAD..1] → [0..1] agar kecepatan naik mulus dari 0 (tidak "loncat")
    const kuat = (m - DEAD) / (1 - DEAD);
    joyInput.x = (dx / Math.hypot(dx, dy)) * kuat;
    joyInput.y = (dy / Math.hypot(dx, dy)) * kuat;
  };

  return (
    <div
      ref={zona}
      className="absolute bottom-0 left-0 top-[18%] w-[45%] touch-none"
      onPointerDown={(e) => {
        if (activeId.current !== null) return;
        activeId.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        const r = e.currentTarget.getBoundingClientRect();
        // Jepit agar basis tidak keluar tepi zona
        const setengah = UKURAN_BASIS / 2 + 4;
        const lx = Math.min(Math.max(e.clientX - r.left, setengah), r.width - setengah);
        const ly = Math.min(Math.max(e.clientY - r.top, setengah), r.height - setengah);
        pusat.current = { x: e.clientX, y: e.clientY };
        taruhBasis(lx, ly, true);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.pointerId === activeId.current) update(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (e.pointerId === activeId.current) reset();
      }}
      onPointerCancel={(e) => {
        if (e.pointerId === activeId.current) reset();
      }}
      onLostPointerCapture={(e) => {
        if (e.pointerId === activeId.current) reset();
      }}
    >
      <div
        ref={basis}
        className="pointer-events-none absolute rounded-full border-4 border-white/70 bg-white/35 shadow-lg transition-opacity duration-150 data-[diam]:bottom-5 data-[diam]:left-6"
        style={{ width: UKURAN_BASIS, height: UKURAN_BASIS }}
      >
        <div
          ref={knob}
          className="absolute top-1/2 left-1/2 -mt-7 -ml-7 h-14 w-14 rounded-full bg-orange-300 shadow-sm"
        />
      </div>
    </div>
  );
}
