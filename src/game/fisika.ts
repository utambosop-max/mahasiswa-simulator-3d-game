// Matematika & fisika game (M12) — fungsi murni, tanpa React/Three, mudah diuji.
// Setiap rumus diberi sumber singkat. Satuan: meter, detik, kilogram, derajat/radian (disebut jelas).
import f4 from '../data/fitur4.json';

export const F4 = f4;
const G = 9.81; // percepatan gravitasi (m/s²)
const RAD = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ===================== 1. Kendaraan (motor/sepeda) =====================
// Model "arkade berbasis fisika": gaya dorong − hambatan udara (k·v²) − gesek gulir (Crr·m·g) = m·a.
// Kecepatan puncak muncul sendiri saat gaya dorong = total hambatan (tidak dipatok).
// Belok: kecepatan sudut dibatasi geometri (ω ≤ v/Rmin, model sepeda kinematik)
// dan gesekan samping ban (v·ω ≤ μ·g). Kemiringan: tan(θ) = v·ω/g = v²/(R·g).

export type ParamKendaraan = { massa: number; dorong: number; hambatanUdara: number; gesekGulir: number; radiusMin: number; rem: number };
export type KeadaanKendaraan = { v: number; arah: number; miring: number; dorong: number };

/** Koefisien gesek ban–jalan: kering vs basah (hujan) */
export const muJalan = (basah: boolean) => (basah ? F4.fisika.muBasah : F4.fisika.muKering);

/** Kecepatan puncak teoretis: dorong = k·v² + Crr·m·g → v = √((F − Crr·m·g)/k) */
export function kecepatanPuncak(p: ParamKendaraan, pengaliDorong = 1): number {
  const sisa = p.dorong * pengaliDorong - p.gesekGulir * p.massa * G;
  return sisa > 0 ? Math.sqrt(sisa / p.hambatanUdara) : 0;
}

/** Jarak henti: s = v² / (2·a), dengan a = μ·g·efisiensiRem */
export const jarakRem = (v: number, mu: number, efisiensi: number) => (v * v) / (2 * mu * G * efisiensi);

/**
 * Satu langkah fisika kendaraan.
 * `gas` 0..1 (besar joystick), `arahTujuan` (rad) = arah joystick di dunia, `mundurRem` = joystick berlawanan arah → rem.
 * Mengubah `k` langsung (dipakai ulang tiap frame, tanpa alokasi).
 */
export function langkahKendaraan(k: KeadaanKendaraan, p: ParamKendaraan, gas: number, arahTujuan: number, dt: number, mu: number, pengaliDorong = 1) {
  const selisih = Math.atan2(Math.sin(arahTujuan - k.arah), Math.cos(arahTujuan - k.arah));
  // Joystick hampir berlawanan arah → rem (hanya saat masih melaju; saat diam = putar balik)
  const rem = gas > 0.1 && Math.abs(selisih) > 2.2 && k.v > 0.5;
  // Gaya
  const dorong = !rem && gas > 0.05 ? p.dorong * pengaliDorong * gas : 0;
  const hambatan = p.hambatanUdara * k.v * k.v + (k.v > 0.01 ? p.gesekGulir * p.massa * G : 0);
  const gayaRem = rem ? mu * G * p.rem * p.massa * gas : 0;
  const a = (dorong - hambatan - gayaRem) / p.massa;
  k.v = Math.max(0, k.v + a * dt);
  k.dorong = dorong;
  // Belok: batas kecepatan sudut dari geometri & gesekan
  let omega = 0;
  if (!rem && gas > 0.05) {
    const batasGeometri = Math.max(1.4, k.v / p.radiusMin); // min 1.4 rad/s agar bisa memutar saat pelan (didorong)
    const batasGesek = k.v > 0.5 ? (mu * G) / k.v : Infinity;
    const maks = Math.min(batasGeometri, batasGesek);
    omega = clamp(selisih * 4, -maks, maks);
    k.arah += omega * dt;
  }
  // Kemiringan visual: θ = atan(v·ω/g), dihaluskan
  const target = Math.atan((k.v * omega) / G);
  k.miring += (clamp(target, -0.6, 0.6) - k.miring) * Math.min(1, dt * 8);
}

/** Energi kinetik ½·m·v² (J) — dipakai untuk menilai keras tidaknya tabrakan */
export const energiKinetik = (m: number, v: number) => 0.5 * m * v * v;

// ===================== 2. Jalan kaki dengan inersia =====================
/** Kecepatan mendekati target dengan percepatan terbatas (m/s²) — gerak terasa berbobot, bukan instan */
export function dekatiKecepatan(v: number, target: number, percepatan: number, dt: number): number {
  const d = target - v;
  const maks = percepatan * dt;
  return v + clamp(d, -maks, maks);
}

// ===================== 3. Matahari (NOAA, persamaan sudut jam) =====================
// Vektor arah matahari dalam koordinat Timur-Utara-Atas dari lintang φ, deklinasi δ, sudut jam h:
//   E = −cos δ · sin h,  N = cos φ · sin δ − sin φ · cos δ · cos h,  U = sin φ · sin δ + cos φ · cos δ · cos h
// Deklinasi (pendekatan Cooper): δ = 23,45° · sin(360°/365 · (n − 81)).  Sudut jam h = 15° · (jam − 12).

/** Hari ke-n dalam tahun dari hari game (game dimulai 1 Agustus = hari ke-213). */
export const hariTahun = (hariGame: number) => ((F4.matahari.hariTahunAwal + hariGame - 2) % 365) + 1;

/** Jam lokal desimal dari menit game (menit 0 = 05.00) */
export const jamDesimal = (menit: number) => ((F4.matahari.jamMulaiHari * 60 + menit) % 1440) / 60;

export type PosisiMatahari = { x: number; y: number; z: number; elevasi: number };
/** Arah matahari di dunia game (x = timur, y = atas, z = selatan karena utara = −z). Hasil ditulis ke `out`. */
export function posisiMatahari(hariGame: number, menit: number, out: PosisiMatahari): PosisiMatahari {
  const phi = F4.matahari.lintang * RAD;
  const delta = 23.45 * RAD * Math.sin(((2 * Math.PI) / 365) * (hariTahun(hariGame) - 81));
  const h = 15 * RAD * (jamDesimal(menit) - 12);
  const e = -Math.cos(delta) * Math.sin(h);
  const n = Math.cos(phi) * Math.sin(delta) - Math.sin(phi) * Math.cos(delta) * Math.cos(h);
  const u = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(h);
  out.x = e;
  out.y = u;
  out.z = -n;
  out.elevasi = Math.asin(clamp(u, -1, 1)) / RAD;
  return out;
}

// ===================== 4. Suhu harian =====================
/** Suhu udara (°C): kurva sinus, minimum ± jam 05–06, maksimum ± jam 14; hujan mendinginkan. */
export function suhuUdara(menit: number, hujan: boolean): number {
  const s = F4.suhu;
  const jam = jamDesimal(menit);
  const t = s.rata + s.amplitudo * Math.sin((2 * Math.PI * (jam - (s.jamPuncak - 6))) / 24);
  return Math.round((t - (hujan ? s.dinginHujan : 0)) * 10) / 10;
}

// ===================== 5. Cuaca rantai Markov (per blok 3 jam) =====================
// Keadaan besok/blok berikut hanya bergantung keadaan sekarang (matriks transisi per musim).
// Angka acak "tetap" dari nomor hari & blok → semua HP online melihat cuaca yang sama.
export type Cuaca = 'cerah' | 'berawan' | 'hujan';
const URUT_CUACA: Cuaca[] = ['cerah', 'berawan', 'hujan'];
export function acakTetap(a: number, b = 0): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** Musim: bulan semester 1–2 = penghujan, 3–4 = kemarau (sederhana). */
const musimHujan = (bulan: number) => ((bulan - 1) % 4) < 2;
/** Cuaca pada blok 3 jam tertentu, berantai dari cuaca pagi hari itu. */
export function cuacaBlok(hari: number, bulan: number, cuacaPagi: Cuaca, blok: number): Cuaca {
  const m = musimHujan(bulan) ? F4.cuaca.transisiHujan : F4.cuaca.transisiKemarau;
  let s = URUT_CUACA.indexOf(cuacaPagi);
  for (let b = 1; b <= blok; b++) {
    const r = acakTetap(hari * 31 + b, 7);
    const baris = m[s];
    s = r < baris[0] ? 0 : r < baris[0] + baris[1] ? 1 : 2;
  }
  return URUT_CUACA[s];
}
export const blokCuaca = (menit: number) => Math.min(7, Math.floor(menit / 180));

// ===================== 6. Tubuh & otak =====================
// Model dua-proses Borbély: tekanan tidur S naik saat terjaga S = 1 − (1 − S₀)·e^(−t/τw),
// turun saat tidur S = S₀·e^(−t/τs); ritme sirkadian C = A·sin(2π(jam − φ)/24).
export function tekananTidurBangun(S: number, menit: number) {
  return 1 - (1 - S) * Math.exp(-menit / (F4.tubuh.tauBangunJam * 60));
}
export function tekananTidurTidur(S: number, menit: number) {
  return S * Math.exp(-menit / (F4.tubuh.tauTidurJam * 60));
}
export function sirkadian(menit: number) {
  return F4.tubuh.amplitudoSirkadian * Math.sin((2 * Math.PI * (jamDesimal(menit) - F4.tubuh.puncakWaspadaJam + 6)) / 24);
}
/** Rasa kantuk 0..1 = tekanan tidur − kewaspadaan sirkadian */
export const kantuk = (S: number, menit: number) => clamp(S - sirkadian(menit), 0, 1);

/** Pemulihan energi tidur: E = Emaks·(1 − e^(−t/τ)) — jam-jam pertama paling memulihkan. */
export const pulihTidur = (energiMaks: number, menitTidur: number) =>
  Math.round(energiMaks * F4.tubuh.skalaTidur * (1 - Math.exp(-menitTidur / F4.tubuh.tauPulihMenit)));

/** Yerkes–Dodson (U terbalik): performa belajar terbaik di stres sedang. 1 di titik optimum. */
export function efisiensiStres(stres: number): number {
  const y = F4.tubuh.yerkes;
  const d = (stres - y.optimum) / (stres < y.optimum ? y.optimum : 100 - y.optimum);
  return clamp(1 - y.turun * d * d, y.minimum, 1);
}
/** Hasil makin kecil untuk sesi belajar ke-n di hari yang sama: 1/(1 + k·(n−1)) */
export const pengaliSesiKe = (n: number) => 1 / (1 + F4.tubuh.jenuhPerSesi * Math.max(0, n - 1));

/** Kurva lupa: retensi R = e^(−t/S), t & S dalam hari. */
export const retensi = (hariSejak: number, kekuatan: number) => Math.exp(-Math.max(0, hariSejak) / Math.max(0.1, kekuatan));
/** Efek jarak (spacing): kekuatan memori bertambah lebih banyak jika dipelajari ulang saat sudah agak lupa. */
export const kekuatanBaru = (S: number, R: number) => S + F4.tubuh.gainMemori * (1 - R + F4.tubuh.gainMinimum);

/** Kafein meluruh eksponensial dengan waktu paruh: K(t) = K₀ · 2^(−t/T½) */
export const luruhKafein = (K: number, menit: number) => K * Math.pow(2, -menit / F4.tubuh.paruhKafeinMenit);

// ===================== 7. Ekonomi =====================
/** Bunga majemuk: P·(1 + r)^n */
export const majemuk = (P: number, r: number, n: number) => P * Math.pow(1 + r, n);
/** Inflasi harga: pengali (1 + i)^(bulan − 1) */
export const pengaliInflasi = (bulan: number) => Math.pow(1 + F4.ekonomi.inflasiBulanan, Math.max(0, bulan - 1));
/** Normal baku dari 2 angka seragam (Box–Muller) */
const normal = (u1: number, u2: number) => Math.sqrt(-2 * Math.log(Math.max(1e-9, u1))) * Math.cos(2 * Math.PI * u2);
/**
 * Harga emas: gerak Brown geometris diskret, ln G(t+1) = ln G(t) + μ − σ²/2 + σ·Z.
 * Dihitung ulang dari hari 1 dengan Z "tetap" per hari → sama di semua HP.
 */
export function hargaEmas(hari: number): number {
  const e = F4.ekonomi.emas;
  let ln = Math.log(e.hargaAwal);
  for (let d = 2; d <= hari; d++) ln += e.mu - (e.sigma * e.sigma) / 2 + e.sigma * normal(acakTetap(d, 101), acakTetap(d, 202));
  return Math.round(Math.exp(ln) / 100) * 100;
}
/** Kenaikan gaji karena pengalaman: 1 + a·log₂(1 + n/b) */
export const pengaliPengalaman = (shift: number) => 1 + F4.ekonomi.gajiLog.a * Math.log2(1 + shift / F4.ekonomi.gajiLog.b);
/** Fungsi logistik (pertumbuhan tanaman, peluang menang lomba) */
export const logistik = (x: number, k = 1, x0 = 0) => 1 / (1 + Math.exp(-k * (x - x0)));

// ===================== 8. Proyektil & panas (mini-game) =====================
/** Posisi proyektil tanpa hambatan: x = v·cos θ·t, y = v·sin θ·t − ½·g·t² */
export function proyektil(v: number, sudutRad: number, t: number, g = G): { x: number; y: number } {
  return { x: v * Math.cos(sudutRad) * t, y: v * Math.sin(sudutRad) * t - 0.5 * g * t * t };
}
/** Hukum pendinginan/pemanasan Newton: T → T_lingkungan + (T − T_lingkungan)·e^(−k·dt) */
export const newton = (T: number, Tling: number, k: number, dt: number) => Tling + (T - Tling) * Math.exp(-k * dt);
/** Osilasi teredam: A·e^(−ζωt)·cos(ωt) (pelampung pancing) */
export const osilasiTeredam = (A: number, zeta: number, omega: number, t: number) => A * Math.exp(-zeta * omega * t) * Math.cos(omega * t);

// ===================== 9. Suara =====================
/** Efek Doppler (sumber bergerak): f' = f · c / (c − v_r), v_r > 0 = mendekat */
export const doppler = (f: number, vRadial: number) => (f * 343) / (343 - clamp(vRadial, -100, 100));
/**
 * Waktu gema RT60 (detik) dengan rumus Sabine: RT60 = 0,161·V / (α·S).
 * V = volume ruang (m³), S = luas semua permukaan (m²), α = koefisien serap rata-rata
 * (0,25 ≈ ruangan berperabot; makin kecil = makin bergaung).
 */
export function rt60Sabine(lebar: number, dalam: number, tinggi: number, alfa = 0.25): number {
  const V = lebar * dalam * tinggi;
  const S = 2 * (lebar * dalam + lebar * tinggi + dalam * tinggi);
  return S > 0 ? (0.161 * V) / (alfa * S) : 0;
}
/** Jeda guntur setelah kilat: t = jarak / 343 m/s */
export const jedaGuntur = (jarakM: number) => jarakM / 343;
/** Frekuensi dasar mesin 1 silinder 4-tak: f = rpm / 120 (satu letupan tiap 2 putaran) */
export const frekuensiMesin = (rpm: number) => rpm / 120;
/** RPM dari kecepatan & gigi otomatis (perbandingan gigi × putaran roda) */
export function rpmMotor(v: number): { rpm: number; gigi: number } {
  const m = F4.fisika.motorSuara;
  const putaranRoda = (v / (2 * Math.PI * m.jariRoda)) * 60; // rpm roda
  let gigi = 0;
  while (gigi < m.rasioGigi.length - 1 && putaranRoda * m.rasioGigi[gigi] * m.rasioAkhir > m.rpmPindah) gigi++;
  const rpm = Math.max(m.rpmIdle, putaranRoda * m.rasioGigi[gigi] * m.rasioAkhir);
  return { rpm, gigi: gigi + 1 };
}
