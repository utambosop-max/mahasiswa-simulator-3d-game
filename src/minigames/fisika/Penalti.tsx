// Mini-game Adu Penalti (GOR) — lintasan parabola (fisika.ts: proyektil).
// 1) Ketuk titik di gawang (arah & tinggi)  2) Ketuk lagi untuk mengunci tenaga.
// Sudut tendangan dihitung agar bola dengan tenaga IDEAL tepat ke titik bidikan. Tenaga meleset →
// kecepatan beda → tinggi bola di garis gawang ikut berubah (bisa melambung di atas mistar!).
import { useRef, useState } from 'react';
import { F4, proyektil } from '../../game/fisika';
import { sfxPeluit, sfxTendang } from '../../audio/sfx';
import { LEBAR, TINGGI, bar, bulat, clamp, kotak, osilasi, titikKetuk, tulis, useLoop, type Selesai } from './alat';

const P = F4.miniFisika.penalti;
// Gawang tampak depan: 7,32 m → 480 px
const SKALA = 480 / P.lebarGawang;
const X0 = LEBAR / 2;
const TANAH = 290;
const px = (m: number) => X0 + m * SKALA;
const py = (m: number) => TANAH - m * SKALA;

/** Cari sudut elevasi agar bola berkecepatan v mencapai tinggi `y` di jarak `d` (pencarian biner). */
function sudutUntuk(v: number, d: number, y: number): number {
  let lo = 0;
  let hi = 0.6;
  for (let i = 0; i < 30; i++) {
    const th = (lo + hi) / 2;
    const t = d / (v * Math.cos(th));
    if (proyektil(v, th, t).y < y) lo = th;
    else hi = th;
  }
  return (lo + hi) / 2;
}

type Fase = 'bidik' | 'tenaga' | 'terbang' | 'hasil';

export function Penalti({ selesai }: { selesai: Selesai }) {
  const kanvas = useRef<HTMLCanvasElement>(null);
  const [info, setInfo] = useState(`Tembakan 1/${P.tembakan} — ketuk titik di gawang`);
  const s = useRef({
    fase: 'bidik' as Fase,
    t: 0,
    ke: 0,
    gol: 0,
    bidik: { x: 0, y: 1 },
    tenaga: 0.5,
    akhir: { x: 0, y: 0 },
    kiper: 0,
    kiperTujuan: 0,
    terbang: 0,
    pesan: '',
  }).current;

  const tembak = () => {
    // Kecepatan dari tenaga: ideal di tengah bar (0,5)
    const v = P.vIdeal * (0.8 + 0.4 * s.tenaga);
    const th = sudutUntuk(P.vIdeal, P.jarak, s.bidik.y);
    const t = P.jarak / (v * Math.cos(th));
    const meleset = (Math.random() - 0.5) * 0.6 * Math.abs(s.tenaga - 0.5) * 2;
    s.akhir = { x: s.bidik.x + meleset, y: proyektil(v, th, t).y };
    s.kiperTujuan = [-2.3, 0, 2.3][Math.floor(Math.random() * 3)];
    s.fase = 'terbang';
    s.terbang = 0;
    sfxTendang();
  };

  const nilai = () => {
    const { x, y } = s.akhir;
    const masuk = Math.abs(x) < P.lebarGawang / 2 - 0.1 && y > 0.05 && y < P.tinggiGawang - 0.1;
    const jangkau = s.kiperTujuan === 0 ? 2.2 : 1.9;
    const ditangkap = Math.abs(x - s.kiperTujuan) < 1.05 && y < jangkau;
    s.ke++;
    if (masuk && !ditangkap) {
      s.gol++;
      s.pesan = '⚽ GOOOL!';
      sfxPeluit();
    } else s.pesan = !masuk ? (y >= P.tinggiGawang - 0.1 ? '🚀 Melambung di atas mistar!' : '↔️ Melebar!') : '🧤 Ditepis kiper!';
    s.fase = 'hasil';
    s.t = 0;
  };

  useLoop(kanvas, (dt, ctx) => {
    s.t += dt;
    if (s.fase === 'terbang') {
      s.terbang += dt / 0.7;
      s.kiper += (s.kiperTujuan - s.kiper) * Math.min(1, dt * 5);
      if (s.terbang >= 1) nilai();
    }
    if (s.fase === 'hasil' && s.t > 1.3) {
      if (s.ke >= P.tembakan) {
        s.fase = 'bidik';
        s.t = -999;
        selesai(s.gol / P.tembakan);
        return;
      }
      s.fase = 'bidik';
      s.kiper = 0;
      setInfo(`Tembakan ${s.ke + 1}/${P.tembakan} — ketuk titik di gawang`);
    }

    // ===== Gambar =====
    ctx.fillStyle = '#bfe3a5';
    ctx.fillRect(0, 0, LEBAR, TINGGI);
    ctx.fillStyle = '#9ccf7d';
    ctx.fillRect(0, TANAH, LEBAR, TINGGI - TANAH);
    // Jaring & tiang gawang
    kotak(ctx, px(-P.lebarGawang / 2), py(P.tinggiGawang), P.lebarGawang * SKALA, P.tinggiGawang * SKALA, 4, 'rgba(255,255,255,0.35)');
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 12; i++) {
      const x = px(-P.lebarGawang / 2) + i * 40;
      ctx.beginPath();
      ctx.moveTo(x, py(P.tinggiGawang));
      ctx.lineTo(x, TANAH);
      ctx.stroke();
    }
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(px(-P.lebarGawang / 2), TANAH);
    ctx.lineTo(px(-P.lebarGawang / 2), py(P.tinggiGawang));
    ctx.lineTo(px(P.lebarGawang / 2), py(P.tinggiGawang));
    ctx.lineTo(px(P.lebarGawang / 2), TANAH);
    ctx.stroke();
    // Kiper (chibi sederhana)
    const kx = px(s.kiper);
    const miring = (s.kiper / 2.3) * 0.7;
    ctx.save();
    ctx.translate(kx, TANAH);
    ctx.rotate(miring);
    kotak(ctx, -22, -105, 44, 70, 16, '#ff7a59', '#3b2a20');
    bulat(ctx, 0, -125, 26, '#f1c08f');
    kotak(ctx, -60, -100, 30, 14, 7, '#ffd877', '#3b2a20');
    kotak(ctx, 30, -100, 30, 14, 7, '#ffd877', '#3b2a20');
    ctx.restore();
    // Titik bidikan
    if (s.fase !== 'bidik') {
      ctx.strokeStyle = '#e9605a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px(s.bidik.x), py(s.bidik.y), 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Bola: dari titik penalti (bawah layar, besar) ke titik akhir (kecil)
    if (s.fase === 'terbang' || s.fase === 'hasil') {
      const k = Math.min(1, s.terbang);
      const bx = X0 + (px(s.akhir.x) - X0) * k;
      const by = 345 + (py(s.akhir.y) - 345) * k - Math.sin(k * Math.PI) * 30;
      bulat(ctx, bx, by, 26 - 16 * k, '#ffffff');
    } else bulat(ctx, X0, 335, 24, '#ffffff');
    // UI
    tulis(ctx, `Gol: ${s.gol}  ·  Tembakan: ${Math.min(s.ke + (s.fase === 'bidik' ? 1 : 0), P.tembakan)}/${P.tembakan}`, 20, 22, 18, '#3b2a20', 'left');
    if (s.fase === 'tenaga') {
      s.tenaga = osilasi(s.t, 3.2);
      bar(ctx, 560, 320, 220, 24, s.tenaga, Math.abs(s.tenaga - 0.5) < 0.12 ? '#4ce07a' : '#ff8a3d', 'Tenaga (pas di tengah!)');
      ctx.fillStyle = '#3b2a20';
      ctx.fillRect(560 + 110 - 1, 316, 3, 32);
    }
    if (s.fase === 'hasil') tulis(ctx, s.pesan, X0, 60, 34, '#3b2a20');
  });

  const ketuk = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (s.fase === 'bidik') {
      const { x, y } = titikKetuk(e);
      s.bidik = { x: clamp((x - X0) / SKALA, -P.lebarGawang / 2 - 0.5, P.lebarGawang / 2 + 0.5), y: clamp((TANAH - y) / SKALA, 0.2, P.tinggiGawang + 0.6) };
      s.fase = 'tenaga';
      s.t = 0;
      setInfo('Ketuk lagi saat bar tenaga di TENGAH');
    } else if (s.fase === 'tenaga') {
      tembak();
      setInfo('...');
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <p className="text-center text-sm font-extrabold">{info}</p>
      <canvas ref={kanvas} width={LEBAR} height={TINGGI} onPointerDown={ketuk} className="mx-auto block h-auto max-h-[52vh] w-auto max-w-full touch-none rounded-2xl" />
    </div>
  );
}
