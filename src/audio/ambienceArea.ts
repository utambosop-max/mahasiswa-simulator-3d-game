// Ambience area dunia baru (M13): kali + bebek, sawah malam (jangkrik + kodok), pasar kaget malam, angin gang.
// 100% sintetis (Web Audio API) — lihat skill procedural-sfx-synth & docs/ART_AUDIO/ambience-area-baru.md.
// Hemat CPU: tiap area punya rantai node tetap (filter → gain area → master) yang dibuat SEKALI.
// Volume hanya digeser lewat gain (crossfade halus). Sumber (oscillator/noise) dihentikan total saat
// area sunyi > 2 dtk, lalu dibuat lagi hanya saat area kembali terdengar (jarang, bukan per frame).
import { useGame } from '../game/store';
import { playerPos } from '../game/playerPos';
import { GANG, PASAR_KAGET, SAWAH_BLOK, SUNGAI } from '../game/duniaLayout';
import type { AABB } from '../game/collision';
import { intiAudio, isMuted } from './sfx';

type IdArea = 'kali' | 'sawah' | 'pasar' | 'gang';

type Area = {
  id: IdArea;
  kotak: readonly AABB[];
  dekat: number; // ≤ jarak ini = volume penuh
  jauh: number; // ≥ jarak ini = sunyi
  vol: number; // volume puncak area (tingkat 1: sangat pelan)
  malamSaja: boolean;
};

const AREA: readonly Area[] = [
  { id: 'kali', kotak: [{ minX: -90, maxX: 90, minZ: SUNGAI.z - SUNGAI.setengah, maxZ: SUNGAI.z + SUNGAI.setengah }], dekat: 4, jauh: 20, vol: 0.09, malamSaja: false },
  { id: 'sawah', kotak: SAWAH_BLOK, dekat: 3, jauh: 22, vol: 0.06, malamSaja: true },
  { id: 'pasar', kotak: [{ minX: -PASAR_KAGET.x1, maxX: PASAR_KAGET.x1, minZ: PASAR_KAGET.z - 4.4, maxZ: PASAR_KAGET.z + 4.4 }], dekat: 2, jauh: 18, vol: 0.08, malamSaja: true },
  { id: 'gang', kotak: [{ minX: GANG.x - 7, maxX: GANG.x + 7, minZ: GANG.z0, maxZ: GANG.z1 }], dekat: 1, jauh: 10, vol: 0.05, malamSaja: false },
];

/** Jarak titik ke kotak (0 bila di dalam). */
function jarakKotak(k: AABB, x: number, z: number): number {
  const dx = Math.max(k.minX - x, 0, x - k.maxX);
  const dz = Math.max(k.minZ - z, 0, z - k.maxZ);
  return Math.hypot(dx, dz);
}

const target: Record<IdArea, number> = { kali: 0, sawah: 0, pasar: 0, gang: 0 };

/** Hitung volume target tiap area dari posisi pemain, fase, pembuka, mute, dll. */
function hitungTarget(nyala: boolean) {
  const s = useGame.getState();
  const malam = s.fase === 'malam' || s.fase === 'begadang';
  const diam =
    !nyala || isMuted() || document.visibilityState === 'hidden' || s.pembuka || s.lokasi !== 'dunia' || !!s.layarUtama || !!s.kerja;
  for (const a of AREA) {
    if (diam || (a.malamSaja && !malam)) {
      target[a.id] = 0;
      continue;
    }
    let d = Infinity;
    for (const k of a.kotak) d = Math.min(d, jarakKotak(k, playerPos.x, playerPos.z));
    const f = Math.min(1, Math.max(0, 1 - (d - a.dekat) / (a.jauh - a.dekat)));
    target[a.id] = f * f * a.vol; // kuadrat = memudar lebih alami
  }
}

// ===== Rantai node per area =====
type Rantai = {
  gain: GainNode; // gain area (jarak + fase)
  masuk: AudioNode; // titik masuk sumber kontinu
  buatSumber: () => AudioScheduledSourceNode[];
  sumber: AudioScheduledSourceNode[] | null;
  sunyiSejak: number;
};
let rantai: Record<IdArea, Rantai> | null = null;

function loopNoise(c: AudioContext, buf: AudioBuffer): AudioBufferSourceNode {
  const n = c.createBufferSource();
  n.buffer = buf;
  n.loop = true;
  n.playbackRate.value = 0.9 + Math.random() * 0.2; // tiap area beda "warna" noise
  return n;
}

/** LFO pelan yang menggeser sebuah parameter (mis. frekuensi filter). */
function lfo(c: AudioContext, hz: number, dalam: number, ke: AudioParam): OscillatorNode {
  const o = c.createOscillator();
  o.frequency.value = hz;
  const g = c.createGain();
  g.gain.value = dalam;
  o.connect(g).connect(ke);
  return o;
}

function bangunRantai(c: AudioContext, out: GainNode, buf: AudioBuffer): Record<IdArea, Rantai> {
  const gainArea = () => {
    const g = c.createGain();
    g.gain.value = 0;
    g.connect(out);
    return g;
  };
  const filter = (type: BiquadFilterType, f: number, q: number, ke: AudioNode) => {
    const b = c.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    b.connect(ke);
    return b;
  };

  // Kali: gemericik = noise bandpass 900 Hz yang frekuensinya bergoyang + kilau highpass 3 kHz
  const gKali = gainArea();
  const kaliBp = filter('bandpass', 900, 0.8, gKali);
  const kaliHp = filter('highpass', 3000, 0.7, gKali);
  const kaliMasuk = c.createGain();
  kaliMasuk.connect(kaliBp);
  const kaliKilau = c.createGain();
  kaliKilau.gain.value = 0.25;
  kaliMasuk.connect(kaliKilau).connect(kaliHp);

  // Sawah: jangkrik = sine 4,2 kHz yang dipotong-potong LFO persegi 28 Hz (krik-krik)
  const gSawah = gainArea();
  const jkAmp = c.createGain();
  jkAmp.gain.value = 0.5; // offset agar AM 0..1
  const jkRem = c.createGain();
  jkRem.gain.value = 0.18; // jangkrik pelan, kodok lebih menonjol
  jkAmp.connect(jkRem).connect(gSawah);

  // Pasar: gumam kerumunan = noise lewat 2 bandpass (formant suara manusia ±500 & ±1400 Hz) bergoyang pelan
  const gPasar = gainArea();
  const psBp1 = filter('bandpass', 500, 1.4, gPasar);
  const psBp2 = filter('bandpass', 1400, 2.2, gPasar);
  const psMasuk = c.createGain();
  psMasuk.connect(psBp1);
  const ps2 = c.createGain();
  ps2.gain.value = 0.5;
  psMasuk.connect(ps2).connect(psBp2);

  // Gang: angin = noise lowpass resonan yang disapu LFO sangat pelan (siulan halus)
  const gGang = gainArea();
  const ggLp = filter('lowpass', 500, 4, gGang);

  const r = (gain: GainNode, masuk: AudioNode, buatSumber: () => AudioScheduledSourceNode[]): Rantai => ({
    gain,
    masuk,
    buatSumber,
    sumber: null,
    sunyiSejak: 0,
  });
  return {
    kali: r(gKali, kaliMasuk, () => {
      const n = loopNoise(c, buf);
      n.connect(kaliMasuk);
      return [n, lfo(c, 0.35, 250, kaliBp.frequency), lfo(c, 0.9, 900, kaliHp.frequency)];
    }),
    sawah: r(gSawah, jkAmp, () => {
      const o = c.createOscillator();
      o.frequency.value = 4200;
      o.connect(jkAmp);
      const l = c.createOscillator();
      l.type = 'square';
      l.frequency.value = 28;
      const d = c.createGain();
      d.gain.value = 0.5;
      l.connect(d).connect(jkAmp.gain);
      return [o, l];
    }),
    pasar: r(gPasar, psMasuk, () => {
      const n = loopNoise(c, buf);
      n.connect(psMasuk);
      return [n, lfo(c, 0.4, 150, psBp1.frequency), lfo(c, 0.27, 300, psBp2.frequency)];
    }),
    gang: r(gGang, ggLp, () => {
      const n = loopNoise(c, buf);
      n.connect(ggLp);
      return [n, lfo(c, 0.12, 300, ggLp.frequency)];
    }),
  };
}

// ===== Suara sesekali (one-shot) — masuk ke gain area agar ikut jarak =====
/** Nada pendek ke node tujuan (node mati sendiri setelah selesai). */
function nada(c: AudioContext, ke: AudioNode, type: OscillatorType, f0: number, f1: number, at: number, dur: number, vol: number) {
  const t = c.currentTime + at;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ke);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const acak = (a: number, b: number) => a + Math.random() * (b - a);

/** Bebek: "kwek" persegi 620→430 Hz, 1–3 kali, pitch ±12%. */
function bebek(c: AudioContext, ke: AudioNode) {
  const k = acak(0.88, 1.12);
  const n = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) nada(c, ke, 'square', 620 * k, 430 * k, i * 0.22, 0.13, 0.12);
}
/** Kodok: "krok-krok" gergaji 190→140 Hz, dua denyut. */
function kodok(c: AudioContext, ke: AudioNode) {
  const k = acak(0.85, 1.15);
  nada(c, ke, 'sawtooth', 190 * k, 140 * k, 0, 0.09, 0.25);
  nada(c, ke, 'sawtooth', 200 * k, 145 * k, 0.14, 0.11, 0.22);
}
// Teriakan pedagang = kontur nada tanpa kata ("Ayo-ayo, murah!"), dari pentatonik C oktaf 4
const NADA_PASAR = [262, 294, 330, 392, 440] as const;
function teriakan(c: AudioContext, ke: AudioNode) {
  const n = 2 + Math.floor(Math.random() * 3);
  let t = 0;
  for (let i = 0; i < n; i++) {
    const f = NADA_PASAR[Math.floor(Math.random() * NADA_PASAR.length)];
    const dur = i === n - 1 ? 0.45 : 0.18; // suku kata terakhir dipanjangkan
    nada(c, ke, 'triangle', f, i === n - 1 ? f * 0.85 : f * 1.02, t, dur, 0.5);
    t += dur + 0.04;
  }
}

// ===== Penjadwal (200 ms, bukan per frame) =====
const TAU = 0.6; // konstanta waktu crossfade (detik)
let mulai = false;
let nyalaFn: () => boolean = () => true;

function tick() {
  hitungTarget(nyalaFn());
  const inti = intiAudio();
  if (!inti) return; // belum ada interaksi pertama
  const { c, out, noise } = inti;
  if (!rantai) rantai = bangunRantai(c, out, noise);
  const now = c.currentTime;
  for (const a of AREA) {
    const r = rantai[a.id];
    const v = target[a.id];
    r.gain.gain.setTargetAtTime(v, now, TAU);
    if (v > 0) {
      r.sunyiSejak = 0;
      if (!r.sumber) {
        r.sumber = r.buatSumber();
        for (const s of r.sumber) s.start();
      }
    } else if (r.sumber) {
      // Tunggu fade selesai, lalu hentikan total (0 CPU)
      if (!r.sunyiSejak) r.sunyiSejak = now;
      else if (now - r.sunyiSejak > 2.5) {
        for (const s of r.sumber) {
          s.stop();
          s.disconnect();
        }
        r.sumber = null;
      }
    }
  }
  // Suara sesekali hanya saat area cukup terdengar
  const fase = useGame.getState().fase;
  const siang = fase === 'pagi' || fase === 'siang' || fase === 'sore';
  if (target.kali > 0.01 && siang && Math.random() < 0.05) bebek(c, rantai.kali.gain);
  if (target.sawah > 0.005 && Math.random() < 0.18) kodok(c, rantai.sawah.gain);
  if (target.pasar > 0.01 && Math.random() < 0.04) teriakan(c, rantai.pasar.gain);
}

/** Mulai ambience area (sekali). `nyala` = sakelar Suasana di Pengaturan. */
export function mulaiAmbienceArea(nyala: () => boolean) {
  if (mulai) return;
  mulai = true;
  nyalaFn = nyala;
  setInterval(tick, 200);
  // Saat tab disembunyikan: langsung hitung ulang (target 0 → sumber dihentikan)
  document.addEventListener('visibilitychange', tick);
}

/** Debug untuk tes otomatis: volume target & gain node sebenarnya tiap area. */
export function debugAmbienceArea() {
  const g = (id: IdArea) => (rantai ? rantai[id].gain.gain.value : 0);
  const aktif = (id: IdArea) => !!rantai?.[id].sumber;
  return {
    pos: { x: playerPos.x, z: playerPos.z },
    target: { ...target },
    gain: { kali: g('kali'), sawah: g('sawah'), pasar: g('pasar'), gang: g('gang') },
    aktif: { kali: aktif('kali'), sawah: aktif('sawah'), pasar: aktif('pasar'), gang: aktif('gang') },
  };
}
if (typeof window !== 'undefined') (window as unknown as { __ambArea?: typeof debugAmbienceArea }).__ambArea = debugAmbienceArea;
