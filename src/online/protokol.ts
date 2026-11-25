// Protokol pesan antara game (HP/browser) ↔ server online.
// File ini dipakai bersama oleh game (src/) dan server (server/), jadi JANGAN import React di sini.
import type { AksiId, JenisSibuk, KategoriBareng, Level, Lokasi, PerabotId, SaveData, TempatKerja } from '../game/sim';

export const PORT_SERVER = 8787;

/**
 * Versi protokol. Naikkan jika format pesan berubah TIDAK kompatibel.
 * - 1 = klien lama (tanpa field `v`) → masih diterima selama >= VERSI_MIN.
 * - 2 = jam membawa `ms` (jam server untuk lampu/cilok), `tolak.ganda`, `lobi.v`.
 */
export const VERSI_PROTOKOL = 2;
/** Versi klien paling lama yang masih diterima server. */
export const VERSI_MIN = 1;

/** Status pemain yang terlihat oleh teman-temannya. */
export type StatusPemain = 'bebas' | 'siap' | 'tidur' | 'pulang' | 'kerja' | 'offline';

export type InfoPemain = {
  id: string;
  nama: string;
  warna: string;
  kamarId: string;
  status: StatusPemain;
  /** Sibuk sampai menit mutlak ini (lihat menitMutlak di sim.ts) */
  sampai: number;
  /** Untuk papan peringkat (dari save terakhir di server) */
  ipk?: number;
  uang?: number;
  /** M12: total harta (uang + tabungan + deposito + emas) & jumlah rekor mini-game ×100 — dihitung server */
  harta?: number;
  rekor?: number;
  /** Penampilan dari profil karakter */
  kulit?: number;
  rambut?: string;
  gaya?: string;
  /** Pacar (id pemain online) — untuk tanda 💞 */
  pacar?: string | null;
  /** Aksesoris yang sedang dipakai (+ 'toga' jika sudah wisuda) */
  aks?: string[];
};

export type InfoKamar = { kamarId: string; penghuni: string[]; level: Record<PerabotId, Level> | null };

/** Posisi pemain (dikirim ± 10×/detik). */
export type Pose = { x: number; z: number; rotY: number; lokasi: Lokasi; gedung?: string | null; motor: boolean; gerak: boolean };

/** Keadaan shift kerja bareng (dikendalikan server agar adil untuk kedua pemain). */
export type KeadaanKerjaBareng = {
  tempat: TempatKerja;
  anggota: string[]; // id pemain; bahan ke-i dipegang anggota[i % anggota.length]
  idx: number;
  total: number;
  pelanggan: { no: number; wajah: string; menuId: string; sabar: number; terisi: string[] } | null;
  /** Sisa kesabaran (ms) saat pesan dikirim; game menghitung mundur sendiri */
  sisaMs: number;
  reaksi: { teks: string; senang: boolean } | null;
  salah: { bahan: string; oleh: string } | null;
  benar: number;
  gagal: number;
  tips: number;
  selesai: boolean;
};

// ===== Game → Server =====
export type PesanKeServer =
  // kode = kode rahasia server (dari pemilik server); token = identitas acak HP ini (cegah orang lain memakai namamu)
  // v = VERSI_PROTOKOL klien (klien lama tidak mengirimnya → dianggap 1)
  | { t: 'halo'; nama: string; kode: string; token: string; v?: number }
  | { t: 'gabung'; nama: string; warna: string; sekamarDengan: string | null; kode: string; token: string; v?: number }
  | { t: 'pose'; pose: Pose }
  | { t: 'siap'; sampai: number; jenis: JenisSibuk; aksi: AksiId | null; tempat: string | null }
  | { t: 'simpan'; save: SaveData }
  | { t: 'chat'; teks: string }
  | { t: 'traktir'; ke: string; jumlah: number }
  | { t: 'upgradeKamar'; level: Record<PerabotId, Level>; oleh: string }
  | { t: 'kerjaLobi'; tempat: TempatKerja | null }
  | { t: 'kerjaMulai'; tempat: TempatKerja }
  | { t: 'kerjaTap'; bahan: string }
  | { t: 'kerjaBerhenti' }
  // M11: ajakan pacaran antar-pemain (penerima harus setuju) & putus
  | { t: 'ajak'; ke: string; jenis: 'pacaran' | 'putus' }
  | { t: 'jawabAjak'; ke: string; jenis: 'pacaran'; terima: boolean };

// ===== Server → Game =====
export type PesanKeGame =
  | { t: 'lobi'; dikenal: boolean; kamarTersedia: { kamarId: string; penghuni: string }[]; menit: number; v?: number }
  // ganda = sesi ini diganti sambungan baru dari HP/tab yang sama → jangan sambung ulang otomatis
  | { t: 'tolak'; alasan: string; ganda?: boolean }
  | { t: 'selamat'; id: string; save: SaveData | null; menit: number; kamar: InfoKamar; sampai: number; jenis: JenisSibuk | null }
  | { t: 'pemain'; daftar: InfoPemain[]; menit: number }
  | { t: 'pose'; daftar: { id: string; pose: Pose }[] }
  // Jam bersama: menit mutlak sekarang & laju (menit game per detik nyata; dipercepat jika semua pemain sibuk)
  // ms = Date.now() server (v2) → HP menghitung selisih jam agar lampu lalu lintas & cilok sama persis
  | { t: 'jam'; menit: number; laju: number; ms?: number }
  // Bonus aksi bareng (dikirim saat ada teman yang melakukan aksi sekategori di tempat yang sama)
  | { t: 'bonus'; kat: KategoriBareng; teman: string }
  | { t: 'chat'; dari: string; teks: string }
  | { t: 'traktir'; dari: string; jumlah: number }
  | { t: 'traktirHasil'; ok: boolean; ke: string; jumlah: number }
  | { t: 'kamar'; kamar: InfoKamar; oleh: string | null }
  | { t: 'kerjaLobi'; tempat: TempatKerja; ids: string[] }
  | { t: 'kerja'; k: KeadaanKerjaBareng }
  | { t: 'kerjaSelesai'; tempat: TempatKerja; benar: number; gagal: number; tips: number }
  | { t: 'ajak'; dari: string; nama: string; jenis: 'pacaran' | 'putus' }
  | { t: 'jawabAjak'; dari: string; nama: string; jenis: 'pacaran'; terima: boolean };

/** Kunci tempat untuk bonus bareng: di kamar → per kamar; di luar → per aksi (tiap aksi punya 1 tempat). */
export const kunciTempat = (aksi: AksiId, lokasi: Lokasi, kamarId: string) => (lokasi === 'kamar' ? `kamar:${kamarId}` : `aksi:${aksi}`);

/**
 * Ubah alamat server yang diketik pemain menjadi URL WebSocket.
 * - "https://abc.trycloudflare.com" atau domain tanpa port → wss:// (online lewat internet, terenkripsi)
 * - "192.168.1.5:8787" / "localhost:8787" / "http://..." → ws:// (satu WiFi)
 */
export function urlWebSocket(alamat: string): string {
  const a = alamat.trim();
  const aman = /^(https|wss):\/\//i.test(a);
  const biasa = /^(http|ws):\/\//i.test(a);
  const host = a.replace(/^(wss?|https?):\/\//i, '').replace(/\/.*$/, '');
  const pakaiIpAtauPort = /:\d+$/.test(host) || /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host === 'localhost';
  const wss = aman || (!biasa && !pakaiIpAtauPort);
  return `${wss ? 'wss' : 'ws'}://${host}/ws`;
}

/** Nama yang dipakai sebagai kunci objek JS → bisa merusak server (prototype pollution). */
const NAMA_TERLARANG = new Set(['__proto__', 'constructor', 'prototype', 'hasownproperty', 'tostring', 'valueof']);

/** Rapikan nama dari HP: hanya huruf/angka/spasi/_.- , maks 12. Bukan string / nama terlarang → ''. */
export const bersihkanNama = (n: unknown): string => {
  if (typeof n !== 'string') return '';
  const b = n
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .trim()
    .slice(0, 12);
  return NAMA_TERLARANG.has(b.toLowerCase()) ? '' : b;
};
