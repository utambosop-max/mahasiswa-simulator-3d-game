// Mini-game Setem Gitar (kamar) — frekuensi senar (hukum Mersenne): f = (1 / 2L) · √(T / μ)
//   L = panjang senar (m), T = tegangan (N), μ = massa per meter (kg/m).
// Pemain memutar "kunci setem" (= tegangan T). Petik → terdengar nada acuan + nada senar bersamaan;
// selisihnya terdengar sebagai "beat" (keras-pelan) dengan frekuensi |f − f₀| Hz. Beat makin lambat = makin pas.
// Ukuran ketepatan: cent = 1200 · log₂(f / f₀)  (100 cent = 1 semitone).
import { useRef, useState } from 'react';
import { F4 } from '../../game/fisika';
import { sfxDuaSenar, sfxPop } from '../../audio/sfx';
import { LEBAR, TINGGI, bulat, kotak, tulis, useLoop, type Selesai } from './alat';

const S = F4.miniFisika.gitar;
const SENAR = S.senar as [string, number][];
const frekuensi = (T: number) => (1 / (2 * S.panjang)) * Math.sqrt(T / S.massaPerMeter);
/** Tegangan yang menghasilkan frekuensi f: T = μ · (2Lf)² */
const teganganUntuk = (f: number) => S.massaPerMeter * (2 * S.panjang * f) ** 2;

export function SetemGitar({ selesai }: { selesai: Selesai }) {
  const kanvas = useRef<HTMLCanvasElement>(null);
  const [ke, setKe] = useState(0);
  const awal = () => (0.7 + Math.random() * 0.25) * (Math.random() < 0.5 ? 1 : 1.5);
  const [faktor, setFaktor] = useState(awal); // T / T₀ (1 = pas)
  const skor = useRef<number[]>([]);
  const getar = useRef(0);

  const [nama, f0] = SENAR[ke];
  const T0 = teganganUntuk(f0);
  const T = T0 * faktor;
  const f = frekuensi(T);
  const cent = 1200 * Math.log2(f / f0);

  useLoop(kanvas, (dt, ctx) => {
    getar.current = Math.max(0, getar.current - dt);
    ctx.fillStyle = '#fff6e5';
    ctx.fillRect(0, 0, LEBAR, TINGGI);
    // Leher gitar & senar bergetar (amplitudo meluruh)
    kotak(ctx, 40, 40, 720, 70, 14, '#c48d55', '#3b2a20');
    for (let i = 0; i < SENAR.length; i++) {
      const y = 58 + i * 17;
      const aktif = i === ke;
      ctx.strokeStyle = aktif ? '#ffd877' : '#e6d3b3';
      ctx.lineWidth = aktif ? 3 : 2;
      ctx.beginPath();
      for (let x = 50; x <= 750; x += 10) {
        const amp = aktif ? getar.current * 6 * Math.sin(((x - 50) / 700) * Math.PI) : 0;
        const yy = y + amp * Math.sin(performance.now() / 18 + x * 0.05);
        if (x === 50) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      tulis(ctx, SENAR[i][0], 24, y, 15);
    }
    // Tuner: jarum −50..+50 cent
    const cx = LEBAR / 2;
    const cy = 345;
    const r = 135;
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#ead2ad';
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.strokeStyle = '#4ce07a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 1.47, Math.PI * 1.53);
    ctx.stroke();
    const sudut = Math.PI * 1.5 + (Math.max(-50, Math.min(50, cent)) / 50) * Math.PI * 0.35;
    ctx.strokeStyle = Math.abs(cent) < 5 ? '#2f8a4e' : '#c0392b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sudut) * (r - 10), cy + Math.sin(sudut) * (r - 10));
    ctx.stroke();
    bulat(ctx, cx, cy, 10, '#3b2a20');
    tulis(ctx, `Senar ${nama}: ${f.toFixed(1)} Hz  (target ${f0} Hz)`, cx, 138, 22);
    tulis(ctx, `${cent > 0 ? '+' : ''}${cent.toFixed(0)} cent · beat ${Math.abs(f - f0).toFixed(1)}×/dtk · tegangan ${T.toFixed(1)} N`, cx, 168, 16, '#8a5a35');
    tulis(ctx, '♭ terlalu kendor', cx - 240, 300, 14, '#8a5a35');
    tulis(ctx, 'terlalu kencang ♯', cx + 240, 300, 14, '#8a5a35');
  });

  const kunci = () => {
    skor.current.push(Math.max(0, 1 - Math.abs(cent) / 40));
    sfxPop();
    if (ke + 1 >= SENAR.length) selesai(skor.current.reduce((a, b) => a + b, 0) / SENAR.length);
    else {
      setKe(ke + 1);
      setFaktor(awal());
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <canvas ref={kanvas} width={LEBAR} height={TINGGI} className="mx-auto block h-auto max-h-[52vh] w-auto max-w-full rounded-2xl" />
      <label className="flex items-center gap-3 text-sm font-extrabold">
        🔧 Kunci setem
        <input
          type="range"
          min={0.55}
          max={1.6}
          step={0.002}
          value={faktor}
          onChange={(e) => setFaktor(Number(e.target.value))}
          className="h-10 flex-1 accent-orange-500"
          aria-label="Tegangan senar"
        />
      </label>
      <div className="flex gap-3">
        <button
          onPointerDown={() => {
            getar.current = 1.6;
            sfxDuaSenar(f0, f);
          }}
          className="min-h-14 flex-1 rounded-2xl bg-sky-400 font-black text-white shadow-sm active:scale-[0.98]"
        >
          🎵 Petik & dengarkan
        </button>
        <button onPointerDown={kunci} className="min-h-14 flex-1 rounded-2xl bg-orange-400 font-black text-white shadow-sm active:scale-[0.98]">
          ✔ Sudah pas ({ke + 1}/{SENAR.length})
        </button>
      </div>
    </div>
  );
}
