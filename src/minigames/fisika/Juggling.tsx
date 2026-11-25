// Mini-game Juggling Bola (lapangan futsal) — gerak jatuh bebas: v' = −g, y' = v.
// Ketuk saat bola turun di zona kaki (0,15–0,9 m). Makin dekat ke 0,45 m (titik pas), tendangan makin lurus.
// Tendangan meleset ke samping memberi kecepatan horizontal; bola memantul di "dinding" kiri-kanan.
import { useRef, useState } from 'react';
import { F4 } from '../../game/fisika';
import { sfxTendang } from '../../audio/sfx';
import { LEBAR, TINGGI, bulat, kotak, tulis, useLoop, type Selesai } from './alat';

const J = F4.miniFisika.juggling;
const SKALA = 70; // px per meter
const TANAH = 320;
const PAS = 0.45;

export function Juggling({ selesai }: { selesai: Selesai }) {
  const kanvas = useRef<HTMLCanvasElement>(null);
  const [mulai, setMulai] = useState(false);
  const s = useRef({ x: 0, y: 1, vx: 0, vy: 0, t: 0, tendangan: 0, beres: false, pesan: '', pesanT: 0, kaki: 0 }).current;

  const akhiri = () => {
    if (s.beres) return;
    s.beres = true;
    selesai(Math.min(1, s.tendangan / J.target));
  };

  useLoop(kanvas, (dt, ctx) => {
    if (mulai && !s.beres) {
      s.t += dt;
      s.vy -= J.gravitasi * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      // Dinding kiri-kanan ±4,5 m (memantul, kehilangan sedikit energi)
      if (Math.abs(s.x) > 4.5) {
        s.x = Math.sign(s.x) * 4.5;
        s.vx = -s.vx * 0.7;
      }
      if (s.y <= 0) {
        s.y = 0;
        s.pesan = '😵 Bola jatuh!';
        akhiri();
      }
      if (s.t >= J.detik) {
        s.pesan = '⏱️ Waktu habis!';
        akhiri();
      }
    }
    s.pesanT -= dt;
    s.kaki = Math.max(0, s.kaki - dt * 4);

    // ===== Gambar =====
    ctx.fillStyle = '#cfeec0';
    ctx.fillRect(0, 0, LEBAR, TINGGI);
    ctx.fillStyle = '#7cc66a';
    ctx.fillRect(0, TANAH, LEBAR, TINGGI - TANAH);
    const cx = LEBAR / 2;
    // Zona kaki (pas = hijau)
    ctx.fillStyle = 'rgba(255,216,119,0.35)';
    ctx.fillRect(0, TANAH - 0.9 * SKALA, LEBAR, (0.9 - 0.15) * SKALA);
    ctx.fillStyle = 'rgba(76,224,122,0.35)';
    ctx.fillRect(0, TANAH - (PAS + 0.12) * SKALA, LEBAR, 0.24 * SKALA);
    // Pemain mengikuti bola (badan chibi di belakang bola)
    const bx = cx + s.x * SKALA;
    kotak(ctx, bx - 28, TANAH - 150, 56, 80, 18, '#7cc6a4', '#3b2a20');
    bulat(ctx, bx, TANAH - 175, 34, '#f1c08f');
    ctx.strokeStyle = '#3b2a20';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx + 10, TANAH - 72);
    ctx.lineTo(bx + 30 + s.kaki * 20, TANAH - 10 - s.kaki * 40);
    ctx.stroke();
    // Bola
    bulat(ctx, bx, TANAH - s.y * SKALA - 14, 14, '#ffffff');
    tulis(ctx, `Juggling: ${s.tendangan}  (target ${J.target})`, 20, 26, 20, '#3b2a20', 'left');
    tulis(ctx, `⏱️ ${Math.max(0, J.detik - s.t).toFixed(1)}`, LEBAR - 20, 26, 20, '#3b2a20', 'right');
    tulis(ctx, `Tinggi bola ${s.y.toFixed(2)} m · kecepatan ${s.vy.toFixed(1)} m/dtk`, LEBAR - 20, 56, 14, '#2f6b3a', 'right');
    if (!mulai) tulis(ctx, 'Ketuk untuk mulai, lalu ketuk lagi saat bola turun ke zona HIJAU', cx, 120, 20);
    if (s.pesanT > 0 || s.beres) tulis(ctx, s.pesan, cx, 90, 26);
  });

  const ketuk = () => {
    if (!mulai) {
      // Ketukan pertama: bola dilempar ke atas dulu (± 1,5 dtk sampai turun ke kaki)
      s.y = 1;
      s.vy = 4.5;
      setMulai(true);
      sfxTendang();
      return;
    }
    if (s.beres) return;
    if (s.vy < 0 && s.y > 0.15 && s.y < 0.9) {
      const meleset = s.y - PAS; // + = terlalu cepat menendang, − = terlambat
      s.vy = 5.6 + Math.random() * 0.6;
      s.vx += meleset * 5 + (Math.random() - 0.5) * 0.4;
      s.tendangan++;
      s.kaki = 1;
      s.pesan = Math.abs(meleset) < 0.12 ? '✨ Pas!' : meleset > 0 ? 'Kecepetan' : 'Telat dikit';
      s.pesanT = 0.6;
      sfxTendang();
    } else {
      s.pesan = s.vy > 0 ? 'Tunggu bolanya turun!' : 'Belum sampai kaki!';
      s.pesanT = 0.6;
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <canvas ref={kanvas} width={LEBAR} height={TINGGI} onPointerDown={ketuk} className="mx-auto block h-auto max-h-[52vh] w-auto max-w-full touch-none rounded-2xl" />
    </div>
  );
}
