import { useEffect, useRef } from 'react';
import { useGame } from '../../game/store';
import { playerPos } from '../../game/playerPos';
import { sfxPop } from '../../audio/sfx';
import { gambarPeta } from './gambarPeta';

const UKURAN = 112; // px (CSS)
const SKALA = 2.2; // px per meter (± 36 m terlihat)

/** Minimap bulat di kanan atas (hanya di dunia luar). Ketuk untuk membuka peta besar. */
export function Minimap() {
  const lokasi = useGame((s) => s.lokasi);
  const petaTerbuka = useGame((s) => s.petaTerbuka || (s.hpTerbuka && s.hpApp === 'peta'));
  const setPeta = useGame((s) => s.setPeta);
  const kanvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (lokasi !== 'dunia' || petaTerbuka) return;
    const c = kanvas.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = UKURAN * dpr;
    c.height = UKURAN * dpr;

    let id = 0;
    let lalu = 0;
    const loop = (t: number) => {
      id = requestAnimationFrame(loop);
      if (t - lalu < 33) return; // ± 30 FPS sudah cukup untuk minimap
      lalu = t;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, UKURAN, UKURAN);
      const st = useGame.getState();
      gambarPeta(g, {
        cx: UKURAN / 2,
        cy: UKURAN / 2,
        skala: SKALA,
        pusatX: playerPos.x,
        pusatZ: playerPos.z,
        label: false,
        pemain: playerPos,
        motor: st.naikMotor ? null : st.motorParkir,
        sudut: st.kameraSudut,
      });
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [lokasi, petaTerbuka]);

  if (lokasi !== 'dunia') return null;

  return (
    <div className="safe-x pointer-events-none absolute top-[calc(var(--hud-h,3.5rem)+1rem)] right-0">
      <button
        onPointerDown={() => {
          sfxPop();
          setPeta(true);
        }}
        className="pointer-events-auto relative mr-2.5 overflow-hidden rounded-full shadow-sm active:scale-95"
        style={{ width: UKURAN, height: UKURAN }}
        aria-label="Buka peta"
      >
        <canvas ref={kanvas} style={{ width: UKURAN, height: UKURAN }} />
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-md bg-white/85 px-1.5 text-mini font-extrabold text-amber-900">
          🗺️ PETA
        </span>
      </button>
    </div>
  );
}
