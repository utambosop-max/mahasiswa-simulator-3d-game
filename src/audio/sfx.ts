// Efek suara sintetis dengan Web Audio API — TANPA file audio (lihat skill procedural-sfx-synth).
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

const VOLUME = 0.5;
const KEY_SUARA = 'mahasiswa-sim-suara';

function bacaMuted(): boolean {
  try {
    return localStorage.getItem(KEY_SUARA) === 'mati';
  } catch {
    return false;
  }
}
let muted = bacaMuted();

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : VOLUME;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && document.visibilityState === 'visible') void ctx.resume();
    return ctx;
  } catch {
    return null; // Tidak ada audio → game tetap jalan tanpa suara
  }
}

/** Panggil saat sentuhan/klik/tombol pertama (aturan browser & Android WebView). */
export function unlockAudio() {
  getCtx();
}

export const isMuted = () => muted;

export function setMuted(v: boolean) {
  muted = v;
  if (master) master.gain.value = v ? 0 : VOLUME;
  try {
    localStorage.setItem(KEY_SUARA, v ? 'mati' : 'nyala');
  } catch {
    // abaikan
  }
}

// Hemat baterai: hentikan audio saat app di-background
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') void ctx.suspend();
    else void ctx.resume();
  });
}

// ===================== Gema ruangan (M12) =====================
// Tanpa file: "respons impuls" ruangan dibuat dari noise acak yang meluruh eksponensial.
// Peluruhan 60 dB dalam RT60 detik → amplitudo e^(−6,91·t/RT60). Kiri & kanan beda noise = terasa luas.
let gema: { conv: ConvolverNode; basah: GainNode } | null = null;
let rtSekarang = 0;

function responsImpuls(c: AudioContext, rt60: number): AudioBuffer {
  const panjang = Math.max(1, Math.floor(c.sampleRate * rt60));
  const buf = c.createBuffer(2, panjang, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < panjang; i++) d[i] = (Math.random() * 2 - 1) * Math.exp((-6.91 * i) / panjang);
  }
  return buf;
}

/** Nyalakan gema dengan waktu RT60 (detik); 0 = matikan (di luar ruangan). */
export function aturGema(rt60: number) {
  const c = ctx; // jangan membuat AudioContext sebelum interaksi pertama
  if (!c || !master) return;
  const rt = Math.round(Math.min(2.5, rt60) * 10) / 10; // dibulatkan agar tidak membuat ulang buffer terus
  if (!gema) {
    const conv = c.createConvolver();
    const basah = c.createGain();
    basah.gain.value = 0;
    master.connect(conv); // jalur "basah" paralel dengan jalur asli (kering)
    conv.connect(basah).connect(c.destination);
    gema = { conv, basah };
  }
  if (rt > 0 && rt !== rtSekarang) gema.conv.buffer = responsImpuls(c, rt);
  rtSekarang = rt > 0 ? rt : rtSekarang;
  // Ruangan lebih besar = porsi pantulan sedikit lebih banyak
  gema.basah.gain.setTargetAtTime(rt > 0 ? 0.18 + 0.12 * Math.min(1, rt / 1.5) : 0, c.currentTime, 0.1);
}

// ===================== Mesin motor kontinu (M12) =====================
// Motor 1 silinder 4-tak: satu letupan tiap 2 putaran → nada dasar f = rpm/120 (fisika.ts: frekuensiMesin).
// Sumber: gelombang gergaji (kaya harmonik = "brebet") + oktaf bawah persegi, lewat filter lowpass
// yang makin terbuka saat gas ditekan (beban mesin). Node dibuat sekali, lalu hanya parameternya digeser.
type NodeMesin = { gain: GainNode; osc: OscillatorNode; sub: OscillatorNode; filter: BiquadFilterNode };
/** Satu "suara mesin" yang bisa dinyalakan/digeser terus (dipakai motor pemain & kendaraan lewat). */
type SlotMesin = { node: NodeMesin | null; update: number; aktif: boolean };
const PEMAIN: SlotMesin = { node: null, update: 0, aktif: false };
const LEWAT: SlotMesin = { node: null, update: 0, aktif: false };

/** Geser parameter slot mesin. Mengembalikan node bila parameter boleh diubah sekarang. */
function geserSlot(slot: SlotMesin, aktif: boolean, vol: number): NodeMesin | null {
  if (!ctx || !master) return null; // AudioContext hanya dibuat oleh unlockAudio()
  const now = ctx.currentTime;
  // Throttle 50 ms, kecuali saat baru nyala/mati (harus langsung)
  if (aktif === slot.aktif && now - slot.update < 0.05) return null;
  if (!aktif && !slot.aktif) return null;
  slot.update = now;
  slot.aktif = aktif;
  if (!slot.node) slot.node = buatMesin(ctx, master);
  slot.node.gain.gain.setTargetAtTime(aktif && !muted ? vol : 0, now, aktif ? 0.08 : 0.25);
  return aktif ? slot.node : null;
}

function buatMesin(c: AudioContext, out: GainNode): NodeMesin {
  const gain = c.createGain();
  gain.gain.value = 0;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  filter.Q.value = 2;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  const sub = c.createOscillator();
  sub.type = 'square';
  const subGain = c.createGain();
  subGain.gain.value = 0.5;
  osc.connect(filter);
  sub.connect(subGain).connect(filter);
  filter.connect(gain).connect(out);
  osc.start();
  sub.start();
  return { gain, osc, sub, filter };
}

/**
 * Dipanggil tiap frame dari Player. `aktif` = sedang di atas motor & bensin ada,
 * `frek` = nada dasar mesin (Hz), `beban` 0..1 = seberapa kuat gas ditekan.
 * Parameter digeser halus (setTargetAtTime) dan paling sering tiap 50 ms agar ringan.
 */
export function aturMesin(aktif: boolean, frek: number, beban: number) {
  const m = geserSlot(PEMAIN, aktif, 0.045 + 0.04 * beban);
  if (!m || !ctx) return;
  const now = ctx.currentTime;
  m.osc.frequency.setTargetAtTime(frek, now, 0.06);
  m.sub.frequency.setTargetAtTime(frek / 2, now, 0.06);
  m.filter.frequency.setTargetAtTime(350 + frek * 4 + 900 * beban, now, 0.08);
}

/**
 * Kendaraan NPC terdekat yang lewat. `frek` sudah digeser efek Doppler (naik saat mendekat,
 * turun saat menjauh), `vol` 0..1 dari jarak. Filter lebih tertutup = terdengar "dari kejauhan".
 */
export function aturKendaraanLewat(aktif: boolean, frek: number, vol: number) {
  const m = geserSlot(LEWAT, aktif, 0.05 * vol);
  if (!m || !ctx) return;
  const now = ctx.currentTime;
  m.osc.frequency.setTargetAtTime(frek, now, 0.05);
  m.sub.frequency.setTargetAtTime(frek / 2, now, 0.05);
  m.filter.frequency.setTargetAtTime(250 + 700 * vol, now, 0.08);
}

/** Tangga nada pentatonik bersama (C5 … G6) — semua nada UI dipilih dari sini agar harmonis. */
const NADA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568] as const;

// Batasi suara yang sama diputar terlalu rapat (< 50 ms)
const terakhir = new Map<string, number>();
function bolehBunyi(nama: string): boolean {
  const now = performance.now();
  if (now - (terakhir.get(nama) ?? -1e9) < 50) return false;
  terakhir.set(nama, now);
  return true;
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Nada sederhana dengan envelope. */
function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, at = 0, slideTo?: number) {
  const c = getCtx();
  if (!c || !master || muted) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** Semburan noise yang difilter. */
function burst(dur: number, filterType: BiquadFilterType, freq: number, vol = 0.3, at = 0, q = 1) {
  const c = getCtx();
  if (!c || !master || muted) return;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

/**
 * Akses inti audio untuk modul lain (ambience area). TIDAK membuat AudioContext
 * (null sebelum interaksi pertama). `noise` = buffer noise 1 dtk bersama.
 */
export function intiAudio(): { c: AudioContext; out: GainNode; noise: AudioBuffer } | null {
  if (!ctx || !master) return null;
  return { c: ctx, out: master, noise: noise(ctx) };
}

/** Merpati kaget terbang: 5–7 kepakan noise bandpass yang makin pelan (tingkat 1, pitch acak ±15%). */
export function sfxMerpati() {
  if (!bolehBunyi('merpati')) return;
  const n = 5 + Math.floor(Math.random() * 3);
  const f = 1100 * (0.85 + Math.random() * 0.3);
  for (let i = 0; i < n; i++) burst(0.05, 'bandpass', f * (1 + i * 0.03), 0.16 * (1 - i / (n + 1)), i * 0.075, 1.4);
}

// ===== Resep suara =====

/** Langkah kaki kartun: "puk" pendek, pitch sedikit acak. */
export function sfxLangkah() {
  if (!bolehBunyi('langkah')) return;
  const f = 140 + Math.random() * 40;
  tone(f, 0.08, 'sine', 0.18, 0, f * 0.6);
  burst(0.04, 'lowpass', 800, 0.06);
}

/** Koin: dua nada naik "ting-ting!" */
export function sfxKoin() {
  if (!bolehBunyi('koin')) return;
  tone(988, 0.08, 'square', 0.1);
  tone(1319, 0.25, 'square', 0.1, 0.07);
}

/** Notifikasi HP: "tri-tu-ting" */
export function sfxNotifHP() {
  if (!bolehBunyi('notif')) return;
  tone(880, 0.09, 'sine', 0.18);
  tone(1175, 0.09, 'sine', 0.18, 0.1);
  tone(1568, 0.18, 'sine', 0.18, 0.2);
}

/** Ketikan laptop. */
export function sfxKetik(n = 8) {
  if (!bolehBunyi('ketik')) return;
  for (let i = 0; i < n; i++) {
    const at = i * (0.06 + Math.random() * 0.05);
    burst(0.025, 'highpass', 2500 + Math.random() * 1500, 0.13, at, 2);
  }
}

/** Wajan/gorengan: desis + "kretek". */
export function sfxWajan() {
  if (!bolehBunyi('wajan')) return;
  burst(1.0, 'bandpass', 4000, 0.15, 0, 0.7);
  for (let i = 0; i < 8; i++) burst(0.02, 'highpass', 3000, 0.16, Math.random() * 0.9, 3);
}

/** Tuang kopi: filter naik (gelas makin penuh). */
export function sfxTuangKopi() {
  if (!bolehBunyi('kopi')) return;
  const c = getCtx();
  if (!c || !master || muted) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 4;
  f.frequency.setValueAtTime(400, t);
  f.frequency.linearRampToValueAtTime(1400, t + 0.9);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.22, t + 0.05);
  g.gain.setValueAtTime(0.22, t + 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + 1.05);
}

/** Aduk kopi: sendok "ting" di gelas. */
export function sfxAdukKopi() {
  if (!bolehBunyi('aduk')) return;
  for (let i = 0; i < 3; i++) tone(2600 + Math.random() * 200, 0.12, 'triangle', 0.08, i * 0.18);
}

/** Pintu: derit pendek + "tuk". */
export function sfxPintu() {
  if (!bolehBunyi('pintu')) return;
  tone(220, 0.35, 'sawtooth', 0.05, 0, 330);
  burst(0.08, 'lowpass', 500, 0.2, 0.32);
}

/** Tidur: nada turun pelan "ninabobo". */
export function sfxTidur() {
  if (!bolehBunyi('tidur')) return;
  [660, 523, 440, 330].forEach((f, i) => tone(f, 0.35, 'sine', 0.1, i * 0.22));
}

/** Klakson kartun "tin-tin!" (dua nada persegi bersamaan = suara cempreng khas). */
export function sfxKlakson() {
  if (!bolehBunyi('klakson')) return;
  for (const at of [0, 0.22]) {
    tone(440, 0.16, 'square', 0.07, at);
    tone(554, 0.16, 'square', 0.06, at);
  }
}

/** M12: peluit polisi / wasit "priiit!" — sine tinggi dengan getaran cepat (bola di dalam peluit) + desis napas. */
export function sfxPeluit() {
  const c = getCtx();
  if (!c || !master || muted || !bolehBunyi('peluit')) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 2900;
  // Getaran frekuensi 35 Hz ± 140 Hz = bunyi "rrr" khas peluit
  const lfo = c.createOscillator();
  lfo.frequency.value = 35;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 140;
  lfo.connect(lfoGain).connect(osc.frequency);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
  g.gain.setValueAtTime(0.09, now + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  osc.connect(g).connect(master);
  osc.start(now);
  lfo.start(now);
  osc.stop(now + 0.62);
  lfo.stop(now + 0.62);
  burst(0.55, 'bandpass', 3200, 0.03, 0, 2);
}

/** M12 mini-game: tendangan/tepukan bola "duk" — sine rendah turun + noise pendek. */
export function sfxTendang() {
  if (!bolehBunyi('tendang')) return;
  tone(160 * (0.9 + Math.random() * 0.2), 0.12, 'sine', 0.18, 0, 60);
  burst(0.05, 'lowpass', 900, 0.12);
}
/** M12 mini-game: cipratan air (batu memantul / tenggelam). */
export function sfxCiprat(besar = false) {
  if (!bolehBunyi('ciprat')) return;
  burst(besar ? 0.35 : 0.14, 'bandpass', besar ? 900 : 1800, besar ? 0.14 : 0.08, 0, 1.5);
  tone(besar ? 300 : 700, 0.08, 'sine', 0.05, 0, besar ? 120 : 1100);
}
/**
 * M12 setem gitar: petik nada acuan & senar bersamaan. Selisih frekuensi terdengar sebagai
 * "beat" (keras-pelan) dengan frekuensi |f1 − f2| — makin pelan beat-nya, makin pas setemnya.
 */
export function sfxDuaSenar(acuan: number, senar: number) {
  if (!bolehBunyi('senar')) return;
  tone(acuan, 1.8, 'triangle', 0.09);
  tone(senar, 1.8, 'triangle', 0.09);
}

/** M12: lonceng gerobak cilok "teng-teng" — 2 pukulan triangle G6 + E6 (dari tangga NADA). */
export function sfxTengTeng() {
  if (!bolehBunyi('tengteng')) return;
  tone(NADA[8], 0.35, 'triangle', 0.05, 0);
  tone(NADA[7], 0.35, 'triangle', 0.05, 0.22);
}

/** Mesin motor menyala: "brrrum" (gergaji frekuensi rendah naik). */
export function sfxMesin() {
  if (!bolehBunyi('mesin')) return;
  tone(55, 0.5, 'sawtooth', 0.1, 0, 120);
  tone(82, 0.45, 'sawtooth', 0.06, 0.05, 160);
  burst(0.4, 'lowpass', 300, 0.12, 0);
}

/** UI: tombol ditekan "pop". */
export function sfxPop() {
  if (!bolehBunyi('pop')) return;
  tone(600, 0.07, 'sine', 0.16, 0, 900);
}

/** Salah / belum bisa: nada turun. */
export function sfxSalah() {
  if (!bolehBunyi('salah')) return;
  tone(300, 0.25, 'sawtooth', 0.1, 0, 150);
}

/** Upgrade berhasil: arpeggio ceria C5 → E5 → G5 → C6. */
export function sfxUpgrade() {
  if (!bolehBunyi('upgrade')) return;
  [NADA[0], NADA[2], NADA[3], NADA[5]].forEach((f, i) => tone(f, 0.15, 'square', 0.08, i * 0.08));
}

// ===== Mini-game kerja =====

/** Bahan benar ditaruh: nada naik sesuai urutan bahan (1 → 2 → 3) = pemain "mendengar" kemajuan. */
export function sfxBahan(urutan: number) {
  if (!bolehBunyi('bahan')) return;
  const f = NADA[Math.min(NADA.length - 1, 2 + urutan * 2)];
  tone(f, 0.09, 'triangle', 0.14);
  burst(0.03, 'lowpass', 1200, 0.05);
}

/** Pelanggan datang: lonceng pintu "ting!" (A5 + E6). */
export function sfxPelanggan() {
  if (!bolehBunyi('pelanggan')) return;
  tone(NADA[4], 0.25, 'sine', 0.1);
  tone(NADA[7], 0.35, 'sine', 0.07, 0.05);
}

/** Pelanggan kecewa & pergi: dua nada turun "hmph". */
export function sfxKecewa() {
  if (!bolehBunyi('kecewa')) return;
  tone(330, 0.16, 'sawtooth', 0.07, 0, 290);
  tone(247, 0.3, 'sawtooth', 0.07, 0.16, 200);
}

/** Shift selesai: fanfare kecil naik G5 → C6 → E6 → G6. */
export function sfxSelesaiKerja() {
  if (!bolehBunyi('selesaiKerja')) return;
  [NADA[3], NADA[5], NADA[7], NADA[8]].forEach((f, i) => tone(f, i === 3 ? 0.4 : 0.12, 'square', 0.08, i * 0.1));
}

// ===== M7: fitur kehidupan =====
/** Pencapaian terbuka (tingkat 5): arpeggio persegi naik C5–E5–G5–C6–E6, nada terakhir panjang. */
export function sfxPencapaian() {
  if (!bolehBunyi('pencapaian')) return;
  [NADA[0], NADA[2], NADA[3], NADA[5], NADA[7]].forEach((f, i) => tone(f, i === 4 ? 0.5 : 0.1, 'square', 0.07, i * 0.08));
  tone(NADA[7], 0.6, 'sine', 0.05, 0.4);
}

/** Misi harian selesai: "ting-ting" triangle G5 → C6 (lebih kecil dari pencapaian). */
export function sfxMisi() {
  if (!bolehBunyi('misi')) return;
  tone(NADA[3], 0.12, 'triangle', 0.1);
  tone(NADA[5], 0.25, 'triangle', 0.1, 0.1);
}

/** Meong kucing: sine dengan nada naik lalu turun + sedikit noise napas. */
export function sfxMeong() {
  if (!bolehBunyi('meong')) return;
  const c = getCtx();
  if (!c || !master || muted) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  const f = 1 + (Math.random() - 0.5) * 0.2; // variasi pitch ±10%
  o.type = 'triangle';
  o.frequency.setValueAtTime(520 * f, t);
  o.frequency.linearRampToValueAtTime(820 * f, t + 0.15);
  o.frequency.linearRampToValueAtTime(430 * f, t + 0.5);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.6);
  burst(0.3, 'bandpass', 2500, 0.02, 0.05, 2);
}

/** Genjrengan gitar: 4 senar dipetik berurutan (akor C: C5 E5 G5 C6), triangle meluruh. */
export function sfxGitar() {
  if (!bolehBunyi('gitar')) return;
  [NADA[0] / 2, NADA[2] / 2, NADA[3] / 2, NADA[5] / 2].forEach((f, i) => tone(f, 1.2, 'triangle', 0.09, i * 0.035));
  [NADA[0] / 2, NADA[2] / 2, NADA[3] / 2].forEach((f, i) => tone(f, 0.9, 'triangle', 0.07, 0.45 + i * 0.03));
}

// ===== M8 =====
/** Skill naik level: 3 nada triangle naik cepat E5–A5–E6 (lebih kecil dari pencapaian). */
export function sfxLevelUp() {
  if (!bolehBunyi('levelUp')) return;
  [NADA[2], NADA[4], NADA[7]].forEach((f, i) => tone(f, i === 2 ? 0.35 : 0.09, 'triangle', 0.1, i * 0.07));
}
/** Wisuda: fanfare panjang persegi C5–E5–G5–C6 lalu akor G5+C6+E6 (tingkat 5, momen terbesar game). */
export function sfxWisuda() {
  if (!bolehBunyi('wisuda')) return;
  [NADA[0], NADA[2], NADA[3], NADA[5]].forEach((f, i) => tone(f, 0.16, 'square', 0.08, i * 0.14));
  [NADA[3], NADA[5], NADA[7]].forEach((f) => tone(f, 1.2, 'square', 0.05, 0.6));
  tone(NADA[8], 1.0, 'sine', 0.06, 0.75);
}
/** Telepon tersambung: dering "tut-tut" sine A5 dua kali. */
export function sfxTelepon() {
  if (!bolehBunyi('telepon')) return;
  tone(NADA[4], 0.12, 'sine', 0.09);
  tone(NADA[4], 0.12, 'sine', 0.09, 0.2);
  tone(NADA[6], 0.2, 'sine', 0.08, 0.45);
}
/** Posting medsos: "cekrek" kamera (noise highpass pendek) + ting kecil. */
export function sfxPosting() {
  if (!bolehBunyi('posting')) return;
  burst(0.05, 'highpass', 4000, 0.12);
  burst(0.06, 'highpass', 3000, 0.08, 0.07);
  tone(NADA[7], 0.15, 'sine', 0.06, 0.15);
}
/** Isi bensin: desis cairan (bandpass naik) seperti gelas yang penuh. */
export function sfxIsiBensin() {
  if (!bolehBunyi('bensin')) return;
  for (let i = 0; i < 6; i++) burst(0.18, 'bandpass', 700 + i * 180, 0.05, i * 0.12, 3);
}
/** Petir: gemuruh noise lowpass panjang + retakan highpass di awal. */
export function sfxPetir() {
  if (!bolehBunyi('petir')) return;
  burst(0.15, 'highpass', 2500, 0.08);
  burst(1.8, 'lowpass', 180, 0.22, 0.05, 0.7);
  burst(1.2, 'lowpass', 90, 0.18, 0.4, 0.7);
}

// ===== Ambience (suasana, tingkat 1 — sangat pelan) =====
/** Kicau burung pagi: 2–3 "cuit" sine cepat naik di nada tinggi. */
export function ambBurung() {
  if (!bolehBunyi('burung')) return;
  const n = 2 + Math.floor(Math.random() * 2);
  const dasar = 2600 + Math.random() * 900;
  for (let i = 0; i < n; i++) tone(dasar, 0.06, 'sine', 0.025, i * 0.09, dasar * 1.35);
}
/** Jangkrik malam: denyut cepat nada tinggi. */
export function ambJangkrik() {
  if (!bolehBunyi('jangkrik')) return;
  const f = 4200 + Math.random() * 400;
  for (let i = 0; i < 4; i++) tone(f, 0.025, 'square', 0.006, i * 0.05);
}
/** Rintik hujan: noise highpass pendek (diputar berulang oleh penjadwal ambience). */
export function ambHujan() {
  if (!bolehBunyi('hujan')) return;
  burst(0.9, 'lowpass', 1800, 0.035, 0, 0.5);
  burst(0.5, 'highpass', 5000, 0.012, 0.2, 0.7);
}

// ===== Online (tingkat 2: antarmuka sosial) =====
/** Chat/emoji teman masuk: "blup" dua nada pendek E6 → G6 (beda dari notif HP yang 3 nada). */
export function sfxChat() {
  if (!bolehBunyi('chat')) return;
  const naik = Math.random() < 0.5 ? 0 : 1; // variasi kecil agar tidak membosankan
  tone(NADA[6 + naik], 0.07, 'triangle', 0.1);
  tone(NADA[7 + naik], 0.1, 'triangle', 0.09, 0.07);
}

/** Teman masuk ke game: sapaan ceria naik C5 → G5 → C6 (sine lembut). */
export function sfxTemanDatang() {
  if (!bolehBunyi('temanDatang')) return;
  [NADA[0], NADA[3], NADA[5]].forEach((f, i) => tone(f, 0.18, 'sine', 0.1, i * 0.09));
}

/** Jam bersama maju ke fase baru: genta lembut D5 + A5 (tidak menutupi suara aksi). */
export function sfxFaseBersama() {
  if (!bolehBunyi('fase')) return;
  tone(NADA[1], 0.5, 'sine', 0.06);
  tone(NADA[4], 0.6, 'sine', 0.05, 0.04);
}
