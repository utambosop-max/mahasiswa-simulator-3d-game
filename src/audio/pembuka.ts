// Musik & SFX animasi pembuka — 100% sintetis (Web Audio API), lihat skill procedural-sfx-synth.
// Memakai AudioContext sendiri agar bisa dihentikan total (close) saat pembuka dilewati/selesai.
// Mengikuti tombol Suara di Pengaturan (isMuted dari sfx.ts).
import { isMuted } from './sfx';

type Musik = 'b1' | 'b2' | 'b3' | 'gantung' | 'diam';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musikGain: GainNode | null = null;
let noise: AudioBuffer | null = null;
let timer: number | null = null;
let mesin: { gain: GainNode; osc: OscillatorNode; src: AudioBufferSourceNode } | null = null;

const VOLUME = 0.5;
const BEAT = 60 / 92; // tempo 92 BPM

// Nada (Hz) — tangga pentatonik C (lihat skill §3) + bas
const N = { G4: 392, A4: 440, C5: 523, D5: 587, E5: 659, G5: 784, A5: 880, C6: 1047, D6: 1175, E6: 1319, G6: 1568 };
const BAS = { C: 131, A: 110, F: 87, G: 98 };

type Not = [ketuk: number, frek: number, lama: number];
// Bagian 1: pelan, hangat, sedikit rindu (16 ketuk = 4 birama)
const B1: Not[] = [
  [0, N.E5, 1.5], [1.5, N.D5, 0.5], [2, N.C5, 1], [3, N.G4, 1],
  [4, N.A4, 1.5], [5.5, N.C5, 0.5], [6, N.E5, 2],
  [8, N.D5, 1], [9, N.C5, 1], [10, N.A4, 1], [11, N.G4, 1],
  [12, N.A4, 1], [13, N.C5, 1], [14, N.D5, 2],
];
// Bagian 2: ritme perjalanan
const B2: Not[] = [
  [0, N.G5, 0.5], [0.5, N.E5, 0.5], [1, N.D5, 0.5], [1.5, N.E5, 0.5], [2, N.G5, 1], [3, N.A5, 0.5], [3.5, N.G5, 0.5],
  [4, N.E5, 1], [5, N.D5, 0.5], [5.5, N.C5, 0.5], [6, N.D5, 1], [7, N.E5, 1],
];
// Bagian 3: ceria, tiba di kota
const B3: Not[] = [
  [0, N.C6, 0.5], [0.5, N.A5, 0.5], [1, N.G5, 1], [2, N.E5, 0.5], [2.5, N.G5, 0.5], [3, N.A5, 1],
  [4, N.C6, 1], [5, N.D6, 1], [6, N.E6, 2],
  [8, N.D6, 1], [9, N.C6, 1], [10, N.A5, 1], [11, N.G5, 1],
  [12, N.A5, 1], [13, N.C6, 1], [14, N.C6, 2],
];
const BAS_B1 = [BAS.C, BAS.A, BAS.F, BAS.G];

let bagian: Musik = 'diam';
let ketukBerikut = 0; // ketuk ke-n dalam bagian
let waktuMulai = 0; // waktu AudioContext saat ketuk 0

function siapkan(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = isMuted() ? 0 : VOLUME;
      master.connect(ctx.destination);
      musikGain = ctx.createGain();
      musikGain.gain.value = 0.32;
      musikGain.connect(master);
      // Noise putih 1 detik, dibuat sekali lalu dipakai ulang
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null; // tanpa audio, pembuka tetap jalan
  }
}

function nada(f: number, at: number, dur: number, type: OscillatorType, vol: number, out?: AudioNode, slideTo?: number) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out ?? master);
  o.start(at);
  o.stop(at + dur + 0.05);
}

function desis(at: number, dur: number, tipe: BiquadFilterType, f: number, vol: number, fAkhir?: number, out?: AudioNode) {
  if (!ctx || !master || !noise) return;
  const s = ctx.createBufferSource();
  s.buffer = noise;
  const fl = ctx.createBiquadFilter();
  fl.type = tipe;
  fl.frequency.setValueAtTime(f, at);
  if (fAkhir) fl.frequency.exponentialRampToValueAtTime(fAkhir, at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(fl).connect(g).connect(out ?? master);
  s.start(at, Math.random() * 0.5);
  s.stop(at + dur + 0.05);
}

/** Penjadwal musik: tiap 60 ms menjadwalkan not 0,3 dtk ke depan (tetap rapi walau JS sibuk). */
function jadwal() {
  if (!ctx || !musikGain) return;
  if (master) master.gain.value = isMuted() ? 0 : VOLUME;
  if (bagian === 'diam' || bagian === 'gantung') return;
  const pola = bagian === 'b1' ? B1 : bagian === 'b2' ? B2 : B3;
  const panjang = bagian === 'b2' ? 8 : 16;
  const batas = ctx.currentTime + 0.3;
  while (waktuMulai + ketukBerikut * BEAT * 0.5 < batas) {
    // Langkah setengah ketuk
    const k = ketukBerikut * 0.5;
    const at = waktuMulai + k * BEAT;
    const kp = k % panjang;
    for (let i = 0; i < pola.length; i++) {
      const n = pola[i];
      if (n[0] === kp) nada(n[1], at, n[2] * BEAT * 0.95, 'triangle', bagian === 'b1' ? 0.22 : 0.18, musikGain);
    }
    const birama = Math.floor(kp / 4) % 4;
    if (bagian === 'b1' && kp % 4 === 0) nada(BAS_B1[birama], at, BEAT * 3.6, 'sine', 0.4, musikGain);
    if (bagian === 'b2') {
      desis(at, 0.04, 'highpass', 7000, 0.08, undefined, musikGain); // hi-hat tiap ½ ketuk
      if (kp % 1 === 0) nada(kp % 2 === 0 ? BAS.C : BAS.G, at, BEAT * 0.8, 'sine', 0.35, musikGain);
    }
    if (bagian === 'b3' && kp % 1 === 0) {
      nada(kp % 2 === 0 ? [BAS.C, BAS.G, BAS.A, BAS.F][birama] : [BAS.G, BAS.G * 1.5, BAS.C * 1.25, BAS.C][birama], at, BEAT * 0.7, 'sine', 0.35, musikGain);
      if (kp % 2 === 1) desis(at, 0.05, 'highpass', 6000, 0.06, undefined, musikGain);
    }
    ketukBerikut++;
  }
}

/** Mulai sesi audio pembuka (dipanggil saat pembuka tampil). */
export function mulaiAudioPembuka() {
  if (!siapkan()) return;
  if (timer === null) timer = window.setInterval(jadwal, 60);
}

/** Pindah bagian musik (dipanggil saat shot berganti). */
export function aturMusik(b: Musik) {
  if (!ctx || b === bagian) return;
  bagian = b;
  ketukBerikut = 0;
  waktuMulai = ctx.currentTime + 0.05;
  if (b === 'gantung') {
    // Musik melambat: satu nada menggantung
    nada(N.E5, waktuMulai, 3.5, 'sine', 0.2, musikGain ?? undefined);
    nada(N.G4, waktuMulai, 3.5, 'triangle', 0.08, musikGain ?? undefined);
  }
}

/** Dengung mesin bus: gergaji rendah + noise lowpass (nyala/mati halus). */
export function aturMesinBus(nyala: boolean) {
  if (!ctx || !master || !noise) return;
  const now = ctx.currentTime;
  if (nyala && !mesin) {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = 260;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 46;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    osc.connect(fl);
    src.connect(fl);
    fl.connect(gain).connect(master);
    osc.start();
    src.start();
    gain.gain.setTargetAtTime(0.09, now, 0.3);
    mesin = { gain, osc, src };
  } else if (!nyala && mesin) {
    const m = mesin;
    mesin = null;
    m.gain.gain.setTargetAtTime(0, now, 0.15);
    m.osc.stop(now + 0.8);
    m.src.stop(now + 0.8);
  }
}

/** Efek suara per cue di data shot. */
export function cuePembuka(cue: string) {
  if (!ctx) return;
  const t = ctx.currentTime + 0.01;
  const acak = 0.9 + Math.random() * 0.2;
  switch (cue) {
    case 'kokok': // "ku-ku-ruyuuk": gergaji berfilter naik-turun
      nada(500, t, 0.18, 'sawtooth', 0.05, undefined, 760);
      nada(620, t + 0.22, 0.16, 'sawtooth', 0.05, undefined, 820);
      nada(700, t + 0.42, 0.55, 'sawtooth', 0.06, undefined, 420);
      break;
    case 'jangkrik':
      for (let i = 0; i < 6; i++) nada(4200, t + i * 0.18, 0.05, 'square', 0.012 * (1 - i / 6));
      break;
    case 'gemerisik':
      desis(t, 0.3, 'bandpass', 2500, 0.12);
      break;
    case 'tek':
      nada(1200, t, 0.06, 'sine', 0.15);
      desis(t, 0.03, 'highpass', 3000, 0.1);
      break;
    case 'ting':
      nada(N.E6, t, 1.0, 'sine', 0.14);
      nada(N.G6, t + 0.08, 1.2, 'sine', 0.1);
      break;
    case 'puk':
      desis(t, 0.1, 'lowpass', 420, 0.35);
      break;
    case 'wa': // notifikasi WA kecil: A5 → D6
      nada(N.A5, t, 0.1, 'sine', 0.14);
      nada(N.D6, t + 0.09, 0.16, 'sine', 0.14);
      break;
    case 'rem': // "psshh" rem angin bus
      desis(t, 0.8, 'lowpass', 4000, 0.18, 500);
      break;
    case 'klakson':
      for (const d of [0, 0.22]) {
        nada(440, t + d, 0.15, 'square', 0.05);
        nada(554, t + d, 0.15, 'square', 0.05);
      }
      break;
    case 'meong':
      nada(520 * acak, t, 0.12, 'triangle', 0.14, undefined, 820 * acak);
      nada(820 * acak, t + 0.12, 0.3, 'triangle', 0.12, undefined, 430 * acak);
      desis(t, 0.2, 'bandpass', 1800, 0.03);
      break;
    case 'kunci':
      for (let i = 0; i < 3; i++) nada(2500 + Math.random() * 1500, t + i * 0.07, 0.08, 'sine', 0.06);
      break;
    case 'kriet': // derit gerbang
      nada(300, t, 0.3, 'sawtooth', 0.025, undefined, 520);
      nada(520, t + 0.3, 0.35, 'sawtooth', 0.02, undefined, 260);
      break;
    case 'kalender': // lembar kalender membalik cepat
      for (let i = 0; i < 12; i++) desis(t + i * 0.07, 0.05, 'highpass', 3000, 0.08);
      break;
    case 'stinger': // "jeng-jeng" turun lucu (trombon sedih ala kartun)
      nada(392, t, 0.28, 'sawtooth', 0.07, undefined, 370);
      nada(370, t + 0.32, 0.28, 'sawtooth', 0.07, undefined, 349);
      nada(349, t + 0.64, 0.7, 'sawtooth', 0.07, undefined, 300);
      nada(131, t + 0.64, 0.7, 'square', 0.05);
      break;
    case 'judul': // motif judul ceria C5–E5–G5–C6
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => nada(f, t + i * 0.12, 0.5, 'triangle', 0.14));
      nada(N.C6, t + 0.5, 1.6, 'sine', 0.08);
      nada(N.G5, t + 0.5, 1.6, 'sine', 0.06);
      break;
  }
}

/** Hentikan semua suara pembuka dengan rapi (fade 0,25 dtk lalu tutup AudioContext). */
export function hentikanAudioPembuka() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  bagian = 'diam';
  mesin = null;
  const c = ctx;
  const m = master;
  ctx = null;
  master = null;
  musikGain = null;
  noise = null;
  if (!c) return;
  try {
    if (m) m.gain.setTargetAtTime(0, c.currentTime, 0.08);
    window.setTimeout(() => void c.close().catch(() => undefined), 400);
  } catch {
    // abaikan
  }
}

// Hemat baterai: jeda saat app di-background
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') void ctx.suspend();
    else void ctx.resume();
  });
}
