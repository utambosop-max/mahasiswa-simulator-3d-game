// Mini-game Rebus Mi (pojok dapur kamar) — hukum pendinginan/pemanasan Newton (fisika.ts: newton):
//   T(t) = T_api + (T_awal − T_api) · e^(−k·t)   → suhu naik cepat di awal, lalu melambat.
// Air berhenti naik di 100 °C (mendidih). Masukkan mi SETELAH mendidih, lalu angkat setelah ± 3 "menit".
// (1 detik di mini-game = 1 menit di dunia mi.) Kurva suhu digambar langsung agar terlihat bentuk eksponensialnya.
import { useRef, useState } from 'react';
import { F4, newton } from '../../game/fisika';
import { sfxPop, sfxWajan } from '../../audio/sfx';
import { LEBAR, TINGGI, bulat, kotak, tulis, useLoop, type Selesai } from './alat';

const M = F4.miniFisika.mi;
const T_AWAL = 28;
const BATAS_WAKTU = 16;

type Fase = 'panas' | 'masak' | 'beres';

export function RebusMi({ selesai }: { selesai: Selesai }) {
  const kanvas = useRef<HTMLCanvasElement>(null);
  const [fase, setFase] = useState<Fase>('panas');
  const s = useRef({ t: 0, suhu: T_AWAL, masuk: -1, suhuMasuk: 0, riwayat: [] as number[], catat: 0, gelembung: [] as { x: number; y: number }[], beres: false }).current;

  const akhiri = (lama: number) => {
    if (s.beres) return; // state React belum tentu ter-update di frame berikutnya
    s.beres = true;
    // Mi masuk sebelum mendidih → lembek (−0,4). Lama masak ideal 3 menit.
    const tepat = Math.max(0, 1 - Math.abs(lama - M.detikMasak) / 2);
    const skor = Math.max(0, tepat - (s.suhuMasuk < 99 ? 0.4 : 0));
    setFase('beres');
    selesai(skor);
  };

  useLoop(kanvas, (dt, ctx) => {
    if (!s.beres) {
      s.t += dt;
      // Newton: suhu mendekati suhu api; dibatasi titik didih 100 °C
      s.suhu = Math.min(100, newton(s.suhu, M.suhuApi, M.laju, dt));
      s.catat -= dt;
      if (s.catat <= 0) {
        s.riwayat.push(s.suhu);
        s.catat = 0.2;
      }
      if (s.suhu >= 99.5 && Math.random() < 0.5) s.gelembung.push({ x: 230 + Math.random() * 140, y: 290 });
      if (s.masuk >= 0 && s.t - s.masuk > M.detikMasak + 3) akhiri(s.t - s.masuk); // lupa diangkat
      if (s.masuk < 0 && s.t > BATAS_WAKTU) {
        s.beres = true;
        setFase('beres');
        selesai(0);
      }
    }
    for (const g of s.gelembung) g.y -= dt * 60;
    s.gelembung = s.gelembung.filter((g) => g.y > 200);

    // ===== Gambar =====
    ctx.fillStyle = '#fff6e5';
    ctx.fillRect(0, 0, LEBAR, TINGGI);
    // Kompor & panci
    kotak(ctx, 190, 310, 220, 30, 8, '#5b6170', '#3b2a20');
    ctx.fillStyle = '#4fa8ff';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(220 + i * 40, 306, 8, 6 + Math.sin(s.t * 12 + i) * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    kotak(ctx, 210, 190, 180, 110, 18, '#9aa3ad', '#3b2a20');
    const merah = (s.suhu - T_AWAL) / (100 - T_AWAL);
    kotak(ctx, 220, 200, 160, 90, 12, `rgb(${Math.round(127 + 100 * merah)}, ${Math.round(196 - 60 * merah)}, ${Math.round(240 - 120 * merah)})`);
    for (const g of s.gelembung) bulat(ctx, g.x, g.y, 5, 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0.9)');
    if (s.masuk >= 0) {
      ctx.strokeStyle = '#ffd877';
      ctx.lineWidth = 4;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(240 + i * 22, 230);
        ctx.bezierCurveTo(250 + i * 22, 250, 230 + i * 22, 265, 245 + i * 22, 280);
        ctx.stroke();
      }
    }
    tulis(ctx, `${s.suhu.toFixed(0)} °C`, 300, 160, 30, s.suhu >= 99.5 ? '#c0392b' : '#3b2a20');
    if (s.masuk >= 0) tulis(ctx, `Dimasak ${(s.t - s.masuk).toFixed(1)} menit (pas: ${M.detikMasak})`, 300, 40, 20);

    // Grafik suhu vs waktu
    const gx = 470;
    const gy = 60;
    const gw = 300;
    const gh = 220;
    kotak(ctx, gx, gy, gw, gh, 10, '#ffffff', '#e7c9a0');
    ctx.strokeStyle = 'rgba(192,57,43,0.5)';
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(gx, gy + gh * (1 - 100 / 110));
    ctx.lineTo(gx + gw, gy + gh * (1 - 100 / 110));
    ctx.stroke();
    ctx.setLineDash([]);
    tulis(ctx, '100 °C (mendidih)', gx + gw - 6, gy + gh * (1 - 100 / 110) - 12, 13, '#c0392b', 'right');
    ctx.strokeStyle = '#ff8a3d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    s.riwayat.forEach((v, i) => {
      const x = gx + (i / (BATAS_WAKTU * 5)) * gw;
      const y = gy + gh * (1 - v / 110);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    tulis(ctx, 'Suhu air vs waktu', gx + gw / 2, gy + gh + 18, 14, '#8a5a35');
  });

  return (
    <div className="flex flex-col gap-2">
      <canvas ref={kanvas} width={LEBAR} height={TINGGI} className="mx-auto block h-auto max-h-[52vh] w-auto max-w-full rounded-2xl" />
      <div className="flex gap-3">
        <button
          disabled={fase !== 'panas'}
          onPointerDown={() => {
            if (s.masuk >= 0) return;
            s.masuk = s.t;
            s.suhuMasuk = s.suhu;
            setFase('masak');
            sfxWajan();
          }}
          className="min-h-16 flex-1 rounded-2xl bg-orange-400 font-black text-white shadow-sm active:scale-[0.98] disabled:bg-stone-300 disabled:shadow-none"
        >
          🍜 Masukkan mi
        </button>
        <button
          disabled={fase !== 'masak'}
          onPointerDown={() => {
            sfxPop();
            akhiri(s.t - s.masuk);
          }}
          className="min-h-16 flex-1 rounded-2xl bg-emerald-500 font-black text-white shadow-sm active:scale-[0.98] disabled:bg-stone-300 disabled:shadow-none"
        >
          🥢 Angkat
        </button>
      </div>
    </div>
  );
}
