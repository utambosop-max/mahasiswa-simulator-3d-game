// Server online Mahasiswa Simulator 3D.
// - Menyajikan file game (folder public/ atau dist/) → teman cukup buka http://IP-PC:8787 di HP.
// - Menjadi "penghubung": jam bersama, posisi pemain, chat, traktir, kamar, kerja bareng.
// - Menyimpan progres semua pemain ke file data-online.json (di folder tempat server dijalankan).
// Prinsip: SEMUA pesan dari HP tidak dipercaya → diperiksa tipe, rentang angka & panjang string dulu.
// Jalankan: node server.mjs
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, timingSafeEqual } from 'node:crypto';
import { terimaUpgrade, type Soket } from './soket';
import { mulaiTunnel } from './tunnel';
import { ShiftBareng } from './kerjaBareng';
import {
  BAL,
  PERABOT,
  URUTAN_FASE,
  kategoriBareng,
  type AksiId,
  type JenisSibuk,
  type KategoriBareng,
  type Level,
  type PerabotId,
  type SaveData,
  type TempatKerja,
} from '../src/game/sim';
import { ringkasPeringkat } from '../src/game/m12';
import {
  PORT_SERVER,
  VERSI_MIN,
  VERSI_PROTOKOL,
  bersihkanNama,
  type InfoKamar,
  type InfoPemain,
  type PesanKeGame,
  type PesanKeServer,
  type Pose,
} from '../src/online/protokol';

// ===== Penjaga terakhir: error tak terduga TIDAK boleh mematikan server (progres semua pemain) =====
process.on('uncaughtException', (e) => console.error('⚠️ Error tak terduga (server tetap jalan):', e));
process.on('unhandledRejection', (e) => console.error('⚠️ Promise gagal (server tetap jalan):', e));

// ===== Data yang disimpan =====
type DataPemain = {
  nama: string;
  warna: string;
  kamarId: string;
  save: SaveData | null;
  sampai: number;
  jenis: JenisSibuk | null;
  /** sha256 dari token HP pemilik nama ini (nama tidak bisa dipakai HP lain) */
  tokenHash?: string;
};
type DataKamar = { penghuni: string[]; level: Record<PerabotId, Level> | null };
/** menit = jam bersama dalam menit mutlak (lihat menitMutlak di sim.ts) */
type DataDunia = { versi: number; menit: number; pemain: Record<string, DataPemain>; kamar: Record<string, DataKamar> };
/** Versi format data-online.json. 1 = lama (slot / tanpa versi), 2 = sekarang. */
const VERSI_DATA = 2;

const FILE_DATA = resolve(process.cwd(), 'data-online.json');
const PORT = Number(process.env.PORT) || PORT_SERVER;

// ===== Keamanan (server bisa dibuka ke internet lewat Cloudflare Tunnel) =====
// Kode rahasia dari variabel lingkungan KODE_SERVER (diisi oleh JALANKAN-ONLINE.bat) atau argumen --kode=...
const argKode = process.argv.find((a) => a.startsWith('--kode='))?.slice(7);
const KODE = (process.env.KODE_SERVER ?? argKode ?? '').trim().slice(0, 32);
const MODE_ONLINE = process.argv.includes('--online');
const MAKS_KONEKSI = 30;
const MAKS_KONEKSI_PER_IP = 8; // satu IP tidak boleh memborong semua slot
const KAPASITAS_EMBER = 40; // boleh "meledak" 40 pesan sekaligus...
const ISI_PER_DETIK = 20; // ...tapi rata-rata maks 20 pesan/detik
const MAKS_BYTE_PER_DETIK = 1024 * 1024;
const MAKS_PESAN_KECIL = 16 * 1024;
const MAKS_PESAN_LOBI = 4096; // sebelum kode benar, pesan besar = mencurigakan
const MAKS_TERDAFTAR = 100; // batas jumlah nama pemain tersimpan (cegah file data membengkak)
const BATAS_LOBI_MS = 30000; // belum gabung dalam 30 detik → diputus
const MAKS_SALAH_KODE = 5;
const BLOKIR_MS = 10 * 60 * 1000;
const salahKode = new Map<string, { n: number; sampai: number }>();

const sidik = (s: string) => createHash('sha256').update(s).digest();
/** Bandingkan kode tanpa bocor lewat waktu (timing-safe). */
function kodeCocok(dikirim: unknown): boolean {
  if (!KODE) return true;
  return typeof dikirim === 'string' && timingSafeEqual(sidik(dikirim), sidik(KODE));
}
function terblokir(ip: string): boolean {
  const s = salahKode.get(ip);
  return !!s && s.n >= MAKS_SALAH_KODE && Date.now() < s.sampai;
}
function catatSalahKode(ip: string) {
  const s = salahKode.get(ip);
  const n = s && Date.now() < s.sampai ? s.n + 1 : 1;
  salahKode.set(ip, { n, sampai: Date.now() + BLOKIR_MS });
  console.warn(`🚫 Kode salah dari ${ip} (${n}×)${n >= MAKS_SALAH_KODE ? ' → diblokir 10 menit' : ''}`);
}
// Catatan blokir yang sudah kedaluwarsa dibuang (cegah Map tumbuh terus)
setInterval(() => {
  const now = Date.now();
  for (const [ip, s] of salahKode) if (now >= s.sampai) salahKode.delete(ip);
}, 60 * 1000);
const tokenValid = (t: unknown): t is string => typeof t === 'string' && /^[0-9a-f]{16,64}$/i.test(t);

// Mode online (terbuka ke internet) WAJIB pakai kode rahasia minimal 6 karakter
if (MODE_ONLINE && KODE.length < 6) {
  console.error('❌ Mode online butuh kode rahasia minimal 6 karakter (file kode.txt).');
  console.error('   Hapus kode.txt lalu jalankan ulang untuk membuat kode baru.');
  process.exit(2);
}

// ===== Pembantu validasi =====
const punya = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
/** Objek tanpa prototype → kunci seperti "__proto__" tidak bisa merusak Object.prototype */
const peta = <T>() => Object.create(null) as Record<string, T>;
const objek = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const angkaDalam = (v: unknown, min: number, maks: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(maks, Math.max(min, v)) : undefined;
const teksPendek = (v: unknown, maks: number): string | undefined => (typeof v === 'string' ? v.slice(0, maks) : undefined);
const JENIS_SIBUK: readonly JenisSibuk[] = ['aksi', 'tidur', 'pulang'];
const jenisValid = (v: unknown): v is JenisSibuk => typeof v === 'string' && (JENIS_SIBUK as string[]).includes(v);
const tempatValid = (v: unknown): v is TempatKerja => v === 'warteg' || v === 'warkop';
const warnaValid = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
/** Level perabot kamar: keempat perabot wajib ada & bernilai 1–3. Selain itu → null (ditolak). */
function levelValid(v: unknown): Record<PerabotId, Level> | null {
  if (!objek(v)) return null;
  const hasil = {} as Record<PerabotId, Level>;
  for (const id of PERABOT) {
    const n = v[id];
    if (n !== 1 && n !== 2 && n !== 3) return null;
    hasil[id] = n;
  }
  return hasil;
}

// ===== Muat & simpan data (atomik + pemulihan dari backup) =====
const FOLDER_BACKUP = resolve(process.cwd(), 'backup');

/** Rapikan data dari disk (format lama / field hilang / nilai rusak) → DataDunia versi terbaru. */
function normalisasi(mentah: unknown): DataDunia | null {
  if (!objek(mentah) || !objek(mentah.pemain) || !objek(mentah.kamar)) return null;
  let menit = angkaDalam(mentah.menit, 0, 1e9);
  let dariSlot = false;
  if (menit === undefined) {
    // Data versi lama (jam per fase/slot) → ubah ke menit mutlak, sibuk lama dihapus
    if (typeof mentah.slot !== 'number' || !Number.isFinite(mentah.slot)) return null;
    menit = slotKeMenit(mentah.slot);
    dariSlot = true;
    console.log('🔄 Data lama diubah ke jam real-time.');
  }
  menit = Math.round(menit);
  const pemain = peta<DataPemain>();
  for (const [id, p] of Object.entries(mentah.pemain)) {
    if (!objek(p) || !id || bersihkanNama(id).toLowerCase() !== id) continue;
    const sampai = dariSlot ? menit : angkaDalam(p.sampai, 0, 1e9) ?? menit;
    pemain[id] = {
      nama: bersihkanNama(p.nama) || id,
      warna: warnaValid(p.warna) ? p.warna : '#ffb36b',
      kamarId: typeof p.kamarId === 'string' && p.kamarId ? p.kamarId.slice(0, 40) : `kamar-${id}`,
      save: objek(p.save) ? (p.save as unknown as SaveData) : null,
      sampai,
      jenis: !dariSlot && jenisValid(p.jenis) ? p.jenis : null,
      ...(typeof p.tokenHash === 'string' && /^[0-9a-f]{64}$/.test(p.tokenHash) ? { tokenHash: p.tokenHash } : {}),
    };
  }
  const kamar = peta<DataKamar>();
  for (const [kid, k] of Object.entries(mentah.kamar)) {
    if (!objek(k) || kid === '__proto__') continue;
    const penghuni = Array.isArray(k.penghuni)
      ? [...new Set(k.penghuni.filter((x): x is string => typeof x === 'string' && punya(pemain, x) && pemain[x].kamarId === kid))].slice(0, 2)
      : [];
    if (penghuni.length > 0) kamar[kid] = { penghuni, level: levelValid(k.level) };
  }
  // Setiap pemain harus tercatat di kamarnya (data lama kadang tidak punya daftar kamar)
  for (const [id, p] of Object.entries(pemain)) {
    const k = punya(kamar, p.kamarId) ? kamar[p.kamarId] : undefined;
    if (k?.penghuni.includes(id)) continue;
    if (k && k.penghuni.length < 2) k.penghuni.push(id);
    else if (!k) kamar[p.kamarId] = { penghuni: [id], level: null };
    else {
      p.kamarId = `kamar-${id}`;
      kamar[p.kamarId] = { penghuni: [id], level: null };
    }
  }
  return { versi: VERSI_DATA, menit, pemain, kamar };
}

function bacaFile(f: string): DataDunia | null {
  try {
    return normalisasi(JSON.parse(readFileSync(f, 'utf8')));
  } catch {
    return null;
  }
}

function muatDunia(): DataDunia {
  if (existsSync(FILE_DATA)) {
    const d = bacaFile(FILE_DATA);
    if (d) return d;
    // File rusak: JANGAN ditimpa dunia kosong. Simpan salinannya, lalu pulihkan dari backup terbaru.
    const salinan = FILE_DATA.replace(/\.json$/, `.rusak-${Date.now()}.json`);
    try {
      renameSync(FILE_DATA, salinan);
    } catch {
      // abaikan
    }
    console.error(`⚠️ data-online.json rusak → disalin ke ${salinan}`);
    try {
      const daftar = readdirSync(FOLDER_BACKUP)
        .filter((f) => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(f))
        .sort()
        .reverse();
      for (const f of daftar) {
        const b = bacaFile(join(FOLDER_BACKUP, f));
        if (b) {
          console.log(`♻️ Progres dipulihkan dari backup ${f}`);
          return b;
        }
      }
    } catch {
      // belum ada folder backup
    }
    console.error('⚠️ Tidak ada backup yang bisa dipakai, mulai dunia baru.');
  }
  return { versi: VERSI_DATA, menit: BAL.jam.mulaiFase.pagi, pemain: peta(), kamar: peta() };
}

/** Slot lama (5 per hari) → menit mutlak di awal fase itu. */
function slotKeMenit(slot: number): number {
  const s = Math.max(0, Math.min(1e6, Math.floor(slot)));
  const hari = Math.floor(s / 5);
  const fase = URUTAN_FASE[s % 5];
  return hari * 1440 + BAL.jam.mulaiFase[fase];
}

/** Tulis JSON secara atomik: tulis file sementara dulu, lalu rename (file lama tidak pernah setengah tertulis). */
function tulisAtomik(file: string, isi: string) {
  const tmp = file + '.tmp';
  writeFileSync(tmp, isi);
  try {
    renameSync(tmp, file);
  } catch (e) {
    // Windows: rename kadang gagal sesaat (file sedang dibuka antivirus) → coba timpa langsung
    writeFileSync(file, isi);
    try {
      unlinkSync(tmp);
    } catch {
      // abaikan
    }
    if (process.env.DEBUG_WS) console.warn('rename gagal, ditulis langsung', e);
  }
}

const dunia = muatDunia();
let kotor = true; // tulis segera sekali (hasil migrasi / pemulihan langsung tersimpan)
function simpanSekarang() {
  if (!kotor) return;
  try {
    tulisAtomik(FILE_DATA, JSON.stringify(dunia));
    kotor = false;
  } catch (e) {
    console.error('Gagal menyimpan data (dicoba lagi 3 detik lagi):', e);
  }
}
// Simpan ke disk tiap 3 detik jika ada perubahan
setInterval(simpanSekarang, 3000);
// Server ditutup (Ctrl+C / jendela ditutup / tunnel mati) → simpan dulu agar progres 3 detik terakhir tidak hilang
process.on('exit', simpanSekarang);
if (!MODE_ONLINE) {
  // Mode online: tunnel.ts sudah memasang penangan yang memanggil process.exit → 'exit' di atas tetap jalan
  for (const sinyal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(sinyal, () => process.exit(0));
}

// ===== Backup harian progres (7 hari terakhir) di folder backup/ =====
// Ditulis dari data di memori (selalu valid) — bukan menyalin file yang mungkin rusak.
function backupHarian() {
  try {
    mkdirSync(FOLDER_BACKUP, { recursive: true });
    const tgl = new Date().toISOString().slice(0, 10);
    tulisAtomik(join(FOLDER_BACKUP, `data-${tgl}.json`), JSON.stringify(dunia));
    const lama = readdirSync(FOLDER_BACKUP)
      .filter((f) => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort()
      .slice(0, -7);
    lama.forEach((f) => unlinkSync(join(FOLDER_BACKUP, f)));
  } catch (e) {
    console.error('Gagal backup:', e);
  }
}
if (Object.keys(dunia.pemain).length > 0) backupHarian();
setInterval(backupHarian, 6 * 60 * 60 * 1000); // cek tiap 6 jam (file per tanggal, jadi 1 per hari)
const waktuMulai = Date.now();

// ===== Koneksi aktif =====
type Sesi = {
  soket: Soket;
  ip: string;
  /** Sudah mengirim kode rahasia yang benar */
  lolosKode: boolean;
  id: string | null; // null = belum gabung (masih di lobi) / sudah diganti sesi baru
  pose: Pose | null;
  /** Aksi yang sedang dilakukan (untuk bonus bareng); dapat = sudah menerima bonus */
  aksiKini: { kat: KategoriBareng; tempat: string; sampai: number; dapat: boolean } | null;
  /** Timer batas lobi (dibersihkan saat koneksi tutup) */
  timer: NodeJS.Timeout[];
  /** Waktu chat terakhir (batas 5 chat / 5 detik) */
  chat: number[];
  /** Kapan terakhir boleh traktir / mengajak (cegah spam) */
  traktirLagi: number;
  ajakLagi: number;
};
const sesiList = new Set<Sesi>();
const sesiPemain = (id: string) => {
  for (const s of sesiList) if (s.id === id) return s;
  return null;
};
const sesiAktif = () => [...sesiList].filter((s): s is Sesi & { id: string } => s.id !== null);
const ambilPemain = (id: string): DataPemain | undefined => (punya(dunia.pemain, id) ? dunia.pemain[id] : undefined);

const kirim = (s: Sesi, p: PesanKeGame) => s.soket.kirim(JSON.stringify(p));
const siar = (p: PesanKeGame, kecuali?: Sesi) => {
  const teks = JSON.stringify(p);
  for (const s of sesiAktif()) if (s !== kecuali) s.soket.kirim(teks);
};

const lobiKerja: Record<TempatKerja, string[]> = { warteg: [], warkop: [] };
const shiftAktif = new Map<string, ShiftBareng>(); // id pemain → shift
/** Ajakan pacaran yang menunggu jawaban: penerima → (pengirim → kedaluwarsa ms). Jawaban tanpa ajakan = ditolak. */
const ajakanTertunda = new Map<string, Map<string, number>>();

function infoKamar(kamarId: string): InfoKamar {
  const k = punya(dunia.kamar, kamarId) ? dunia.kamar[kamarId] : { penghuni: [], level: null };
  // Belum pernah di-upgrade bersama → pakai perabot milik penghuni pertama (diperiksa: save dari HP)
  const level = k.level ?? levelValid(ambilPemain(k.penghuni[0] ?? '')?.save?.level);
  return { kamarId, penghuni: k.penghuni.map((id) => ambilPemain(id)?.nama ?? id), level };
}

/** Ringkasan satu pemain untuk teman-temannya. Save berasal dari HP → setiap field disaring & dibatasi. */
function infoPemain(id: string, p: DataPemain): InfoPemain {
  const online = !!sesiPemain(id);
  let status: InfoPemain['status'] = 'offline';
  if (online) {
    if (shiftAktif.has(id)) status = 'kerja';
    else if (p.sampai > dunia.menit && p.jenis) status = p.jenis === 'tidur' ? 'tidur' : p.jenis === 'pulang' ? 'pulang' : 'siap';
    else status = 'bebas';
  }
  const sv: Record<string, unknown> | null = objek(p.save) ? (p.save as unknown as Record<string, unknown>) : null;
  const profil = sv && objek(sv.profil) ? sv.profil : null;
  const pacar = sv && objek(sv.pacar) && sv.pacar.jenis === 'pemain' && typeof sv.pacar.id === 'string' ? sv.pacar.id.slice(0, 16) : null;
  const pakai = sv && Array.isArray(sv.pakai) ? sv.pakai.filter((x): x is string => typeof x === 'string').slice(0, 12).map((x) => x.slice(0, 24)) : [];
  let peringkat: { harta?: number; rekor?: number } = {};
  try {
    peringkat = ringkasPeringkat(p.save);
  } catch (e) {
    console.error('ringkasPeringkat gagal:', e);
  }
  return {
    id,
    nama: p.nama,
    warna: p.warna,
    kamarId: p.kamarId,
    status,
    sampai: p.sampai,
    ipk: angkaDalam(sv?.ipk, 0, 4),
    uang: angkaDalam(sv?.uang, -1e12, 1e12),
    // M12: harta & rekor mini-game (angka dari save diperiksa & dibatasi di ringkasPeringkat)
    ...peringkat,
    kulit: angkaDalam(profil?.kulit, 0, 20),
    rambut: teksPendek(profil?.rambut, 16),
    gaya: teksPendek(profil?.gaya, 16),
    pacar,
    aks: sv ? [...pakai, ...(sv.lulus ? ['toga'] : [])] : undefined,
  };
}

const daftarPemain = (): InfoPemain[] => Object.entries(dunia.pemain).map(([id, p]) => infoPemain(id, p));

const siarPemain = () => {
  perluSiarPemain = false;
  siar({ t: 'pemain', daftar: daftarPemain(), menit: dunia.menit });
};
// Data peringkat (IPK/uang) dikirim paling sering tiap 3 detik
let perluSiarPemain = false;
setInterval(() => {
  if (perluSiarPemain) siarPemain();
}, 3000);

// ===== Jam bersama (real-time) =====
// 1 detik nyata = 1 menit game. Jika SEMUA pemain online sedang sibuk → jam dipercepat
// (×15 saat beraksi, ×40 kalau semua tidur / pulang kampung), tapi tidak melewati waktu selesai
// pemain yang paling cepat selesai. Tidak ada pemain online → jam berhenti.
function lajuJam(): { laju: number; batas: number } {
  const aktif = sesiAktif();
  if (aktif.length === 0) return { laju: 0, batas: dunia.menit };
  const data = aktif.map((s) => ambilPemain(s.id)).filter((p): p is DataPemain => !!p);
  const semuaSibuk = data.length > 0 && data.every((p) => p.sampai > dunia.menit) && aktif.every((s) => !shiftAktif.has(s.id));
  if (!semuaSibuk) return { laju: BAL.jam.menitPerDetik, batas: Infinity };
  const semuaTidur = data.every((p) => p.jenis === 'tidur' || p.jenis === 'pulang');
  return { laju: semuaTidur ? BAL.jam.lajuTidur : BAL.jam.lajuSibuk, batas: Math.min(...data.map((p) => p.sampai)) };
}

let lajuTerakhir = 1;
setInterval(() => {
  const { laju, batas } = lajuJam();
  if (laju <= 0) return;
  const baru = Math.min(dunia.menit + laju, batas);
  const berubahLaju = laju !== lajuTerakhir;
  lajuTerakhir = laju;
  if (baru === dunia.menit && !berubahLaju) return;
  dunia.menit = baru;
  kotor = true;
  // Pemain yang sibuknya sudah selesai → bebas lagi
  let adaSelesai = false;
  for (const s of sesiAktif()) {
    const p = ambilPemain(s.id);
    if (p && p.jenis && p.sampai <= dunia.menit) {
      p.jenis = null;
      s.aksiKini = null;
      adaSelesai = true;
    }
  }
  // ms = jam dinding server → HP menyamakan lampu lalu lintas & gerobak cilok walau jam HP-nya meleset
  siar({ t: 'jam', menit: dunia.menit, laju, ms: Date.now() });
  if (adaSelesai) siarPemain();
}, 1000);

/**
 * Bonus bareng: sesi `s` baru mulai aksi → cari teman yang SEDANG melakukan aksi sekategori di tempat sama.
 * Masing-masing hanya dapat 1× per aksi.
 */
function cekBonus(s: Sesi) {
  const a = s.aksiKini;
  if (!a || !s.id) return;
  for (const t of sesiAktif()) {
    const b = t.aksiKini;
    if (t === s || !b || b.kat !== a.kat || b.tempat !== a.tempat || b.sampai <= dunia.menit) continue;
    const namaT = ambilPemain(t.id)?.nama ?? t.id;
    const namaS = ambilPemain(s.id)?.nama ?? s.id;
    if (!a.dapat) {
      a.dapat = true;
      kirim(s, { t: 'bonus', kat: a.kat, teman: namaT });
    }
    if (!b.dapat) {
      b.dapat = true;
      kirim(t, { t: 'bonus', kat: b.kat, teman: namaS });
    }
  }
}

/** Bersihkan semua keadaan bersama milik pemain `id` (keluar / sesinya diganti). */
function lepasPemain(id: string) {
  keluarLobi(id);
  shiftAktif.get(id)?.berhenti();
  ajakanTertunda.delete(id);
  for (const m of ajakanTertunda.values()) m.delete(id);
}

// ===== Pesan masuk =====
function proses(s: Sesi, m: PesanKeServer) {
  if (m.t === 'halo' || m.t === 'gabung') {
    // Satu koneksi = satu pemain. Halo/gabung ulang dari soket yang sudah masuk diabaikan
    // (dulu: satu soket bisa mendaftarkan banyak nama → data membengkak).
    if (s.id) return;
    // Pintu masuk: kode rahasia server + token HP
    if (!kodeCocok(m.kode)) {
      catatSalahKode(s.ip);
      kirim(s, { t: 'tolak', alasan: '🔑 Kode rahasia server salah. Tanya ke pemilik server.' });
      setTimeout(() => s.soket.tutup(), 200);
      return;
    }
    s.lolosKode = true;
    // Kompatibilitas versi: klien lama tanpa `v` = versi 1
    const v = typeof m.v === 'number' && Number.isFinite(m.v) ? m.v : 1;
    if (v > VERSI_PROTOKOL) return kirim(s, { t: 'tolak', alasan: '🆕 Game kamu lebih baru dari server. Minta pemilik server memperbarui server PC-nya ya!' });
    if (v < VERSI_MIN || !tokenValid(m.token)) return kirim(s, { t: 'tolak', alasan: '📲 Versi game terlalu lama. Perbarui game (APK) dulu ya!' });
    const nama = bersihkanNama(m.nama);
    if (!nama) return kirim(s, { t: 'tolak', alasan: 'Nama tidak boleh kosong / berisi huruf aneh.' });
    const pemilik = ambilPemain(nama.toLowerCase());
    if (pemilik?.tokenHash && pemilik.tokenHash !== sidik(m.token).toString('hex')) {
      return kirim(s, { t: 'tolak', alasan: `Nama "${pemilik.nama}" sudah dipakai pemain lain. Pilih nama lain ya!` });
    }
  }

  if (m.t === 'halo') {
    const nama = bersihkanNama(m.nama);
    const id = nama.toLowerCase();
    const p = ambilPemain(id);
    // Sesi lama dengan HP yang sama (token cocok) boleh diganti saat gabung → reconnect tidak menunggu 45 dtk
    if (sesiPemain(id) && !p?.tokenHash) return kirim(s, { t: 'tolak', alasan: `Nama "${nama}" sedang dipakai pemain yang online.` });
    const dikenal = !!p;
    if (!dikenal && sesiAktif().length >= BAL.online.maksPemain) {
      return kirim(s, { t: 'tolak', alasan: `Server penuh (maks ${BAL.online.maksPemain} pemain).` });
    }
    const kamarTersedia = Object.entries(dunia.kamar)
      .filter(([, k]) => k.penghuni.length === 1)
      .slice(0, 20)
      .map(([kamarId, k]) => ({ kamarId, penghuni: ambilPemain(k.penghuni[0])?.nama ?? '?' }));
    return kirim(s, { t: 'lobi', dikenal, kamarTersedia, menit: dunia.menit, v: VERSI_PROTOKOL });
  }

  if (m.t === 'gabung') {
    const nama = bersihkanNama(m.nama);
    const id = nama.toLowerCase();
    const hash = sidik(m.token).toString('hex');
    let p = ambilPemain(id);
    const lama = sesiPemain(id);
    if (lama && lama !== s) {
      // Nama ini sedang online. Boleh diganti HANYA oleh HP yang sama (token cocok) → putus-sambung / tab baru.
      if (!p?.tokenHash || p.tokenHash !== hash) return kirim(s, { t: 'tolak', alasan: `Nama "${nama}" sedang dipakai pemain yang online.` });
      gantiSesi(lama);
    }
    const warna = warnaValid(m.warna) ? m.warna : '#ffb36b';
    if (!p) {
      if (sesiAktif().length >= BAL.online.maksPemain) return kirim(s, { t: 'tolak', alasan: `Server penuh (maks ${BAL.online.maksPemain} pemain).` });
      if (Object.keys(dunia.pemain).length >= MAKS_TERDAFTAR) return kirim(s, { t: 'tolak', alasan: 'Server sudah menyimpan terlalu banyak pemain. Hubungi pemilik server.' });
      // Pemain baru: kamar sendiri, atau numpang di kamar teman yang masih berpenghuni 1
      let kamarId = `kamar-${id}`;
      const sk = typeof m.sekamarDengan === 'string' ? m.sekamarDengan : null;
      const tujuan = sk && punya(dunia.kamar, sk) ? dunia.kamar[sk] : undefined;
      if (sk && tujuan && tujuan.penghuni.length === 1) {
        kamarId = sk;
        tujuan.penghuni.push(id);
      } else {
        dunia.kamar[kamarId] = { penghuni: [id], level: null };
      }
      p = { nama, warna, kamarId, save: null, sampai: dunia.menit, jenis: null };
      dunia.pemain[id] = p;
    } else {
      p.warna = warna;
      p.nama = nama;
    }
    // Ikat nama ini ke HP ini (pemain lama tanpa token: diikat sekarang)
    if (!p.tokenHash) p.tokenHash = hash;
    // Sibuk dari sesi lama yang sudah lewat → bebas
    if (p.sampai <= dunia.menit) {
      p.sampai = dunia.menit;
      p.jenis = null;
    }
    kotor = true;
    s.id = id;
    s.timer.forEach(clearTimeout);
    s.timer = [];
    kirim(s, { t: 'selamat', id, save: p.save, menit: dunia.menit, kamar: infoKamar(p.kamarId), sampai: p.sampai, jenis: p.jenis });
    // Langsung kirim jam (dengan ms) agar lampu/cilok sinkron tanpa menunggu tick berikutnya
    kirim(s, { t: 'jam', menit: dunia.menit, laju: lajuTerakhir, ms: Date.now() });
    // Beri tahu teman sekamar bahwa kamarnya sekarang berdua
    const kamar = infoKamar(p.kamarId);
    for (const pid of punya(dunia.kamar, p.kamarId) ? dunia.kamar[p.kamarId].penghuni : []) {
      const ss = sesiPemain(pid);
      if (ss && ss !== s) kirim(ss, { t: 'kamar', kamar, oleh: null });
    }
    if (!lama) siar({ t: 'chat', dari: id, teks: '👋 masuk ke Kampung Mahasiswa!' }, s);
    siarPemain();
    console.log(`${lama ? '🔁' : '➕'} ${nama} ${lama ? 'menyambung ulang' : 'masuk'} (${sesiAktif().length} online)`);
    return;
  }

  // Pesan lain hanya untuk pemain yang sudah gabung
  const id = s.id;
  if (!id) return;
  const p = ambilPemain(id);
  if (!p) return;

  switch (m.t) {
    case 'pose': {
      // Validasi: hanya angka wajar & lokasi yang dikenal (data dari HP tidak dipercaya mentah-mentah)
      const q: unknown = m.pose;
      const angka = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 500;
      if (!objek(q) || !angka(q.x) || !angka(q.z) || !angka(q.rotY)) return;
      if (q.lokasi !== 'kamar' && q.lokasi !== 'dunia' && q.lokasi !== 'gedung') return;
      s.pose = {
        x: q.x,
        z: q.z,
        rotY: q.rotY,
        lokasi: q.lokasi,
        gedung: typeof q.gedung === 'string' ? q.gedung.slice(0, 24) : null,
        motor: !!q.motor,
        gerak: !!q.gerak,
      };
      return;
    }
    case 'ajak': {
      // Ajakan pacaran / putus ke pemain lain (diteruskan; jawaban dari penerima)
      if (typeof m.ke !== 'string' || (m.jenis !== 'pacaran' && m.jenis !== 'putus')) return;
      const tujuan = sesiPemain(m.ke);
      if (!tujuan || tujuan === s) return;
      const now = Date.now();
      if (m.jenis === 'pacaran') {
        if (now < s.ajakLagi) return; // spam ajakan
        s.ajakLagi = now + 3000;
        const daftar = ajakanTertunda.get(m.ke) ?? new Map<string, number>();
        daftar.set(id, now + 2 * 60 * 1000);
        ajakanTertunda.set(m.ke, daftar);
      }
      kirim(tujuan, { t: 'ajak', dari: id, nama: p.nama, jenis: m.jenis });
      return;
    }
    case 'jawabAjak': {
      if (typeof m.ke !== 'string' || m.jenis !== 'pacaran') return;
      // Hanya boleh menjawab ajakan yang benar-benar ada (cegah "memaksa" orang lain jadi pacar)
      const daftar = ajakanTertunda.get(id);
      const kedaluwarsa = daftar?.get(m.ke);
      if (!daftar || kedaluwarsa === undefined) return;
      daftar.delete(m.ke);
      if (daftar.size === 0) ajakanTertunda.delete(id);
      if (Date.now() > kedaluwarsa) return;
      const asal = sesiPemain(m.ke);
      if (!asal || asal === s) return;
      const terima = m.terima === true;
      kirim(asal, { t: 'jawabAjak', dari: id, nama: p.nama, jenis: 'pacaran', terima });
      if (terima) {
        siar({ t: 'chat', dari: id, teks: `💘 resmi pacaran dengan ${ambilPemain(m.ke)?.nama ?? m.ke}!` });
        perluSiarPemain = true;
      }
      return;
    }
    case 'simpan': {
      // Save pemain SENDIRI saja. Harus objek dengan uang berupa angka finit.
      const sv: unknown = m.save;
      if (!objek(sv) || typeof sv.uang !== 'number' || !Number.isFinite(sv.uang)) return;
      p.save = sv as unknown as SaveData;
      kotor = true;
      perluSiarPemain = true; // IPK/uang di papan peringkat ikut diperbarui
      return;
    }
    case 'siap': {
      const sampai = Math.round(Number(m.sampai));
      // Sibuk paling lama 2 hari game (pulang kampung + aksi); selain itu dianggap pesan curang
      if (!Number.isFinite(sampai) || !(sampai > dunia.menit) || sampai > dunia.menit + 2880) return;
      if (!jenisValid(m.jenis)) return;
      p.sampai = sampai;
      p.jenis = m.jenis;
      const kat = typeof m.aksi === 'string' ? kategoriBareng(m.aksi as AksiId) : null;
      const tempat = typeof m.tempat === 'string' ? m.tempat.slice(0, 60) : null;
      const sebelum = s.aksiKini;
      // Aksi sekategori di tempat sama yang masih berjalan → status "sudah dapat bonus" dipertahankan
      // (cegah memanen bonus dengan mengirim "siap" berulang-ulang)
      const sudahDapat = !!sebelum && sebelum.dapat && sebelum.kat === kat && sebelum.tempat === tempat && sebelum.sampai > dunia.menit;
      s.aksiKini = kat && tempat ? { kat, tempat, sampai, dapat: sudahDapat } : null;
      kotor = true;
      cekBonus(s);
      siarPemain();
      return;
    }
    case 'chat': {
      if (typeof m.teks !== 'string') return;
      // Buang karakter kontrol, maks 60 karakter
      // (karakter kontrol & pemisah baris diganti spasi)
      const teks = Array.from(m.teks, (c) => (c.charCodeAt(0) < 32 || c === '\u007f' || c === '\u2028' || c === '\u2029' ? ' ' : c)).join('').trim().slice(0, 60);
      if (!teks) return;
      // Batas 5 chat per 5 detik per pemain (cegah spam ke semua HP)
      const now = Date.now();
      s.chat = s.chat.filter((t) => now - t < 5000);
      if (s.chat.length >= 5) return;
      s.chat.push(now);
      siar({ t: 'chat', dari: id, teks });
      return;
    }
    case 'traktir': {
      const ke = typeof m.ke === 'string' ? m.ke.slice(0, 24) : '';
      const jumlah = typeof m.jumlah === 'number' ? m.jumlah : 0;
      const tujuan = ke ? sesiPemain(ke) : null;
      const now = Date.now();
      // Server ikut memeriksa uang di save terakhir pengirim (HP curang tidak bisa "mencetak" uang untuk teman)
      const uang = angkaDalam(p.save?.uang, -1e12, 1e12) ?? 0;
      const ok = !!tujuan && ke !== id && (BAL.online.traktir as number[]).includes(jumlah) && uang >= jumlah && now >= s.traktirLagi;
      if (ok && tujuan && p.save) {
        s.traktirLagi = now + 1500;
        // Kurangi juga salinan save di server sampai HP mengirim save barunya
        p.save = { ...p.save, uang: uang - jumlah };
        kotor = true;
        kirim(tujuan, { t: 'traktir', dari: id, jumlah });
      }
      kirim(s, { t: 'traktirHasil', ok, ke, jumlah });
      return;
    }
    case 'upgradeKamar': {
      const k = punya(dunia.kamar, p.kamarId) ? dunia.kamar[p.kamarId] : undefined;
      const level = levelValid(m.level);
      if (!k || !level) return;
      k.level = level;
      kotor = true;
      const info = infoKamar(p.kamarId);
      for (const pid of k.penghuni) {
        const ss = sesiPemain(pid);
        if (ss && ss !== s) kirim(ss, { t: 'kamar', kamar: info, oleh: p.nama });
      }
      return;
    }
    case 'kerjaLobi':
      if (shiftAktif.has(id)) return;
      keluarLobi(id);
      if (tempatValid(m.tempat)) {
        lobiKerja[m.tempat].push(id);
        siarLobi(m.tempat);
      }
      return;
    case 'kerjaMulai': {
      if (!tempatValid(m.tempat)) return;
      const tempat = m.tempat;
      const lobi = lobiKerja[tempat];
      if (!lobi.includes(id) || shiftAktif.has(id)) return;
      const teman = lobi.find((x) => x !== id && !shiftAktif.has(x) && !!sesiPemain(x));
      if (!teman) return;
      const anggota = [id, teman];
      keluarLobi(id);
      keluarLobi(teman);
      const shift = new ShiftBareng(
        tempat,
        anggota,
        (k) => anggota.forEach((a) => {
          const ss = sesiPemain(a);
          if (ss) kirim(ss, { t: 'kerja', k });
        }),
        (k) => {
          anggota.forEach((a) => {
            if (shiftAktif.get(a) === shift) shiftAktif.delete(a);
            const ss = sesiPemain(a);
            if (ss) kirim(ss, { t: 'kerjaSelesai', tempat: k.tempat, benar: k.benar, gagal: k.gagal, tips: k.tips });
          });
          siarPemain();
        },
      );
      anggota.forEach((a) => shiftAktif.set(a, shift));
      siarPemain();
      return;
    }
    case 'kerjaTap':
      if (typeof m.bahan === 'string') shiftAktif.get(id)?.tap(id, m.bahan.slice(0, 32));
      return;
    case 'kerjaBerhenti':
      shiftAktif.get(id)?.berhenti();
      return;
  }
}

/** Sesi lama diganti sambungan baru dari HP yang sama: bersihkan tanpa mengumumkan "keluar". */
function gantiSesi(lama: Sesi) {
  const id = lama.id;
  if (!id) return;
  lama.id = null;
  lama.pose = null;
  lepasPemain(id);
  kirim(lama, { t: 'tolak', alasan: '📱 Akunmu baru saja masuk dari tab/HP lain, jadi sambungan ini ditutup.', ganda: true });
  setTimeout(() => lama.soket.tutup(1000), 100);
}

function keluarLobi(id: string) {
  for (const t of ['warteg', 'warkop'] as const) {
    const i = lobiKerja[t].indexOf(id);
    if (i >= 0) {
      lobiKerja[t].splice(i, 1);
      siarLobi(t);
    }
  }
}

function siarLobi(t: TempatKerja) {
  const ids = lobiKerja[t];
  for (const pid of ids) {
    const ss = sesiPemain(pid);
    if (ss) kirim(ss, { t: 'kerjaLobi', tempat: t, ids });
  }
}

// Posisi pemain disiarkan 10×/detik. Hemat kuota: hanya pose yang BERUBAH sejak siaran lalu (delta),
// plus siaran lengkap tiap 1 detik (pemain yang baru masuk / paket yang hilang tetap tersusul).
const poseTerkirim = new WeakMap<Sesi, Pose>();
let detakPose = 0;
setInterval(() => {
  const lengkap = ++detakPose % 10 === 0;
  const daftar: { id: string; pose: Pose }[] = [];
  for (const s of sesiAktif()) {
    if (!s.pose) continue;
    if (lengkap || poseTerkirim.get(s) !== s.pose) daftar.push({ id: s.id, pose: s.pose });
    poseTerkirim.set(s, s.pose);
  }
  if (daftar.length > 0) siar({ t: 'pose', daftar });
}, 100);

// ===== HTTP: sajikan file game =====
const SINI = dirname(fileURLToPath(import.meta.url));
const FOLDER_WEB = [process.env.WEB_DIR, join(SINI, 'public'), join(SINI, '..', 'dist')].find(
  (f): f is string => !!f && existsSync(join(f, 'index.html')),
);

const JENIS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const http = createServer((req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      res.end();
      return;
    }
    // Cek kesehatan server (dipakai STATUS-SERVER.bat): tidak membocorkan data pemain/kode
    if ((req.url ?? '').split('?')[0] === '/sehat') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ ok: true, online: sesiAktif().length, koneksi: sesiList.size, nyalaMenit: Math.round((Date.now() - waktuMulai) / 60000) }));
      return;
    }
    if (!FOLDER_WEB) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Folder game (public/ atau dist/) tidak ditemukan. Jalankan "npm run build" dulu.');
      return;
    }
    let url: string;
    try {
      url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    if (url.includes('\0')) {
      res.writeHead(400);
      res.end();
      return;
    }
    const target = normalize(join(FOLDER_WEB, url === '/' ? 'index.html' : url));
    // Cegah akses file di luar folder game (mis. /../../rahasia.txt)
    if (!target.startsWith(resolve(FOLDER_WEB) + sep) && target !== resolve(FOLDER_WEB, 'index.html')) {
      res.writeHead(403);
      res.end();
      return;
    }
    const file = existsSync(target) && statSync(target).isFile() ? target : join(FOLDER_WEB, 'index.html');
    const isi = readFileSync(file);
    res.writeHead(200, {
      'content-type': JENIS[extname(file)] ?? 'application/octet-stream',
      'content-length': isi.length,
      'cache-control': file.endsWith('index.html') ? 'no-store' : 'public, max-age=3600',
      // Header keamanan dasar (halaman bisa diakses dari internet)
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'content-security-policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; worker-src 'self' blob:; frame-ancestors 'none'",
    });
    res.end(req.method === 'HEAD' ? undefined : isi);
  } catch (e) {
    console.error('HTTP error:', e);
    try {
      res.writeHead(500);
      res.end();
    } catch {
      // abaikan
    }
  }
});

http.on('upgrade', (req, socket, head: Buffer) => {
  socket.on('error', () => socket.destroy()); // error jaringan sebelum handshake tidak boleh crash
  if (!(req.url ?? '').startsWith('/ws')) {
    socket.destroy();
    return;
  }
  // IP asli: lewat Cloudflare Tunnel koneksi datang dari localhost, IP pemain ada di header cf-connecting-ip
  const dariLokal = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '');
  const cf = req.headers['cf-connecting-ip'];
  const ip = ((dariLokal && typeof cf === 'string' ? cf : req.socket.remoteAddress) ?? '?').slice(0, 64);
  let dariIpIni = 0;
  for (const x of sesiList) if (x.ip === ip) dariIpIni++;
  if (sesiList.size >= MAKS_KONEKSI || dariIpIni >= MAKS_KONEKSI_PER_IP || terblokir(ip)) {
    socket.destroy();
    return;
  }
  const soket = terimaUpgrade(req, socket, head);
  if (!soket) return;
  const s: Sesi = { soket, ip, id: null, pose: null, aksiKini: null, lolosKode: false, timer: [], chat: [], traktirLagi: 0, ajakLagi: 0 };
  sesiList.add(s);
  // Koneksi yang tidak mengirim kode benar dalam 30 detik → diputus (cegah koneksi menggantung).
  // Yang kodenya benar diberi 10 menit untuk memilih kamar. Timer dibersihkan saat gabung / tutup.
  s.timer.push(
    setTimeout(() => {
      if (!s.id && !s.lolosKode) soket.tutup();
    }, BATAS_LOBI_MS),
    setTimeout(() => {
      if (!s.id) soket.tutup();
    }, 10 * 60 * 1000),
  );
  // Batas laju "token bucket" (OWASP): ember berisi KAPASITAS_EMBER token, terisi ISI_PER_DETIK token/detik.
  // Tiap pesan memakai 1 token. Laju sah: pose 10/dtk + sesekali chat/siap/simpan → jauh di bawah 20/dtk.
  let token = KAPASITAS_EMBER;
  let isiTerakhir = Date.now();
  let jendela = Date.now();
  let byte = 0;
  soket.onPesan = (teks) => {
    const now = Date.now();
    token = Math.min(KAPASITAS_EMBER, token + ((now - isiTerakhir) / 1000) * ISI_PER_DETIK);
    isiTerakhir = now;
    if (now - jendela > 1000) {
      jendela = now;
      byte = 0;
    }
    byte += teks.length;
    token -= 1;
    if (token < 0 || byte > MAKS_BYTE_PER_DETIK) {
      console.warn(`🚫 Banjir pesan dari ${ip}, koneksi diputus`);
      soket.tutup(1008);
      return;
    }
    // Belum lolos kode: hanya pesan kecil (halo/gabung) yang masuk akal
    if (!s.lolosKode && teks.length > MAKS_PESAN_LOBI) {
      soket.tutup(1009);
      return;
    }
    // Hanya "simpan" (save lengkap) yang boleh besar; pesan lain maks 16 KB (OWASP: batasi ukuran pesan)
    if (teks.length > MAKS_PESAN_KECIL && !teks.startsWith('{"t":"simpan"')) {
      soket.tutup(1009);
      return;
    }
    let m: unknown;
    try {
      m = JSON.parse(teks);
    } catch {
      return;
    }
    if (!objek(m) || typeof m.t !== 'string') return;
    try {
      proses(s, m as PesanKeServer);
    } catch (e) {
      console.error(`Error memproses pesan "${String(m.t).slice(0, 20)}":`, e);
    }
  };
  soket.onTutup = () => {
    sesiList.delete(s);
    s.timer.forEach(clearTimeout);
    s.timer = [];
    if (s.id) {
      const id = s.id;
      s.id = null;
      lepasPemain(id);
      console.log(`➖ ${ambilPemain(id)?.nama ?? id} keluar (${sesiAktif().length} online)`);
      siar({ t: 'chat', dari: id, teks: '👋 keluar dari game.' });
      siarPemain();
    }
  };
});

http.on('error', (e: NodeJS.ErrnoException) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} sedang dipakai program lain (mungkin server ini sudah jalan di jendela lain).`);
    process.exit(3);
  }
  console.error('Server HTTP error:', e);
});

http.listen(PORT, '0.0.0.0', () => {
  console.log('==============================================');
  console.log('  🎓 Server Mahasiswa Simulator 3D — ONLINE');
  console.log('==============================================');
  console.log(`  Folder game : ${FOLDER_WEB ?? '(tidak ada!)'}`);
  console.log(`  Data pemain : ${FILE_DATA}`);
  console.log('  Buka salah satu alamat ini di browser HP (satu WiFi):');
  for (const daftar of Object.values(networkInterfaces())) {
    for (const a of daftar ?? []) {
      if (a.family === 'IPv4' && !a.internal) console.log(`   👉 http://${a.address}:${PORT}`);
    }
  }
  console.log(`  (di PC ini sendiri: http://localhost:${PORT})`);
  console.log(KODE ? `  🔑 Kode rahasia server: ${KODE}` : '  ⚠️ Tanpa kode rahasia (siapa pun yang tahu alamatnya bisa masuk).');
  console.log('  Biarkan jendela ini terbuka selama main. Tutup = server mati.');
  if (MODE_ONLINE) {
    if (!KODE) console.warn('  ⚠️ Mode online TANPA kode rahasia sangat tidak disarankan!');
    void mulaiTunnel(PORT, SINI, (url) => {
      const host = url.replace('https://', '');
      console.log('');
      console.log('==============================================');
      console.log('  🌍 ONLINE! Bagikan ke teman (dari mana saja):');
      console.log(`  👉 Buka di browser HP : ${url}`);
      console.log(`  👉 Atau di APK, alamat: ${host}`);
      if (KODE) console.log(`  🔑 Kode rahasia       : ${KODE}`);
      console.log('  (link juga disimpan di file link-online.txt)');
      console.log('  ⚠️ Link berganti setiap server dinyalakan ulang.');
      console.log('  ⏳ Link baru kadang butuh ± 1 menit sebelum bisa dibuka di semua HP.');
      console.log('==============================================');
    });
  }
});
