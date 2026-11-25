import { useEffect, useRef } from 'react';
import { playerPos } from '../game/playerPos';
import { rpmMotor } from '../game/fisika';

/**
 * Speedometer motor: km/jam + gigi + jarum RPM kecil.
 * Angka ditulis langsung ke elemen tiap frame (requestAnimationFrame) — tanpa setState,
 * jadi HUD tidak di-render ulang 60× per detik.
 */
export function Speedometer() {
  const angka = useRef<HTMLSpanElement>(null);
  const gigi = useRef<HTMLSpanElement>(null);
  const batang = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let id = 0;
    let terakhir = -1;
    const putar = () => {
      const v = playerPos.motor ? playerPos.kecepatan : 0;
      const kmj = Math.round(v * 3.6); // m/s → km/jam
      if (kmj !== terakhir) {
        terakhir = kmj;
        const { rpm, gigi: g } = rpmMotor(v);
        if (angka.current) angka.current.textContent = String(kmj);
        if (gigi.current) gigi.current.textContent = v < 0.2 ? 'N' : String(g);
        if (batang.current) batang.current.style.width = `${Math.min(100, (rpm / 9000) * 100)}%`;
      }
      id = requestAnimationFrame(putar);
    };
    id = requestAnimationFrame(putar);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <span className="flex items-center gap-1.5 text-mini" aria-label="Kecepatan motor">
      🏍️
      <span ref={angka} className="w-7 text-right text-isi font-extrabold tabular-nums">
        0
      </span>
      km/j
      <span className="rounded bg-hp-casing px-1 font-extrabold text-white" title="Gigi">
        <span ref={gigi}>N</span>
      </span>
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-hp-casing/15" title="RPM">
        <div ref={batang} className="h-full w-0 rounded-full bg-aksen" />
      </span>
    </span>
  );
}
