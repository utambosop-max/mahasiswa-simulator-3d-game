// Mini-game Angkat Beban (GOR) — menyeimbangkan barbel seperti pendulum terbalik.
// Persamaan gerak sudut θ (rad):  θ'' = labil·θ − redaman·θ' + dorongan·u + gangguan
//   labil > 0 → makin miring makin cepat jatuh (tidak stabil, seperti tongkat berdiri di telapak tangan)
//   u = −1 (tombol kiri) / +1 (tombol kanan) dari pemain; gangguan = hentakan acak (otot gemetar).
// Diintegrasikan dengan Euler semi-implisit (ω dulu, lalu θ) agar stabil.
import { useEffect, useRef, useState } from 'react';
import { F4 } from '../../game/fisika';
import { LEBAR, TINGGI, bar, bulat, kotak, tulis, useLoop, type Selesai } from './alat';

const B = F4.miniFisika.beban;
const JATUH = 0.75; // rad: lewat dari ini barbel "goyah parah" → diulang dari tegak

export function AngkatBeban({ selesai }: { selesai: Selesai }) {
  const kanvas = useRef<HTMLCanvasElement>(null);
  const [mulai, setMulai] = useState(false);
  const s = useRef({ th: 0.05, om: 0, u: 0, t: 0, stabil: 0, gangguan: 0, sisaGangguan: 0, jedaGangguan: 1, jatuh: 0, beres: false }).current;

  // Keyboard: panah kiri/kanan
  useEffect(() => {
    const turun = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') s.u = -1;
      if (e.key === 'ArrowRight') s.u = 1;
    };
    const naik = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') s.u = 0;
    };
    window.addEventListener('keydown', turun);
    window.addEventListener('keyup', naik);
    return () => {
      window.removeEventListener('keydown', turun);
      window.removeEventListener('keyup', naik);
    };
  }, [s]);

  useLoop(kanvas, (dt, ctx) => {
    if (mulai && !s.beres) {
      s.t += dt;
      // Hentakan acak tiap 0,6–1,4 dtk selama 0,4 dtk
      s.jedaGangguan -= dt;
      if (s.jedaGangguan <= 0) {
        s.gangguan = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2.5);
        s.sisaGangguan = 0.4;
        s.jedaGangguan = 0.6 + Math.random() * 0.8;
      }
      s.sisaGangguan -= dt;
      const ganggu = s.sisaGangguan > 0 ? s.gangguan : 0;
      const alfa = B.labil * s.th - B.redaman * s.om + B.dorongan * s.u + ganggu;
      s.om += alfa * dt;
      s.th += s.om * dt;
      if (Math.abs(s.th) < B.batasMiring) s.stabil += dt;
      if (Math.abs(s.th) > JATUH) {
        s.th = 0.05 * Math.sign(s.th);
        s.om = 0;
        s.jatuh = 0.8;
      }
      if (s.t >= B.detik) {
        s.beres = true;
        selesai(Math.min(1, s.stabil / (B.detik * 0.85)));
      }
    }
    s.jatuh = Math.max(0, s.jatuh - dt);

    // ===== Gambar =====
    ctx.fillStyle = '#ffe9dc';
    ctx.fillRect(0, 0, LEBAR, TINGGI);
    ctx.fillStyle = '#e8c49a';
    ctx.fillRect(0, 300, LEBAR, 60);
    const cx = LEBAR / 2;
    // Atlet chibi
    kotak(ctx, cx - 30, 190, 60, 90, 20, '#ff7a59', '#3b2a20');
    bulat(ctx, cx, 165, 38, '#f1c08f');
    bulat(ctx, cx - 12, 160, 4, '#3b2a20');
    bulat(ctx, cx + 12, 160, 4, '#3b2a20');
    // Barbel dimiringkan θ
    ctx.save();
    ctx.translate(cx, 110);
    ctx.rotate(s.th);
    ctx.fillStyle = '#9aa3ad';
    ctx.fillRect(-190, -5, 380, 10);
    for (const sx of [-1, 1]) {
      kotak(ctx, sx * 165 - 14, -45, 28, 90, 8, '#2f3440', '#3b2a20');
      kotak(ctx, sx * 140 - 10, -32, 20, 64, 6, '#5b6170', '#3b2a20');
    }
    ctx.restore();
    // Tangan ke barbel
    ctx.strokeStyle = '#f1c08f';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * 26, 205);
      ctx.lineTo(cx + sx * 70 * Math.cos(s.th), 110 + sx * 70 * Math.sin(s.th));
      ctx.stroke();
    }
    // Indikator kemiringan
    const stabil = Math.abs(s.th) < B.batasMiring;
    tulis(ctx, `Miring: ${Math.round((s.th * 180) / Math.PI)}°`, 20, 24, 18, stabil ? '#2f8a4e' : '#c0392b', 'left');
    tulis(ctx, `Waktu: ${Math.max(0, B.detik - s.t).toFixed(1)} dtk`, LEBAR - 20, 24, 18, '#3b2a20', 'right');
    bar(ctx, 20, 60, 200, 20, Math.min(1, s.stabil / (B.detik * 0.85)), '#4ce07a', 'Stabil');
    if (s.jatuh > 0) tulis(ctx, '😵 Goyah! Ulang dari tegak', cx, 330, 24, '#c0392b');
    if (!mulai) tulis(ctx, 'Tahan barbel tetap DATAR — tekan ◀ / ▶ melawan arah miring', cx, 330, 20);
  });

  const tombol = (u: number, label: string) => (
    <button
      onPointerDown={() => {
        if (!mulai) setMulai(true);
        s.u = u;
      }}
      onPointerUp={() => (s.u = 0)}
      onPointerLeave={() => (s.u = 0)}
      onPointerCancel={() => (s.u = 0)}
      className="min-h-16 flex-1 touch-none rounded-2xl bg-orange-400 text-2xl font-black text-white shadow-sm active:scale-[0.98]"
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <canvas ref={kanvas} width={LEBAR} height={TINGGI} className="mx-auto block h-auto max-h-[52vh] w-auto max-w-full rounded-2xl" />
      <div className="flex gap-3">
        {tombol(-1, '◀ Kiri')}
        {tombol(1, 'Kanan ▶')}
      </div>
    </div>
  );
}
