// Mini-game Lempar Batu Pantul (kolam taman) — tampak samping.
// Batu dilempar dari ketinggian 0,5 m dengan sudut sedikit ke bawah. Saat menyentuh air:
//   sudut datang = atan(|vy| / vx). Jika < sudutMaks dan vx > kecepatanMin → MEMANTUL:
//   vy_baru = −vy · e (koefisien restitusi), vx_baru = vx · gesek. Selain itu → tenggelam.
// Jadi lemparan landai & kencang memantul paling banyak (sama seperti di dunia nyata).
import { useRef, useState } from 'react';
import { F4 } from '../../game/fisika';
import { sfxCiprat, sfxTendang } from '../../audio/sfx';
import { LEBAR, TINGGI, bar, bulat, osilasi, tulis, useLoop, type Selesai } from './alat';

const B = F4.miniFisika.batu;
const G = 9.81;
const AIR = 250; // y layar permukaan air
const SKALA = 26; // px per meter
const X_AWAL = 60;
const LEMPARAN = 3;

type Fase = 'sudut' | 'tenaga' | 'terbang' | 'jeda';

export function BatuPantul({ selesai }: { selesai: Selesai }) {
  const kanvas = useRef<HTMLCanvasElement>(null);
  const [info, setInfo] = useState('Ketuk untuk mengunci SUDUT (makin landai makin bagus)');
  const s = useRef({
    fase: 'sudut' as Fase,
    t: 0,
    sudut: 0,
    tenaga: 0,
    x: 0,
    y: 0.5,
    vx: 0,
    vy: 0,
    pantul: 0,
    terbaik: 0,
    ke: 0,
    cipratan: [] as { x: number; r: number }[],
    pesan: '',
  }).current;

  useLoop(kanvas, (dt, ctx) => {
    s.t += dt;
    if (s.fase === 'sudut') s.sudut = osilasi(s.t, 2.2) * 35; // 0..35° ke bawah
    if (s.fase === 'tenaga') s.tenaga = osilasi(s.t, 3);
    if (s.fase === 'terbang') {
      s.vy -= G * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.y <= 0) {
        const datang = (Math.atan2(-s.vy, s.vx) * 180) / Math.PI;
        if (datang < B.sudutMaks && s.vx > B.kecepatanMin) {
          s.y = 0;
          s.vy = -s.vy * B.restitusi;
          s.vx *= B.gesek;
          s.pantul++;
          s.cipratan.push({ x: s.x, r: 4 });
          sfxCiprat(false);
        } else {
          s.cipratan.push({ x: s.x, r: 10 });
          sfxCiprat(true);
          s.terbaik = Math.max(s.terbaik, s.pantul);
          s.pesan = s.pantul ? `🪨 ${s.pantul}× pantulan! (sudut datang terakhir ${datang.toFixed(0)}°)` : `💦 Plung! Langsung tenggelam (sudut ${datang.toFixed(0)}° terlalu curam)`;
          s.fase = 'jeda';
          s.t = 0;
        }
      }
    }
    if (s.fase === 'jeda' && s.t > 1.6) {
      s.ke++;
      if (s.ke >= LEMPARAN) {
        s.fase = 'sudut';
        s.t = -999;
        selesai(Math.min(1, s.terbaik / B.target));
        return;
      }
      s.fase = 'sudut';
      s.pantul = 0;
      s.cipratan = [];
      setInfo(`Lemparan ${s.ke + 1}/${LEMPARAN} — ketuk untuk mengunci SUDUT`);
    }
    for (const c of s.cipratan) c.r += dt * 30;

    // ===== Gambar =====
    ctx.fillStyle = '#dff1ff';
    ctx.fillRect(0, 0, LEBAR, AIR);
    ctx.fillStyle = '#7fc4f0';
    ctx.fillRect(0, AIR, LEBAR, TINGGI - AIR);
    ctx.fillStyle = '#a6d785';
    ctx.fillRect(0, AIR - 6, X_AWAL + 10, TINGGI);
    for (const c of s.cipratan) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 1 - c.r / 60)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(X_AWAL + c.x * SKALA, AIR, c.r, c.r * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Garis bantu arah lemparan
    if (s.fase === 'sudut' || s.fase === 'tenaga') {
      const a = (s.sudut * Math.PI) / 180;
      ctx.strokeStyle = '#e9605a';
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(X_AWAL, AIR - 0.5 * SKALA);
      ctx.lineTo(X_AWAL + Math.cos(a) * 140, AIR - 0.5 * SKALA + Math.sin(a) * 140);
      ctx.stroke();
      ctx.setLineDash([]);
      tulis(ctx, `Sudut ${s.sudut.toFixed(0)}° ke bawah`, 200, 40, 18);
    }
    if (s.fase === 'tenaga') bar(ctx, 520, 30, 240, 22, s.tenaga, '#ff8a3d', 'Tenaga');
    if (s.fase === 'terbang' || s.fase === 'jeda') bulat(ctx, X_AWAL + s.x * SKALA, AIR - s.y * SKALA, 7, '#9aa3ad');
    tulis(ctx, `Pantulan: ${s.pantul}  ·  Terbaik: ${s.terbaik}`, LEBAR - 20, 330, 18, '#ffffff', 'right');
    if (s.fase === 'jeda') tulis(ctx, s.pesan, LEBAR / 2, 110, 22);
  });

  const ketuk = () => {
    if (s.fase === 'sudut') {
      s.fase = 'tenaga';
      s.t = 0;
      setInfo('Ketuk untuk mengunci TENAGA (makin kencang makin jauh)');
    } else if (s.fase === 'tenaga') {
      const v = 6 + 10 * s.tenaga;
      const a = (s.sudut * Math.PI) / 180;
      Object.assign(s, { fase: 'terbang', x: 0, y: 0.5, vx: v * Math.cos(a), vy: -v * Math.sin(a), pantul: 0, cipratan: [] });
      sfxTendang();
      setInfo('Wuuush...');
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <p className="text-center text-sm font-extrabold">{info}</p>
      <canvas ref={kanvas} width={LEBAR} height={TINGGI} onPointerDown={ketuk} className="mx-auto block h-auto max-h-[52vh] w-auto max-w-full touch-none rounded-2xl" />
    </div>
  );
}
