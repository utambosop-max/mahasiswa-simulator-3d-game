// Mini-game Ujian Praktik SIM (Pos Polisi) — jarak pengereman (fisika.ts: jarakRem):
//   s = v² / (2 · μ · g · efisiensi)
// Motor melaju dengan kecepatan tetap. Tekan REM agar motor BERHENTI tepat sebelum garis putih
// (toleransi ± 1,2 m di belakang garis). Percobaan ke-2 di jalan basah (μ kecil → rem lebih jauh).
import { useRef, useState } from 'react';
import { F4, jarakRem } from '../../game/fisika';
import { sfxPeluit, sfxPop, sfxSalah } from '../../audio/sfx';
import { LEBAR, TINGGI, bulat, kotak, tulis, useLoop, type Selesai } from './alat';

const U = F4.miniFisika.sim;
const G = 9.81;
const SKALA = 15; // px per meter
const X0 = 30;
const GARIS = 46; // m — posisi garis henti
// Kecepatan (m/dtk) & jalan per percobaan: kering, basah, kering-kencang
const SOAL: { v: number; basah: boolean }[] = [
  { v: 9, basah: false },
  { v: 8, basah: true },
  { v: 12, basah: false },
];

type Fase = 'siap' | 'jalan' | 'rem' | 'hasil';

export function UjianSim({ selesai }: { selesai: Selesai }) {
  const kanvas = useRef<HTMLCanvasElement>(null);
  const [ke, setKe] = useState(0);
  const [fase, setFase] = useState<Fase>('siap');
  const s = useRef({ x: 0, v: 0, lulus: 0, pesan: '', t: 0, beres: false }).current;
  const soal = SOAL[ke];
  const mu = soal.basah ? F4.fisika.muBasah : F4.fisika.muKering;

  useLoop(kanvas, (dt, ctx) => {
    s.t += dt;
    if (fase === 'jalan') {
      s.x += s.v * dt;
      if (s.x > GARIS + 8) rem(); // lupa ngerem → tetap dinilai
    }
    if (fase === 'rem') {
      const a = mu * G * U.efisiensiRem;
      s.v = Math.max(0, s.v - a * dt);
      s.x += s.v * dt;
      if (s.v <= 0) nilai();
    }
    if (fase === 'hasil' && s.t > 2.6 && !s.beres) {
      if (ke + 1 >= SOAL.length) {
        s.beres = true;
        selesai(s.lulus / SOAL.length);
      } else {
        setKe(ke + 1);
        setFase('siap');
      }
    }

    // ===== Gambar =====
    ctx.fillStyle = soal.basah ? '#cfd8e3' : '#dff1ff';
    ctx.fillRect(0, 0, LEBAR, TINGGI);
    ctx.fillStyle = soal.basah ? '#6f7683' : '#8a8f99';
    ctx.fillRect(0, 200, LEBAR, 100);
    if (soal.basah) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 40; i++) {
        const x = (i * 97 + s.t * 300) % LEBAR;
        const y = (i * 53 + s.t * 500) % 200;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 4, y + 12);
        ctx.stroke();
      }
    }
    // Zona lulus (hijau) & garis henti (putih)
    ctx.fillStyle = 'rgba(76,224,122,0.45)';
    ctx.fillRect(X0 + (GARIS - U.toleransi) * SKALA, 200, U.toleransi * SKALA, 100);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(X0 + GARIS * SKALA, 200, 6, 100);
    // Penanda jarak tiap 10 m
    for (let m = 0; m <= 50; m += 10) tulis(ctx, `${m} m`, X0 + m * SKALA, 315, 12, '#3b2a20');
    // Motor (moncong di x)
    const mx = X0 + s.x * SKALA;
    kotak(ctx, mx - 46, 222, 46, 22, 8, '#ffb36b', '#3b2a20');
    bulat(ctx, mx - 40, 252, 12, '#3b2a20');
    bulat(ctx, mx - 6, 252, 12, '#3b2a20');
    bulat(ctx, mx - 26, 205, 13, '#f1c08f');
    tulis(ctx, `Ujian ${ke + 1}/${SOAL.length} · ${soal.basah ? '🌧️ Jalan BASAH (μ = ' + mu + ')' : '☀️ Jalan kering (μ = ' + mu + ')'}`, 20, 26, 18, '#3b2a20', 'left');
    tulis(ctx, `Kecepatan ${(s.v * 3.6).toFixed(0)} km/jam`, LEBAR - 20, 26, 18, '#3b2a20', 'right');
    if (fase === 'siap') tulis(ctx, `Motor akan melaju ${(soal.v * 3.6).toFixed(0)} km/jam. Rem supaya berhenti di zona HIJAU!`, LEBAR / 2, 110, 19);
    if (fase === 'hasil') {
      tulis(ctx, s.pesan, LEBAR / 2, 90, 24);
      tulis(ctx, `Jarak rem = v² / (2μg) = ${jarakRem(soal.v, mu, U.efisiensiRem).toFixed(1)} m`, LEBAR / 2, 130, 17, '#8a5a35');
    }
  });

  function rem() {
    if (fase !== 'jalan') return;
    setFase('rem');
  }
  function nilai() {
    const sisa = GARIS - s.x; // positif = berhenti sebelum garis
    const ok = sisa >= 0 && sisa <= U.toleransi;
    if (ok) {
      s.lulus++;
      s.pesan = '✅ Pas di zona hijau! Bagus.';
      sfxPop();
    } else {
      s.pesan = sisa < 0 ? `❌ Lewat garis ${(-sisa).toFixed(1)} m!` : `❌ Berhenti ${sisa.toFixed(1)} m terlalu awal`;
      sfxSalah();
    }
    s.t = 0;
    setFase('hasil');
  }

  const tombol = () => {
    if (fase === 'siap') {
      s.x = 0;
      s.v = soal.v;
      setFase('jalan');
      sfxPeluit();
    } else if (fase === 'jalan') rem();
  };

  return (
    <div className="flex flex-col gap-2">
      <canvas ref={kanvas} width={LEBAR} height={TINGGI} className="mx-auto block h-auto max-h-[52vh] w-auto max-w-full rounded-2xl" />
      <button
        onPointerDown={tombol}
        disabled={fase === 'rem' || fase === 'hasil'}
        className={`min-h-16 rounded-2xl text-xl font-black text-white active:scale-[0.98] disabled:bg-stone-300 disabled:shadow-none ${
          fase === 'jalan' ? 'bg-rose-500 shadow-sm' : 'bg-orange-400 shadow-sm'
        }`}
      >
        {fase === 'jalan' ? '🛑 REM!' : fase === 'siap' ? '▶ Mulai jalan' : '...'}
      </button>
    </div>
  );
}
