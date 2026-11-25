// Mini-game Isi Bensin Pas (Pertamini) — laju alir & volume: dV/dt = Q(t).
// Tahan tombol untuk menuang. Laju alir Q naik-turun (pompa tangan Pak Jo tidak rata).
// Setelah dilepas, sisa bensin di selang masih mengalir sebentar (Q meluruh eksponensial) — jadi lepas sedikit lebih awal!
// Lewat garis 100% = tumpah.
import { useRef, useState } from 'react';
import { useGame } from '../../game/store';
import { sfxCiprat, sfxIsiBensin, sfxPop } from '../../audio/sfx';
import { LEBAR, TINGGI, kotak, tulis, useLoop, type Selesai } from './alat';

const Q_DASAR = 16; // % per detik
const LURUH = 6; // 1/dtk: seberapa cepat sisa aliran selang berhenti

export function IsiBensin({ selesai }: { selesai: Selesai }) {
  const kanvas = useRef<HTMLCanvasElement>(null);
  const [tuang, setTuang] = useState(false);
  const s = useRef({ isi: Math.min(80, useGame.getState().bensin), q: 0, t: 0, tahan: false, beres: false, sudah: false, bunyi: 0 }).current;

  const akhiri = () => {
    if (s.beres) return;
    s.beres = true;
    // Skor: 100% = sempurna; 60% atau kurang = 0; tumpah = 0
    selesai(s.isi > 100 ? 0 : Math.max(0, Math.min(1, (s.isi - 60) / 37)));
  };

  useLoop(kanvas, (dt, ctx) => {
    s.t += dt;
    if (!s.beres) {
      // Laju alir: saat ditahan berdenyut (1 ± 0,45·sin), saat dilepas meluruh ke 0
      const target = s.tahan ? Q_DASAR * (1 + 0.45 * Math.sin(s.t * 4.2)) : 0;
      s.q = s.tahan ? target : s.q * Math.exp(-LURUH * dt);
      s.isi += s.q * dt;
      s.bunyi -= dt;
      if (s.tahan && s.bunyi <= 0) {
        sfxIsiBensin();
        s.bunyi = 0.9;
      }
      if (s.isi > 100.5) {
        sfxCiprat(true);
        akhiri();
      }
    }

    // ===== Gambar =====
    ctx.fillStyle = '#fff6e5';
    ctx.fillRect(0, 0, LEBAR, TINGGI);
    // Tangki (tampak potong)
    const x = 300;
    const y = 50;
    const w = 200;
    const h = 260;
    kotak(ctx, x, y, w, h, 24, '#ffffff', '#3b2a20');
    const tinggiIsi = (Math.min(110, s.isi) / 100) * (h - 20);
    kotak(ctx, x + 8, y + h - 8 - tinggiIsi, w - 16, tinggiIsi, 14, s.isi > 100 ? '#e9605a' : '#ffb36b');
    // Garis penuh & zona pas
    ctx.fillStyle = 'rgba(76,224,122,0.35)';
    ctx.fillRect(x - 20, y + h - 8 - (h - 20), w + 40, (h - 20) * 0.03);
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 30, y + h - 8 - (h - 20));
    ctx.lineTo(x + w + 30, y + h - 8 - (h - 20));
    ctx.stroke();
    tulis(ctx, 'PENUH', x + w + 70, y + 12, 16, '#c0392b');
    // Corong & aliran
    ctx.fillStyle = '#9aa3ad';
    ctx.beginPath();
    ctx.moveTo(x + 70, 10);
    ctx.lineTo(x + 130, 10);
    ctx.lineTo(x + 108, 48);
    ctx.lineTo(x + 92, 48);
    ctx.fill();
    if (s.q > 0.3) {
      ctx.fillStyle = '#ffb36b';
      ctx.fillRect(x + 100 - Math.min(8, s.q / 3), 48, Math.min(16, (s.q / 3) * 2), y + h - 8 - tinggiIsi - 48);
    }
    tulis(ctx, `${s.isi.toFixed(1)}%`, x + w / 2, y + h + 25, 24);
    tulis(ctx, `Laju alir ${s.q.toFixed(1)} %/dtk`, 120, 60, 17, '#8a5a35');
    tulis(ctx, 'Lepas sebelum garis —', 120, 200, 15, '#8a5a35');
    tulis(ctx, 'sisa di selang masih', 120, 222, 15, '#8a5a35');
    tulis(ctx, 'mengalir sebentar!', 120, 244, 15, '#8a5a35');
  });

  const mulaiTuang = () => {
    if (s.beres) return;
    s.tahan = true;
    s.sudah = true;
    setTuang(true);
  };
  const berhenti = () => {
    s.tahan = false;
    setTuang(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <canvas ref={kanvas} width={LEBAR} height={TINGGI} className="mx-auto block h-auto max-h-[52vh] w-auto max-w-full rounded-2xl" />
      <div className="flex gap-3">
        <button
          onPointerDown={mulaiTuang}
          onPointerUp={berhenti}
          onPointerLeave={berhenti}
          onPointerCancel={berhenti}
          className={`min-h-16 flex-[2] touch-none rounded-2xl font-black text-white shadow-sm ${tuang ? 'translate-y-1 bg-orange-500' : 'bg-orange-400'}`}
        >
          ⛽ Tahan untuk menuang
        </button>
        <button
          onPointerDown={() => {
            if (!s.sudah) return;
            sfxPop();
            akhiri();
          }}
          className="min-h-16 flex-1 rounded-2xl bg-emerald-500 font-black text-white shadow-sm active:scale-[0.98]"
        >
          ✔ Sudah
        </button>
      </div>
    </div>
  );
}
