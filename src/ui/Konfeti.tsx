import { useEffect, useState, type CSSProperties } from 'react';
import { useGame } from '../game/store';

const JUMLAH = 26;
const WARNA = ['#ffb36b', '#ffe08a', '#a8e6cf', '#a0c4ff', '#ff9aa2', '#bdb2ff'];
const DURASI_MS = 1300;

type Partikel = { id: number; style: CSSProperties };

/**
 * Konfeti ringan dari elemen HTML (bukan objek 3D): muncul saat momen meriah
 * (upgrade, shift sempurna, dapat uang dari event). Hilang sendiri setelah ± 1,3 detik.
 */
export function Konfeti() {
  const pemicu = useGame((s) => s.konfeti);
  const [partikel, setPartikel] = useState<Partikel[]>([]);

  useEffect(() => {
    if (pemicu === 0) return;
    const baru = Array.from({ length: JUMLAH }, (_, i) => {
      const sudut = (i / JUMLAH) * Math.PI * 2 + Math.random() * 0.3;
      const jarak = 120 + Math.random() * 160;
      return {
        id: pemicu * 100 + i,
        style: {
          '--dx': `${Math.cos(sudut) * jarak}px`,
          '--dy': `${Math.sin(sudut) * jarak - 60}px`,
          '--putar': `${Math.random() * 720 - 360}deg`,
          backgroundColor: WARNA[i % WARNA.length],
          animationDelay: `${Math.random() * 80}ms`,
        } as CSSProperties,
      };
    });
    setPartikel(baru);
    const t = window.setTimeout(() => setPartikel([]), DURASI_MS);
    return () => window.clearTimeout(t);
  }, [pemicu]);

  if (partikel.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {partikel.map((p) => (
        <span key={p.id} className="konfeti absolute top-1/2 left-1/2 h-3 w-2 rounded-sm" style={p.style} />
      ))}
    </div>
  );
}
