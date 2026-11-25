// Kontrol kamera: putar (2 jari diputar / klik kanan + geser / Q-R / tombol ⟲⟳) & zoom (cubit / roda mouse).
// Dipasang di lapisan kanvas 3D, jadi tidak bentrok dengan joystick (punya zona sendiri) & tombol UI.
import { useEffect, useRef, type ReactNode } from 'react';
import { useGame, uiTerbuka } from '../game/store';

type Jari = { x: number; y: number };

export function KontrolKamera({ children }: { children: ReactNode }) {
  const jari = useRef(new Map<number, Jari>());
  const awal = useRef<{ sudut: number; jarak: number; zoom: number; kamSudut: number } | null>(null);
  const seret = useRef<{ x: number; sudut: number } | null>(null);

  // Keyboard PC: Q = putar kiri, R = putar kanan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useGame.getState();
      if (e.repeat || uiTerbuka(st) || (e.target instanceof HTMLInputElement)) return;
      if (e.code === 'KeyQ') st.putarKamera(-Math.PI / 4);
      if (e.code === 'KeyR') st.putarKamera(Math.PI / 4);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hitung = () => {
    const [a, b] = [...jari.current.values()];
    return { sudut: Math.atan2(b.y - a.y, b.x - a.x), jarak: Math.hypot(b.x - a.x, b.y - a.y) };
  };

  return (
    <div
      className="absolute inset-0"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') {
          if (e.button === 2) seret.current = { x: e.clientX, sudut: useGame.getState().kameraSudut };
          return;
        }
        jari.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (jari.current.size === 2) {
          const st = useGame.getState();
          const h = hitung();
          awal.current = { ...h, zoom: st.zoom, kamSudut: st.kameraSudut };
        }
      }}
      onPointerMove={(e) => {
        const st = useGame.getState();
        if (seret.current) {
          // Klik kanan + geser: 300 px = 1 putaran setengah
          const delta = ((e.clientX - seret.current.x) / 300) * Math.PI;
          st.putarKamera(seret.current.sudut - delta - st.kameraSudut);
          return;
        }
        if (!jari.current.has(e.pointerId)) return;
        jari.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const a = awal.current;
        if (jari.current.size === 2 && a) {
          const h = hitung();
          // Cubit: jari menjauh = zoom dekat (jarak kamera mengecil)
          st.setZoom(a.zoom * (a.jarak / Math.max(20, h.jarak)));
          // Putar 2 jari
          const putar = Math.atan2(Math.sin(h.sudut - a.sudut), Math.cos(h.sudut - a.sudut));
          st.putarKamera(a.kamSudut - putar - st.kameraSudut);
        }
      }}
      onPointerUp={(e) => {
        seret.current = null;
        jari.current.delete(e.pointerId);
        if (jari.current.size < 2) awal.current = null;
      }}
      onPointerCancel={(e) => {
        seret.current = null;
        jari.current.delete(e.pointerId);
        awal.current = null;
      }}
      onWheel={(e) => {
        const st = useGame.getState();
        st.setZoom(st.zoom * (e.deltaY > 0 ? 1.08 : 1 / 1.08));
      }}
    >
      {children}
    </div>
  );
}
