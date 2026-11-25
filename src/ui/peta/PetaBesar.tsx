import { useEffect, useRef, type ReactNode } from 'react';
import { useGame } from '../../game/store';
import { playerPos } from '../../game/playerPos';
import { BANGUNAN, DUNIA } from '../../game/duniaLayout';
import { gambarPeta } from './gambarPeta';
import { TombolTutup } from '../kit';

const LEGENDA: [string, string, string][] = [
  ...BANGUNAN.filter((b) => b.ket).map((b): [string, string, string] => [b.ikon, b.nama, b.ket ?? '']),
  ['🍳', 'Nasi Goreng Bang Jali', 'Makan malam (Malam–Begadang)'],
  ['⚽', 'Lapangan Futsal', 'Main bola: stres turun (Sore–Malam)'],
  ['🌳', 'Taman', 'Duduk santai, turunkan stres'],
  ['🚏', 'Halte Angkot', 'Pindah cepat Barat ↔ Timur (Rp4.000)'],
  ['🛵', 'Motormu', 'Naik motor biar cepat (tombol F)'],
  // M13: area baru (jalan-jalan & pemandangan)
  ['🏘️', 'Gang Kos Mawar', 'Deretan kos petak, jemuran & menara air (barat)'],
  ['🌊', 'Kali & Jembatan', 'Jalan santai tepi kali, ada bebek & pemancing (utara)'],
  ['🌾', 'Sawah & Kebun', 'Petak sawah, saung, kebun pisang & sayur (timur)'],
  ['🛍️', 'Pasar Kaget', 'Lapak jajanan warna-warni, ramai lampu malam (selatan)'],
  ['🏐', 'Lapangan Kampung', 'Lapangan tanah tempat anak-anak main (barat daya)'],
];

/**
 * Isi peta (kanvas + legenda) — dipakai di dua tempat: modal PetaBesar (tombol M / ketuk minimap)
 * dan aplikasi 🗺️ Peta di HP. `kanan` = elemen tambahan di header legenda (mis. tombol ✕).
 */
export function IsiPeta({ kanan }: { kanan?: ReactNode }) {
  const kanvas = useRef<HTMLCanvasElement>(null);
  const wadah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = kanvas.current;
    const w = wadah.current;
    const g = c?.getContext('2d');
    if (!c || !w || !g) return;

    let id = 0;
    let terakhir = -Infinity;
    const loop = (waktu: number) => {
      id = requestAnimationFrame(loop);
      if (waktu - terakhir < 32) return;
      terakhir = waktu;
      const lebar = w.clientWidth;
      const tinggi = w.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== Math.round(lebar * dpr) || c.height !== Math.round(tinggi * dpr)) {
        c.width = Math.round(lebar * dpr);
        c.height = Math.round(tinggi * dpr);
      }
      // Peta diputar 45° → bentuk belah ketupat; cari skala agar seluruh dunia muat
      const rentang = (DUNIA.halfW + DUNIA.halfD) * Math.SQRT2 + 4;
      const skala = Math.min(lebar / rentang, tinggi / rentang);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = '#fff6e5';
      g.fillRect(0, 0, lebar, tinggi);
      const st = useGame.getState();
      gambarPeta(g, {
        cx: lebar / 2,
        cy: tinggi / 2,
        skala,
        pusatX: 0,
        pusatZ: 0,
        label: true,
        pemain: playerPos,
        motor: st.naikMotor ? null : st.motorParkir,
        sudut: st.kameraSudut,
      });
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="flex h-full min-h-0 gap-2.5">
      <div ref={wadah} className="relative min-w-0 flex-1 overflow-hidden rounded-kartu shadow-tipis ring-1 ring-hp-casing/10" onPointerDown={(e) => e.stopPropagation()}>
        <canvas ref={kanvas} className="absolute inset-0 h-full w-full" />
        <div className="absolute top-2 left-2 rounded-tombol bg-kartu/95 px-3 py-1 text-ket font-extrabold text-teks shadow-tipis ring-1 ring-hp-casing/10">
          🗺️ Kampung Mahasiswa · <span className="inline-block h-2.5 w-2.5 rotate-45 bg-[#ff8a3d]" /> kamu
        </div>
      </div>
      <div className="flex w-[32%] max-w-[18rem] min-w-0 flex-col gap-2" onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 pl-1">
          <p className="flex-1 text-isi font-black">📍 Tempat</p>
          {kanan}
        </div>
        <div className="flex min-h-0 flex-1 flex-col divide-y divide-hp-casing/5 overflow-y-auto rounded-kartu bg-kartu ring-1 ring-hp-casing/5">
          {LEGENDA.map(([ikon, nama, ket]) => (
            <div key={nama} className="px-2.5 py-1.5">
              <div className="text-ket font-extrabold">
                {ikon} {nama}
              </div>
              <div className="text-mini font-semibold text-teks-2">{ket}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Peta besar seluruh kampung + legenda (modal; tombol M / ketuk minimap). */
export function PetaBesar() {
  const buka = useGame((s) => s.petaTerbuka);
  const setPeta = useGame((s) => s.setPeta);

  // Tombol M / Esc untuk tutup-buka di PC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useGame.getState();
      if (e.code === 'KeyM' && st.lokasi === 'dunia' && !st.menuTerbuka && !st.hpTerbuka && !st.menuMakan) st.setPeta(!st.petaTerbuka);
      if (e.code === 'Escape' && st.petaTerbuka) st.setPeta(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!buka) return null;

  return (
    <div className="safe-x absolute inset-0 z-40 flex items-center justify-center bg-redup" onPointerDown={() => setPeta(false)}>
      {/* Bingkai bertoken: kartu krem membulat, sama dengan kit Panel */}
      <div className="anim-panel h-[94%] w-[97%] rounded-layar bg-hp-layar p-2.5 text-teks shadow-hp" onPointerDown={(e) => e.stopPropagation()}>
        <IsiPeta kanan={<TombolTutup onTekan={() => setPeta(false)} />} />
      </div>
    </div>
  );
}
