// Panel ojol di atas layar: order ke-berapa, tujuan, sisa waktu, penghasilan + panah penunjuk arah.
import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { FITUR, formatRupiah } from '../game/sim';
import { playerPos } from '../game/playerPos';
import { sfxPop } from '../audio/sfx';

export function OjolHUD() {
  const o = useGame((s) => s.ojol);
  const motor = useGame((s) => s.naikMotor);
  const lokasi = useGame((s) => s.lokasi);
  const panah = useRef<HTMLSpanElement>(null);
  const waktu = useRef<HTMLSpanElement>(null);
  const jarak = useRef<HTMLSpanElement>(null);

  // Panah & waktu diperbarui langsung lewat DOM tiap frame (tanpa re-render React)
  useEffect(() => {
    let id = 0;
    const loop = () => {
      const st = useGame.getState().ojol;
      if (st) {
        const t = st.tahap === 'jemput' ? st.order.jemput : st.order.antar;
        const dx = t.x - playerPos.x;
        const dz = t.z - playerPos.z;
        // Proyeksi ke layar mengikuti sudut kamera: kanan = (cos, −sin), bawah = (sin, cos)
        const yaw = useGame.getState().kameraSudut;
        const sx = dx * Math.cos(yaw) - dz * Math.sin(yaw);
        const sy = dx * Math.sin(yaw) + dz * Math.cos(yaw);
        if (panah.current) panah.current.style.transform = `rotate(${Math.atan2(sy, sx)}rad)`;
        if (jarak.current) jarak.current.textContent = `${Math.round(Math.hypot(dx, dz))} m`;
        const sisa = Math.max(0, Math.ceil((st.batas - performance.now()) / 1000));
        if (waktu.current) {
          waktu.current.textContent = `${sisa}`;
          waktu.current.style.color = sisa < 15 ? '#e11d48' : '';
        }
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  if (!o) return null;
  const t = o.tahap === 'jemput' ? o.order.jemput : o.order.antar;
  return (
    <div className="safe-x pointer-events-none absolute inset-x-0 top-[4.4rem] z-20 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-emerald-50/95 px-3 py-1.5 text-teks shadow-sm">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-2xl text-white">
          <span ref={panah} className="inline-block">
            ➤
          </span>
        </span>
        <div className="text-sm leading-tight font-extrabold">
          <div>
            📦 Order {o.ke + 1}/{FITUR.ojol.jumlahOrder} · {o.tahap === 'jemput' ? '🙋 Jemput di' : '🏁 Antar ke'} {t.nama}
          </div>
          <div className="opacity-80">
            📍 <span ref={jarak}>…</span> · ⏱️ <span ref={waktu}>…</span> dtk · 💰 {formatRupiah(o.order.bayar)} · total {formatRupiah(o.total)}
            {(!motor || lokasi !== 'dunia') && <span className="ml-1 text-rose-600">· 🛵 naik motor dulu!</span>}
          </div>
        </div>
        <button
          onPointerDown={() => {
            sfxPop();
            useGame.getState().akhiriOjol();
          }}
          className="min-h-14 rounded-tombol bg-netral px-3 font-extrabold text-teks active:scale-[0.98]"
        >
          Selesai
        </button>
      </div>
    </div>
  );
}
