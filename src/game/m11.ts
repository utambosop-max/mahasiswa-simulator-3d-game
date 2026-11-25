// M11: kos (pindah kos, tipe, pemilik, jam malam, hantu, toilet), warga & pacaran, beasiswa.
// Fungsi murni tanpa React. Sengaja TIDAK mengimpor nilai dari sim.ts (hanya tipe) agar tidak ada
// import melingkar — sim.ts yang memanggil fungsi-fungsi di sini.
import f3 from '../data/fitur3.json';
import f2 from '../data/fitur2.json';
import type { Efek, SaveData, Tunda } from './sim';

export const F3 = f3;
export type KosDef = (typeof f3.kos.daftar)[number] & { efek: { stresMalam?: number } };
export const DAFTAR_KOS = f3.kos.daftar as KosDef[];
export type WargaDef = (typeof f3.warga)[number];
export const WARGA = f3.warga as WargaDef[];
export type BeasiswaDef = (typeof f3.beasiswa)[number] & {
  syarat: { ipkMin: number; hartaMaks?: number; sksMin?: number; jurusan?: string[]; ukm?: boolean; skillMin?: Record<string, number> };
};
export const BEASISWA = f3.beasiswa as BeasiswaDef[];
const SOS = f3.sosial;

/** Pacar: NPC warga atau pemain online. */
export type Pacar = { jenis: 'npc' | 'pemain'; id: string; nama: string; sejak: number; temuHari: number };

// ===== Pembantu kecil (salinan sederhana dari sim.ts agar tidak melingkar) =====
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function ubah(d: SaveData, e: Efek): SaveData {
  return {
    ...d,
    uang: d.uang + (e.uang ?? 0),
    ipk: Math.round(clamp(d.ipk + (e.ipk ?? 0), 0, 4) * 1000) / 1000,
    energi: Math.round(clamp(d.energi + (e.energi ?? 0), 0, 100)),
    stres: Math.round(clamp(d.stres + (e.stres ?? 0), 0, 100)),
  };
}
const rp = (n: number) => `${n < 0 ? '−' : ''}Rp${Math.abs(Math.round(n)).toLocaleString('id-ID')}`;
const tambahStat = (d: SaveData, k: string, n = 1): SaveData => ({ ...d, stat: { ...d.stat, [k]: (d.stat[k] ?? 0) + n } });
const lvRelasi = (d: SaveData, id: string) => f2.relasiLevel.filter((b) => (d.relasi[id] ?? 0) >= b).length;
const jamTeks = (m: number) => {
  const t = (5 * 60 + m) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}.${String(t % 60).padStart(2, '0')}`;
};

// ===== Kos =====
export const kosDari = (d: Pick<SaveData, 'kos'>): KosDef => DAFTAR_KOS.find((k) => k.id === d.kos) ?? DAFTAR_KOS[0];

/** Harga kos sebulan (patungan ½ jika sekamar dengan teman online / tinggal bareng pacar). */
export function hargaKos(d: SaveData): number {
  const k = kosDari(d);
  const patungan = d.kamarBerdua || d.tinggalBareng;
  return Math.round(k.harga * (patungan ? SOS.pengaliKosTinggalBareng : 1));
}

export function cekPindahKos(d: SaveData, id: string): { boleh: boolean; alasan?: string; biaya: number } {
  const k = DAFTAR_KOS.find((x) => x.id === id);
  if (!k) return { boleh: false, alasan: 'Kos tidak ditemukan', biaya: 0 };
  const biaya = k.harga + f3.kos.biayaPindah;
  if (k.id === d.kos) return { boleh: false, alasan: '🏠 Kamu sudah tinggal di sini.', biaya };
  if (d.kamarBerdua) return { boleh: false, alasan: '👥 Kamu kos patungan dengan teman online, tidak bisa pindah sendiri.', biaya };
  const sisa = d.kosPindahHari + f3.kos.jedaPindahHari - d.hari;
  if (d.kosPindahHari > 0 && sisa > 0) return { boleh: false, alasan: `📦 Baru pindah! Tunggu ${sisa} hari lagi.`, biaya };
  if (d.uang < biaya) return { boleh: false, alasan: `💸 Butuh ${rp(biaya)} (sewa bulan ini + angkut barang).`, biaya };
  return { boleh: true, biaya };
}

/** Pindah kos: bayar sewa kos baru bulan ini + biaya angkut. Perabot ikut dibawa. */
export function pindahKos(d: SaveData, id: string): { data: SaveData; pesan: string[]; ditolak?: boolean } {
  const c = cekPindahKos(d, id);
  if (!c.boleh) return { data: d, pesan: [c.alasan ?? 'Tidak bisa pindah'], ditolak: true };
  const k = DAFTAR_KOS.find((x) => x.id === id) ?? DAFTAR_KOS[0];
  const pesan = [`📦 Pindah ke ${k.ikon} ${k.nama}! Bayar sewa + angkut barang −${rp(c.biaya)}`, `🏠 Pemilik: ${k.pemilik}. ${k.jamMalam === null ? 'Bebas pulang jam berapa pun.' : `Jam malam ${jamTeks(k.jamMalam)}.`}`];
  let x: SaveData = { ...d, uang: d.uang - c.biaya, kos: k.id, kosPindahHari: d.hari, kosLunas: true, jamMalamHari: 0 };
  if (x.tinggalBareng && !k.tinggalBareng) {
    x = { ...x, tinggalBareng: false };
    pesan.push(`💔 Kos ini tidak membolehkan tinggal bareng. ${d.pacar?.nama ?? 'Pacarmu'} balik ke kosnya sendiri.`);
  }
  if (k.berhantu) pesan.push('👻 Tetangga berbisik: "Kamu yang nempatin kamar ujung? Semoga betah ya..."');
  return { data: tambahStat(x, 'pindahKos'), pesan };
}

/**
 * Jam malam: jika jam melewati batas jam malam saat pemain masih di luar kos → gerbang dikunci.
 * Pemilik baik hanya mengomel; pemilik galak/tegas mendenda. Maks 1× per malam.
 */
export function cekJamMalam(lama: SaveData, baru: SaveData): { data: SaveData; pesan: string[] } {
  const k = kosDari(baru);
  if (k.jamMalam === null || !k.telat || baru.lokasi === 'kamar') return { data: baru, pesan: [] };
  const a = (lama.hari - 1) * 1440 + lama.menit;
  const b = (baru.hari - 1) * 1440 + baru.menit;
  const batas = (lama.hari - 1) * 1440 + k.jamMalam;
  if (!(a < batas && b >= batas) || baru.jamMalamHari === lama.hari) return { data: baru, pesan: [] };
  const t = k.telat;
  let x = ubah({ ...baru, jamMalamHari: lama.hari }, { uang: t.uang, stres: t.stres });
  x = tambahStat({ ...x, relasi: { ...x.relasi, buKos: clamp((x.relasi.buKos ?? 0) + t.relasi, 0, 100) } }, 'telatJamMalam');
  const teks =
    k.sifat === 'baik'
      ? `🔒 Jam ${jamTeks(k.jamMalam)}, gerbang ${k.nama} dikunci! ${k.pemilik} bukain sambil ngomel: "Lain kali jangan telat ya!" 😵+${t.stres}`
      : `🔒 Jam ${jamTeks(k.jamMalam)} lewat! ${k.pemilik} marah besar: "Peraturan ya peraturan!" Denda ${rp(-t.uang)} 😵+${t.stres}`;
  return { data: x, pesan: [teks] };
}

/** Pengaruh kos pada stres pasif tiap ganti fase (berisik / angker di malam hari). */
export function stresPasifKos(d: SaveData): number {
  const k = kosDari(d);
  const malam = d.fase === 'malam' || d.fase === 'begadang';
  return (k.efek.stresPasif ?? 0) + (malam && d.lokasi === 'kamar' ? (k.efek.stresMalam ?? 0) : 0);
}

/** Kejadian pagi dari kos: sarapan (Griya Asri) & chat pagi pacar. Dipanggil di awal hari baru. */
export function pagiM11(d: SaveData, pesan: string[]): SaveData {
  let x = d;
  const k = kosDari(x);
  if (k.efek.sarapan > 0) {
    x = ubah(x, { energi: k.efek.sarapan });
    pesan.push(`🍳 Sarapan dari ${k.pemilik} sudah siap! ⚡+${k.efek.sarapan}`);
  }
  x = cekPacarHarian(x, pesan);
  return x;
}

// ===== Toilet =====
/** Jenis toilet kamar mandi kos. */
export const jenisToilet = (d: SaveData) => kosDari(d).toilet as 'ember' | 'jongkok' | 'shower';

// ===== Hantu (Wisma Kenanga) =====
/** Apakah hantu muncul di kamar sekarang? (malam/begadang, kos berhantu, acak per fase tapi tetap) */
export function hantuMuncul(d: Pick<SaveData, 'kos' | 'fase' | 'hari' | 'lokasi'>): boolean {
  if (!kosDari(d).berhantu || d.lokasi !== 'kamar' || (d.fase !== 'malam' && d.fase !== 'begadang')) return false;
  // Acak "tetap" dari hari & fase agar tidak berkedip-kedip
  const n = ((d.hari * 7919 + (d.fase === 'malam' ? 13 : 29)) % 100) / 100;
  return n < f3.hantu.peluangMuncul;
}

// ===== Warga & pacaran =====
export const kunciWarga = (id: string) => `w_${id}`;
export const wargaDari = (id: string) => WARGA.find((w) => w.id === id) ?? null;
export const relasiWarga = (d: SaveData, id: string) => d.relasi[kunciWarga(id)] ?? 0;
export const levelWarga = (d: SaveData, id: string) => lvRelasi(d, kunciWarga(id));
export const pacarNpc = (d: SaveData, id: string) => d.pacar?.jenis === 'npc' && d.pacar.id === id;

export type AksiSosial = 'ngobrolWarga' | 'kasihHadiah' | 'tembak' | 'kencan' | 'ajakTinggal' | 'putus';
export const INFO_SOSIAL: Record<AksiSosial, { label: string; ikon: string }> = {
  ngobrolWarga: { label: 'Ngobrol', ikon: '💬' },
  kasihHadiah: { label: `Kasih Hadiah (${rp(SOS.hadiahHarga)})`, ikon: '🎁' },
  tembak: { label: 'Nyatakan Cinta', ikon: '💘' },
  kencan: { label: `Kencan (${rp(-SOS.kencan.uang)})`, ikon: '💑' },
  ajakTinggal: { label: 'Ajak Tinggal Bareng', ikon: '🏠' },
  putus: { label: 'Putus', ikon: '💔' },
};

/** Aksi yang tampil saat dekat warga (disesuaikan dengan hubungan). */
export function daftarAksiWarga(d: SaveData, id: string): AksiSosial[] {
  const w = wargaDari(id);
  if (!w) return [];
  const a: AksiSosial[] = ['ngobrolWarga', 'kasihHadiah'];
  if (pacarNpc(d, id)) {
    a.push('kencan');
    if (!d.tinggalBareng) a.push('ajakTinggal');
    a.push('putus');
  } else if (w.pacar && !d.pacar && relasiWarga(d, id) >= SOS.tembakMinRelasi * 0.6) a.push('tembak');
  return a;
}

export function cekSosial(d: SaveData, aksi: AksiSosial, id: string): { boleh: boolean; alasan?: string } {
  const w = wargaDari(id);
  if (!w) return { boleh: false, alasan: 'Orangnya sudah pergi.' };
  const kunciHari = (p: string) => `${p}${id}`;
  switch (aksi) {
    case 'ngobrolWarga':
      if (d.ngobrolHari[kunciWarga(id)] === d.hari) return { boleh: false, alasan: `💬 Sudah ngobrol dengan ${w.nama} hari ini.` };
      return { boleh: true };
    case 'kasihHadiah':
      if (d.ngobrolHari[kunciHari('h_')] === d.hari) return { boleh: false, alasan: '🎁 Sudah kasih hadiah hari ini. Jangan berlebihan!' };
      if (d.uang < SOS.hadiahHarga) return { boleh: false, alasan: '💸 Uangnya nggak cukup buat beli hadiah.' };
      return { boleh: true };
    case 'tembak':
      if (d.pacar) return { boleh: false, alasan: '💍 Kamu sudah punya pacar! Setia dong.' };
      if (!w.pacar) return { boleh: false, alasan: `${w.nama} lebih cocok jadi teman baik.` };
      if (relasiWarga(d, id) < SOS.tembakMinRelasi) return { boleh: false, alasan: `💗 Belum cukup dekat (${relasiWarga(d, id)}/${SOS.tembakMinRelasi}). Sering ngobrol & kasih hadiah dulu!` };
      return { boleh: true };
    case 'kencan':
      if (!pacarNpc(d, id)) return { boleh: false, alasan: 'Kencan cuma sama pacar ya.' };
      if (d.ngobrolHari[kunciHari('k_')] === d.hari) return { boleh: false, alasan: '💑 Sudah kencan hari ini. Besok lagi!' };
      if (d.uang + SOS.kencan.uang < 0) return { boleh: false, alasan: '💸 Uang kencan nggak cukup...' };
      if (d.energi + SOS.kencan.energi < 0) return { boleh: false, alasan: '😮‍💨 Terlalu capek buat kencan.' };
      return { boleh: true };
    case 'ajakTinggal': {
      if (!pacarNpc(d, id)) return { boleh: false, alasan: 'Hanya dengan pacar.' };
      if (d.tinggalBareng) return { boleh: false, alasan: 'Kalian sudah tinggal bareng.' };
      if (d.kamarBerdua) return { boleh: false, alasan: '👥 Kamarmu sudah dipakai berdua dengan teman online.' };
      const k = kosDari(d);
      if (!k.tinggalBareng) return { boleh: false, alasan: `🚫 ${k.nama} tidak membolehkan tinggal bareng. Pindah ke kos bebas dulu (📱 HP → Kos).` };
      if (relasiWarga(d, id) < SOS.tinggalMinRelasi) return { boleh: false, alasan: `💞 Hubungan belum cukup kuat (${relasiWarga(d, id)}/${SOS.tinggalMinRelasi}). Sering kencan dulu!` };
      return { boleh: true };
    }
    case 'putus':
      if (!pacarNpc(d, id)) return { boleh: false, alasan: 'Bukan pacarmu.' };
      return { boleh: true };
  }
}

const tambahRelasi = (d: SaveData, id: string, n: number): SaveData => ({
  ...d,
  relasi: { ...d.relasi, [kunciWarga(id)]: clamp(relasiWarga(d, id) + n, 0, 100) },
});

/** Jalankan aksi sosial ke warga. `acak` disuntikkan agar bisa diuji. */
export function jalankanSosial(
  d: SaveData,
  aksi: AksiSosial,
  id: string,
  acak: () => number = Math.random,
): { data: SaveData; pesan: string[]; ditolak?: boolean; tunda?: Tunda; label?: string } {
  const c = cekSosial(d, aksi, id);
  const w = wargaDari(id);
  if (!c.boleh || !w) return { data: d, pesan: [c.alasan ?? 'Tidak bisa'], ditolak: true };
  const lvLama = levelWarga(d, id);
  let x = d;
  const pesan: string[] = [];
  const catatHari = (p: string) => ({ ...x.ngobrolHari, [p]: x.hari });
  switch (aksi) {
    case 'ngobrolWarga': {
      x = ubah(tambahRelasi(x, id, SOS.ngobrolRelasi), { stres: SOS.ngobrolStres });
      x = { ...x, ngobrolHari: catatHari(kunciWarga(id)) };
      if (pacarNpc(x, id)) x = { ...x, pacar: x.pacar ? { ...x.pacar, temuHari: x.hari } : null };
      pesan.push(`${w.ikon} ${w.nama}: ${w.dialog[Math.floor(acak() * w.dialog.length)]}`);
      x = tambahStat(tambahStat(x, 'ngobrolWarga'), `ngobrol_${id}`); // per warga: dipakai tujuan cerita
      break;
    }
    case 'kasihHadiah': {
      // Hadiah acak: kalau pas dengan kesukaannya, lebih senang
      const jenis = ['buku', 'kopi', 'buah', 'musik', 'game'];
      const beri = jenis[Math.floor(acak() * jenis.length)];
      const cocok = beri === w.suka;
      x = tambahRelasi(ubah(x, { uang: -SOS.hadiahHarga }), id, cocok ? SOS.hadiahSukaRelasi : SOS.hadiahRelasi);
      x = { ...x, ngobrolHari: catatHari(`h_${id}`) };
      const ikonHadiah: Record<string, string> = { buku: '📚 buku', kopi: '☕ kopi', buah: '🍎 buah', musik: '🎵 voucher musik', game: '🎮 voucher game' };
      pesan.push(`🎁 Kamu kasih ${ikonHadiah[beri]} ke ${w.nama}. ${cocok ? '"Wah, ini kesukaanku! Makasih banget!" 😍' : '"Makasih ya!" 😊'}  💰 −${rp(SOS.hadiahHarga)}`);
      break;
    }
    case 'tembak': {
      const lv = levelWarga(x, id);
      const peluang = lv >= 3 ? 1 : SOS.tembakPeluangLv2;
      if (acak() < peluang) {
        x = ubah({ ...x, pacar: { jenis: 'npc', id, nama: w.nama, sejak: x.hari, temuHari: x.hari } }, SOS.jadian);
        x = tambahStat(x, 'jadian');
        pesan.push(`💘 ${w.nama}: "Aku juga suka kamu..." 🥰 Kalian resmi pacaran!  😵 ${SOS.jadian.stres}`);
      } else {
        x = tambahRelasi(ubah(x, { stres: SOS.tembakGagal.stres }), id, SOS.tembakGagal.relasi);
        x = tambahStat(x, 'ditolak');
        pesan.push(`💔 ${w.nama}: "Maaf... kita temenan aja dulu ya." 😵+${SOS.tembakGagal.stres}`);
      }
      break;
    }
    case 'kencan': {
      const e = SOS.kencan;
      x = tambahRelasi(ubah(x, { uang: e.uang, energi: e.energi, stres: e.stres }), id, e.relasi);
      x = { ...x, ngobrolHari: catatHari(`k_${id}`), pacar: x.pacar ? { ...x.pacar, temuHari: x.hari } : null };
      x = tambahStat(x, 'kencan');
      const tempat = ['makan bakso', 'nonton di bioskop mini', 'jalan-jalan ke taman', 'ngopi di kafe', 'naik komidi putar'];
      pesan.push(`💑 Kencan sama ${w.nama}: ${tempat[Math.floor(acak() * tempat.length)]}! 💰 −${rp(-e.uang)}  ⚡ ${e.energi}  😵 ${e.stres}`);
      break;
    }
    case 'ajakTinggal':
      x = tambahStat({ ...x, tinggalBareng: true }, 'tinggalBareng');
      pesan.push(`🏠 ${w.nama} pindah ke kosmu! Sewa kos jadi patungan (${rp(hargaKos({ ...x }))}/bulan) & tidur lebih nyenyak berdua.`);
      break;
    case 'putus':
      x = ubah({ ...x, pacar: null, tinggalBareng: false }, SOS.putus);
      x = tambahRelasi(x, id, -40);
      pesan.push(`💔 Kamu putus dengan ${w.nama}. Sakit, tapi hidup terus berjalan... 😵+${SOS.putus.stres}`);
      break;
  }
  const lv = levelWarga(x, id);
  if (lv > lvLama) pesan.push(`🤝 Pertemanan dengan ${w.nama} naik ke level ${lv}!${lv >= 2 && w.pacar && !x.pacar ? ' 💗 Sepertinya dia mulai suka kamu...' : ''}`);
  // Kencan memakan waktu 2 jam (jam dipercepat seperti aksi lain)
  if (aksi === 'kencan') return { data: x, pesan, tunda: { menit: SOS.kencanMenit, jenis: 'aksi' }, label: `💑 Kencan dengan ${w.nama}` };
  return { data: x, pesan };
}

/** Tiap pagi: chat dari pacar, atau rindu kalau lama tidak ketemu (bisa putus). */
export function cekPacarHarian(d: SaveData, pesan: string[]): SaveData {
  const p = d.pacar;
  if (!p) return d;
  let x = ubah(d, { stres: SOS.chatPagiStres });
  pesan.push(`💌 Chat dari ${p.nama}: "Selamat pagi! Semangat hari ini ya 😘"`);
  if (p.jenis !== 'npc' || x.tinggalBareng) return x; // tinggal bareng = ketemu tiap hari
  if (x.hari - p.temuHari > SOS.rinduHari) {
    x = tambahRelasi(x, p.id, SOS.rinduRelasi);
    pesan.push(`🥺 ${p.nama}: "Kok kita jarang ketemu sih?" (ngobrol/kencan biar tidak renggang)`);
    if (relasiWarga(x, p.id) < SOS.putusBatas) {
      x = ubah({ ...x, pacar: null, tinggalBareng: false }, SOS.putus);
      pesan.push(`💔 ${p.nama} minta putus karena merasa diabaikan... 😵+${SOS.putus.stres}`);
    }
  }
  return x;
}

/** Pacar online: dipasang/dihapus lewat ajakan antar-pemain. */
export const setPacarPemain = (d: SaveData, id: string, nama: string): SaveData =>
  tambahStat(ubah({ ...d, pacar: { jenis: 'pemain', id, nama, sejak: d.hari, temuHari: d.hari } }, SOS.jadian), 'jadian');

/** Kencan dengan pacar pemain online (harus berdekatan di dunia — dicek pemanggil). */
export function kencanPemain(d: SaveData): { data: SaveData; pesan: string[]; ditolak?: boolean; tunda?: Tunda; label?: string } {
  const p = d.pacar;
  if (!p || p.jenis !== 'pemain') return { data: d, pesan: ['Belum punya pacar online.'], ditolak: true };
  const kunci = `k_${p.id}`;
  if (d.ngobrolHari[kunci] === d.hari) return { data: d, pesan: ['💑 Sudah kencan hari ini. Besok lagi!'], ditolak: true };
  const e = SOS.kencan;
  if (d.uang + e.uang < 0) return { data: d, pesan: ['💸 Uang kencan nggak cukup...'], ditolak: true };
  if (d.energi + e.energi < 0) return { data: d, pesan: ['😮‍💨 Terlalu capek buat kencan.'], ditolak: true };
  const x = tambahStat(ubah({ ...d, ngobrolHari: { ...d.ngobrolHari, [kunci]: d.hari }, pacar: { ...p, temuHari: d.hari } }, { uang: e.uang, energi: e.energi, stres: e.stres }), 'kencan');
  return { data: x, pesan: [`💑 Kencan sama ${p.nama}! 💰 −${rp(-e.uang)}  ⚡ ${e.energi}  😵 ${e.stres}`], tunda: { menit: SOS.kencanMenit, jenis: 'aksi' }, label: `💑 Kencan dengan ${p.nama}` };
}

// ===== Beasiswa =====
/** Cek syarat beasiswa (tanpa skill: dihitung oleh pemanggil lewat `levelSkill`). */
export function cekBeasiswa(d: SaveData, b: BeasiswaDef, levelSkill: (id: string) => number): { boleh: boolean; alasan?: string } {
  const s = b.syarat;
  if (d.beasiswa) return { boleh: false, alasan: `Kamu sudah menerima ${BEASISWA.find((x) => x.id === d.beasiswa?.id)?.nama ?? 'beasiswa'}. Maks 1 beasiswa.` };
  if (d.beasiswaTolak[b.id] === d.semester) return { boleh: false, alasan: '⏳ Sudah daftar semester ini. Coba lagi semester depan.' };
  if (d.ipk < s.ipkMin) return { boleh: false, alasan: `🎓 IPK minimal ${s.ipkMin.toFixed(2)} (kamu ${d.ipk.toFixed(2)}).` };
  if (s.hartaMaks !== undefined && d.uang + d.tabungan >= s.hartaMaks) return { boleh: false, alasan: `💰 Khusus yang uang + tabungan < ${rp(s.hartaMaks)}.` };
  if (s.sksMin !== undefined && d.sks < s.sksMin) return { boleh: false, alasan: `📘 Minimal ${s.sksMin} SKS (kamu ${d.sks}).` };
  if (s.jurusan && !s.jurusan.includes(d.profil?.jurusan ?? '')) return { boleh: false, alasan: '🏫 Jurusanmu tidak termasuk.' };
  if (s.ukm && !d.ukm) return { boleh: false, alasan: '🎪 Harus aktif di UKM.' };
  if (s.skillMin && !Object.entries(s.skillMin).some(([k, v]) => levelSkill(k) >= v)) {
    return { boleh: false, alasan: `🏅 Butuh skill ${Object.entries(s.skillMin).map(([k, v]) => `${k} lv${v}`).join(' atau ')}.` };
  }
  return { boleh: true };
}

export function daftarBeasiswa(d: SaveData, id: string, levelSkill: (id: string) => number): { data: SaveData; pesan: string[]; ditolak?: boolean } {
  const b = BEASISWA.find((x) => x.id === id);
  if (!b) return { data: d, pesan: ['Beasiswa tidak ditemukan'], ditolak: true };
  const c = cekBeasiswa(d, b, levelSkill);
  if (!c.boleh) return { data: d, pesan: [c.alasan ?? 'Belum memenuhi syarat'], ditolak: true };
  const x = tambahStat({ ...d, beasiswa: { id: b.id, sejak: d.hari } }, 'beasiswaDiterima');
  return { data: x, pesan: [`${b.ikon} Selamat! Kamu lolos ${b.nama}! ${rp(b.uang)} cair tiap tanggal 1. Jaga IPK ≥ ${b.jagaIpk.toFixed(2)} ya!`] };
}

/** Tanggal 1: beasiswa cair, atau dicabut kalau IPK turun di bawah batas. */
export function cairBeasiswa(d: SaveData, pesan: string[]): SaveData {
  const aktif = d.beasiswa;
  if (!aktif) return d;
  const b = BEASISWA.find((x) => x.id === aktif.id);
  if (!b) return { ...d, beasiswa: null };
  if (d.ipk < b.jagaIpk) {
    pesan.push(`😢 ${b.nama} dicabut karena IPK di bawah ${b.jagaIpk.toFixed(2)}. Daftar lagi semester depan!`);
    return { ...d, beasiswa: null, beasiswaTolak: { ...d.beasiswaTolak, [b.id]: d.semester } };
  }
  pesan.push(`${b.ikon} ${b.nama} cair ${rp(b.uang)}!`);
  return tambahStat({ ...d, uang: d.uang + b.uang }, 'uangBeasiswa', b.uang);
}
