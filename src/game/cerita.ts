// Cerita utama "Buku Sakti Ibu" — logika murni (tanpa React) berbasis PEMICU (stat, flag, hari, tempat, fase, pertemanan).
// Alur: store.terapkanData() memanggil cekCerita() setiap data berubah (termasuk tiap menit jam berjalan).
// cekCerita memulai/menutup bab, mencatat tujuan, dan menaruh id dialog di `cerita.antrean`.
// Store menampilkan antrean lewat dialog event yang sudah ada (DialogEvent) saat layar sedang kosong.
// Semua teks & angka ada di src/data/cerita.json.
import ceritaJson from '../data/cerita.json';
import { formatRupiah, ongkosPulang, ringkasEfek, type Efek, type EventDef, type HasilAksi, type PilihanEvent, type SaveData } from './sim';
import { WARGA, kosDari } from './m11';
import type { DataCeritaSave, ProgresBab } from './ceritaSave';

// ===== Tipe data JSON =====
export type Syarat = {
  pembukaSelesai?: boolean;
  hariMin?: number;
  hariMaks?: number;
  tanggalMin?: number;
  tanggalMaks?: number;
  bulanMin?: number;
  uangMin?: number;
  uangMaks?: number;
  sksMin?: number;
  skripsiMin?: number;
  ipkMin?: number;
  ipkMaks?: number;
  stresMin?: number;
  fase?: string[];
  lokasi?: string[];
  gedung?: string[];
  kos?: string[];
  flag?: string[];
  tanpaFlag?: string[];
  flagSalahSatu?: string[];
  /** flag sudah dipasang minimal N hari lalu */
  flagUmur?: Record<string, number>;
  lulus?: boolean;
  relasiMin?: Record<string, number>;
  /** statistik total (kunci "a+b" = dijumlah) */
  statMin?: Record<string, number>;
  punyaBeasiswa?: boolean;
  punyaPacar?: boolean;
  tabunganMin?: number;
  celenganMin?: number;
  raporMin?: number;
  followerMaks?: number;
  wargaRelasiMin?: { nilai: number; jumlah: number };
  wargaRelasiMaks?: { nilai: number; jumlah: number };
  /** (khusus tujuan bab) sudah masuk bulan baru sejak bab dimulai */
  bulanBaru?: boolean;
  atau?: Syarat[];
};
type Tujuan = { id: string; teks: string; stat?: Record<string, number>; jumlah?: number; syarat?: Syarat };
type AdeganBab = { id: string; progres?: Record<string, number>; pemicu?: Syarat; dialog: string };
type Hadiah = { efek?: Efek; relasi?: Record<string, number> };
export type BabDef = {
  id: string;
  urutan: number;
  judul: string;
  ikon: string;
  halaman: string;
  pemicu: Syarat;
  batasHari: number;
  tujuan: Tujuan[];
  adegan?: AdeganBab[];
  dialogAwal?: string;
  dialogSelesai?: string;
  flagSelesai?: string;
  hadiah?: Hadiah;
  ending?: boolean;
  rencanaB?: { teks: string; flag?: string; dialog?: string };
};
type PilihanDialog = {
  teks: string;
  hasil?: string;
  efek?: Efek;
  relasi?: Record<string, number>;
  setFlag?: string[];
  aksi?: 'mulaiNabung' | 'ongkosPulang';
  syarat?: Syarat;
  kunci?: string;
  ke?: string;
  keJika?: { syarat: Syarat; ke: string }[];
};
type DialogDef = { id: string; ikon: string; judul: string; teks: string; pilihan: PilihanDialog[] };
type EndingDef = { id: string; judul: string; ikon: string; syarat: Syarat; teks: string };

type CeritaData = {
  nabung: { target: number; durasiHari: number; setor: number; hadiah: Efek };
  bab: BabDef[];
  sampingan: { id: string; pemicu: Syarat; dialog: string }[];
  dialog: DialogDef[];
  ending: EndingDef[];
  epilog: { syarat: Syarat; teks: string }[];
  halamanTerakhir: string;
};
export const CERITA = ceritaJson as unknown as CeritaData;
export const BAB = [...CERITA.bab].sort((a, b) => a.urutan - b.urutan);
const DIALOG = new Map(CERITA.dialog.map((x) => [x.id, x]));
const ID_EPILOG = 'epilog';
const AWALAN_END = 'end:';

// ===== Pembantu =====
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const bulanDari = (hari: number) => Math.floor((hari - 1) / 30) + 1;
/** Kunci relasi: warga M11 disimpan sebagai `w_<id>`, NPC lama (mbakSri, bangUdin, ...) apa adanya. */
const kunciRelasi = (id: string) => (WARGA.some((w) => w.id === id) ? `w_${id}` : id);
const nilaiStat = (d: SaveData, kunci: string) => kunci.split('+').reduce((n, k) => n + (d.stat[k] ?? 0), 0);
const jumlahAkrab = (d: SaveData, nilai: number) => Object.entries(d.relasi).filter(([k, v]) => k !== 'oyen' && v >= nilai).length;
const ganti = (d: SaveData, c: DataCeritaSave): SaveData => ({ ...d, cerita: c });

/** Ganti {nama} & {pemilikKos} di teks. */
export const isiTeks = (d: SaveData, t: string) => t.replaceAll('{nama}', d.profil?.nama ?? 'Nak').replaceAll('{pemilikKos}', kosDari(d).pemilik);

/** Cek satu syarat. `bab` = progres bab (untuk syarat `bulanBaru`). */
export function cekSyarat(d: SaveData, s: Syarat, bab?: ProgresBab): boolean {
  const c = d.cerita;
  if (s.pembukaSelesai !== undefined && d.pembukaSelesai !== s.pembukaSelesai) return false;
  if (s.hariMin !== undefined && d.hari < s.hariMin) return false;
  if (s.hariMaks !== undefined && d.hari > s.hariMaks) return false;
  if (s.tanggalMin !== undefined && d.tanggal < s.tanggalMin) return false;
  if (s.tanggalMaks !== undefined && d.tanggal > s.tanggalMaks) return false;
  if (s.bulanMin !== undefined && d.bulan < s.bulanMin) return false;
  if (s.uangMin !== undefined && d.uang < s.uangMin) return false;
  if (s.uangMaks !== undefined && d.uang > s.uangMaks) return false;
  if (s.sksMin !== undefined && d.sks < s.sksMin) return false;
  if (s.skripsiMin !== undefined && d.skripsi < s.skripsiMin) return false;
  if (s.ipkMin !== undefined && d.ipk < s.ipkMin) return false;
  if (s.ipkMaks !== undefined && d.ipk > s.ipkMaks) return false;
  if (s.stresMin !== undefined && d.stres < s.stresMin) return false;
  if (s.fase && !s.fase.includes(d.fase)) return false;
  if (s.lokasi && !s.lokasi.includes(d.lokasi)) return false;
  if (s.gedung && !s.gedung.includes(d.gedung ?? '')) return false;
  if (s.kos && !s.kos.includes(d.kos)) return false;
  if (s.flag && !s.flag.every((f) => f in c.flag)) return false;
  if (s.tanpaFlag && s.tanpaFlag.some((f) => f in c.flag)) return false;
  if (s.flagSalahSatu && !s.flagSalahSatu.some((f) => f in c.flag)) return false;
  if (s.flagUmur && !Object.entries(s.flagUmur).every(([f, n]) => f in c.flag && d.hari - c.flag[f] >= n)) return false;
  if (s.lulus !== undefined && d.lulus !== s.lulus) return false;
  if (s.relasiMin && !Object.entries(s.relasiMin).every(([k, n]) => (d.relasi[kunciRelasi(k)] ?? 0) >= n)) return false;
  if (s.statMin && !Object.entries(s.statMin).every(([k, n]) => nilaiStat(d, k) >= n)) return false;
  if (s.punyaBeasiswa && !d.beasiswa) return false;
  if (s.punyaPacar !== undefined && !!d.pacar !== s.punyaPacar) return false;
  if (s.tabunganMin !== undefined && d.tabungan < s.tabunganMin) return false;
  if (s.celenganMin !== undefined && (c.nabung?.terkumpul ?? 0) < s.celenganMin && c.nabung?.status !== 'terkirim') return false;
  if (s.raporMin !== undefined && d.rapor.length < s.raporMin) return false;
  if (s.followerMaks !== undefined && d.follower > s.followerMaks) return false;
  if (s.wargaRelasiMin && jumlahAkrab(d, s.wargaRelasiMin.nilai) < s.wargaRelasiMin.jumlah) return false;
  if (s.wargaRelasiMaks && jumlahAkrab(d, s.wargaRelasiMaks.nilai) > s.wargaRelasiMaks.jumlah) return false;
  if (s.bulanBaru && (!bab || bulanDari(d.hari) <= bulanDari(bab.mulai))) return false;
  if (s.atau && !s.atau.some((x) => cekSyarat(d, x, bab))) return false;
  return true;
}

/** Kunci statistik yang perlu dicatat saat bab dimulai (tujuan & adegan berbasis progres). */
function kunciBab(b: BabDef): string[] {
  const k = new Set<string>();
  for (const t of b.tujuan) Object.keys(t.stat ?? {}).forEach((x) => k.add(x));
  for (const a of b.adegan ?? []) Object.keys(a.progres ?? {}).forEach((x) => k.add(x));
  return [...k];
}
/** Kemajuan stat sejak bab dimulai. */
const selisih = (d: SaveData, p: ProgresBab, kunci: string) => nilaiStat(d, kunci) - (p.dasar[kunci] ?? 0);

/** Progres satu tujuan: [sekarang, target]. */
export function progresTujuan(d: SaveData, b: BabDef, t: Tujuan): [number, number] {
  const p = d.cerita.bab[b.id];
  if (!p) return [0, t.jumlah ?? 1];
  if (p.tujuan.includes(t.id) || p.s === 'selesai') return [t.jumlah ?? 1, t.jumlah ?? 1];
  if (t.stat) {
    const target = t.jumlah ?? Object.values(t.stat)[0] ?? 1;
    const n = Math.min(...Object.keys(t.stat).map((k) => selisih(d, p, k)));
    return [clamp(n, 0, target), target];
  }
  return [t.syarat && p.s === 'aktif' && cekSyarat(d, t.syarat, p) ? 1 : 0, 1];
}

function beriHadiah(d: SaveData, h: Hadiah | undefined, pesan: string[]): SaveData {
  if (!h) return d;
  const e = h.efek ?? {};
  let x: SaveData = {
    ...d,
    uang: d.uang + (e.uang ?? 0),
    energi: clamp(d.energi + (e.energi ?? 0), 0, 100),
    stres: clamp(d.stres + (e.stres ?? 0), 0, 100),
    ipk: Math.round(clamp(d.ipk + (e.ipk ?? 0), 0, 4) * 1000) / 1000,
  };
  if (h.relasi) {
    const r = { ...x.relasi };
    for (const [k, n] of Object.entries(h.relasi)) r[kunciRelasi(k)] = clamp((r[kunciRelasi(k)] ?? 0) + n, 0, 100);
    x = { ...x, relasi: r };
  }
  const ringkas = ringkasEfek(e);
  if (ringkas) pesan.push(`🎁 Hadiah Buku Sakti   ${ringkas}`);
  return x;
}

const pasangFlag = (c: DataCeritaSave, flag: string[] | undefined, hari: number): DataCeritaSave =>
  flag && flag.length ? { ...c, flag: { ...c.flag, ...Object.fromEntries(flag.filter((f) => !(f in c.flag)).map((f) => [f, hari])) } } : c;

/** Tentukan ending saat wisuda (urut prioritas, ending terakhir = dasar). */
export function tentukanEnding(d: SaveData): EndingDef {
  return CERITA.ending.find((e) => cekSyarat(d, e.syarat)) ?? CERITA.ending[CERITA.ending.length - 1];
}

/**
 * Cek semua pemicu cerita. Mengembalikan objek `d` yang SAMA bila tidak ada yang berubah
 * (dipanggil tiap menit game, jadi harus murah).
 */
export function cekCerita(d: SaveData): { data: SaveData; pesan: string[] } {
  const pesan: string[] = [];
  if (!d.profil) return { data: d, pesan };
  let x = d;
  let c = d.cerita;
  const ubah = (baru: DataCeritaSave) => {
    c = baru;
    x = ganti(x, c);
  };

  // 1) Bab yang sedang aktif: catat tujuan, adegan dalam bab, selesai / Rencana B
  for (const b of BAB) {
    const p = c.bab[b.id];
    if (!p || p.s !== 'aktif' || b.ending) continue;
    const baruTercapai = b.tujuan.filter((t) => !p.tujuan.includes(t.id) && progresTujuan(x, b, t)[0] >= progresTujuan(x, b, t)[1]);
    let p2 = p;
    if (baruTercapai.length) {
      p2 = { ...p, tujuan: [...p.tujuan, ...baruTercapai.map((t) => t.id)] };
      baruTercapai.forEach((t) => pesan.push(`📒 Buku Sakti ✅ ${t.teks}`));
      ubah({ ...c, bab: { ...c.bab, [b.id]: p2 } });
    }
    // Adegan dalam bab (sekali tampil)
    for (const a of b.adegan ?? []) {
      if (c.adegan.includes(a.id)) continue;
      const okProgres = !a.progres || Object.entries(a.progres).every(([k, n]) => selisih(x, p2, k) >= n);
      if (okProgres && (!a.pemicu || cekSyarat(x, a.pemicu, p2))) ubah({ ...c, adegan: [...c.adegan, a.id], antrean: [...c.antrean, a.dialog] });
    }
    if (b.tujuan.every((t) => p2.tujuan.includes(t.id))) {
      // Bab selesai 🎉
      ubah(pasangFlag({ ...c, bab: { ...c.bab, [b.id]: { ...p2, s: 'selesai', akhir: x.hari } } }, b.flagSelesai ? [b.flagSelesai] : undefined, x.hari));
      x = beriHadiah(x, b.hadiah, pesan);
      if (b.dialogSelesai) ubah({ ...c, antrean: [...c.antrean, b.dialogSelesai] });
      pesan.push(`📒 ${b.ikon} Bab "${b.judul}" selesai!`);
    } else if (x.hari > p2.mulai + b.batasHari) {
      // Tenggat lewat → halaman Rencana B (tanpa hukuman), cerita lanjut
      ubah(pasangFlag({ ...c, bab: { ...c.bab, [b.id]: { ...p2, s: 'rencanaB', akhir: x.hari } } }, b.rencanaB?.flag ? [b.rencanaB.flag] : undefined, x.hari));
      if (b.rencanaB?.dialog) ubah({ ...c, antrean: [...c.antrean, b.rencanaB.dialog] });
      pesan.push(`📒 Halaman Rencana B: "${b.rencanaB?.teks ?? 'Nggak apa-apa, pelan-pelan.'}"`);
    }
  }

  // 2) Bab berikutnya (berurutan). Setelah lulus, bab biasa yang belum mulai dilompati.
  const adaAktif = BAB.some((b) => c.bab[b.id]?.s === 'aktif' && !b.ending);
  const berikut = BAB.find((b) => !b.ending && !c.bab[b.id]);
  if (x.lulus && berikut) {
    const lompat: Record<string, ProgresBab> = {};
    for (const b of BAB) if (!b.ending && !c.bab[b.id]) lompat[b.id] = { s: 'lewat', mulai: x.hari, dasar: {}, tujuan: [] };
    ubah({ ...c, bab: { ...c.bab, ...lompat } });
  } else if (berikut && !adaAktif && cekSyarat(x, berikut.pemicu)) {
    const dasar = Object.fromEntries(kunciBab(berikut).map((k) => [k, nilaiStat(x, k)]));
    ubah({
      ...c,
      bab: { ...c.bab, [berikut.id]: { s: 'aktif', mulai: x.hari, dasar, tujuan: [] } },
      antrean: berikut.dialogAwal ? [...c.antrean, berikut.dialogAwal] : c.antrean,
    });
    pesan.push(`📒 Halaman baru di Buku Sakti: ${berikut.ikon} ${berikut.judul}`);
  }

  // 3) Ending saat wisuda
  const babEnding = BAB.find((b) => b.ending);
  if (babEnding && !c.ending && cekSyarat(x, babEnding.pemicu)) {
    const e = tentukanEnding(x);
    ubah({
      ...c,
      ending: e.id,
      bab: { ...c.bab, [babEnding.id]: { s: 'selesai', mulai: x.hari, dasar: {}, tujuan: [], akhir: x.hari } },
      antrean: [...c.antrean, `${AWALAN_END}${e.id}`],
    });
    pesan.push(`📒 Halaman terakhir Buku Sakti terbuka: ${e.ikon} ${e.judul}`);
  }

  // 4) Adegan sampingan (sekali tampil, tidak terikat bab)
  for (const s of CERITA.sampingan) {
    if (!c.adegan.includes(s.id) && cekSyarat(x, s.pemicu)) ubah({ ...c, adegan: [...c.adegan, s.id], antrean: [...c.antrean, s.dialog] });
  }

  // 5) Misi nabung: tenggat lewat → isi celengan kembali ke dompet, tanpa hukuman
  const n = c.nabung;
  if (n && n.status === 'aktif' && x.hari > n.batas) {
    x = { ...x, uang: x.uang + n.terkumpul };
    ubah(pasangFlag({ ...c, nabung: { ...n, status: 'lewat' }, antrean: [...c.antrean, 'd_nabung_lewat'] }, ['belumBisaBantu'], x.hari));
    if (n.terkumpul > 0) pesan.push(`🐷 Celengan Ibu dikembalikan +${formatRupiah(n.terkumpul)}`);
  }

  // Buang id dialog yang tidak dikenal (data lama / salah ketik) agar antrean tidak macet
  if (c.antrean.some((id) => !dialogValid(id))) ubah({ ...c, antrean: c.antrean.filter(dialogValid) });
  return { data: x, pesan };
}

const dialogValid = (id: string) => DIALOG.has(id) || id === ID_EPILOG || (id.startsWith(AWALAN_END) && CERITA.ending.some((e) => `${AWALAN_END}${e.id}` === id));

/** Ubah dialog cerita menjadi EventDef agar bisa ditampilkan DialogEvent yang sudah ada. */
function keEvent(d: SaveData, dialogId: string): EventDef | null {
  const ev = (ikon: string, judul: string, teks: string, pilihan: PilihanEvent[]): EventDef => ({
    id: `cerita:${dialogId}`,
    ikon,
    judul,
    teks: isiTeks(d, teks),
    syarat: {},
    peluang: 0,
    pilihan,
  });
  if (dialogId.startsWith(AWALAN_END)) {
    const e = CERITA.ending.find((x) => `${AWALAN_END}${x.id}` === dialogId);
    if (!e) return null;
    return ev(e.ikon, `🎓 Ending: ${e.judul}`, e.teks, [{ label: '📒 Buka halaman terakhir', efek: {}, hasil: '', cerita: { dialog: dialogId, pilihan: 0 } }]);
  }
  if (dialogId === ID_EPILOG) {
    const baris = CERITA.epilog.filter((x) => cekSyarat(d, x.syarat)).map((x) => x.teks);
    return ev('📒', 'Halaman Terakhir Buku Sakti', [`"${CERITA.halamanTerakhir}"`, ...baris].join(' · '), [
      { label: '🥹 Tutup buku (game tetap lanjut)', efek: {}, hasil: '📒 Buku Sakti tamat. Hidupmu belum!', cerita: { dialog: dialogId, pilihan: 0 } },
    ]);
  }
  const dl = DIALOG.get(dialogId);
  if (!dl) return null;
  return ev(
    dl.ikon,
    dl.judul,
    dl.teks,
    dl.pilihan.map((p, i) => {
      const efek: Efek = { ...(p.efek ?? {}) };
      if (p.aksi === 'ongkosPulang') efek.uang = (efek.uang ?? 0) - ongkosPulang(d);
      const terkunci = p.syarat && !cekSyarat(d, p.syarat) ? (p.kunci ?? '🔒 Belum bisa dipilih.') : undefined;
      return { label: p.teks, efek, hasil: isiTeks(d, p.hasil ?? ''), cerita: { dialog: dialogId, pilihan: i }, ...(terkunci ? { terkunci } : {}) };
    }),
  );
}

/** Dialog cerita berikutnya yang siap ditampilkan (kepala antrean), atau null. */
export function adeganBerikut(d: SaveData): EventDef | null {
  const id = d.cerita.antrean[0];
  return id ? keEvent(d, id) : null;
}

/**
 * Dipanggil setelah pemain memilih di dialog cerita (efek uang/stat sudah diterapkan jalankanPilihan).
 * Memasang flag & relasi, memulai misi nabung, lalu menaruh dialog lanjutan di depan antrean.
 */
export function jawabCerita(d: SaveData, ref: { dialog: string; pilihan: number }): { data: SaveData; pesan: string[] } {
  const pesan: string[] = [];
  let c = d.cerita;
  const sisa = c.antrean[0] === ref.dialog ? c.antrean.slice(1) : c.antrean.filter((x) => x !== ref.dialog);
  c = { ...c, antrean: sisa };
  let x = d;
  if (ref.dialog.startsWith(AWALAN_END)) return { data: ganti(x, { ...c, antrean: [ID_EPILOG, ...c.antrean] }), pesan };
  const p = DIALOG.get(ref.dialog)?.pilihan[ref.pilihan];
  if (!p) return { data: ganti(x, c), pesan };
  c = pasangFlag(c, p.setFlag, x.hari);
  if (p.relasi) x = beriHadiah(x, { relasi: p.relasi }, pesan);
  if (p.aksi === 'mulaiNabung' && !c.nabung) {
    const N = CERITA.nabung;
    c = { ...c, nabung: { target: N.target, terkumpul: 0, mulai: x.hari, batas: x.hari + N.durasiHari, status: 'aktif' } };
  }
  const lanjut = p.keJika?.find((k) => cekSyarat(ganti(x, c), k.syarat))?.ke ?? p.ke;
  if (lanjut) c = { ...c, antrean: [lanjut, ...c.antrean] };
  return { data: ganti(x, c), pesan };
}

// ===== Misi sukarela "nabung bantu warung Ibu" (dipanggil dari HP → Buku Sakti) =====
const tolak = (d: SaveData, alasan: string): HasilAksi => ({ data: d, pesan: [alasan], ditolak: true });

export function setorNabung(d: SaveData): HasilAksi {
  const n = d.cerita.nabung;
  if (!n || n.status !== 'aktif') return tolak(d, '🐷 Celengan Ibu belum dibuka.');
  const jumlah = Math.min(CERITA.nabung.setor, n.target - n.terkumpul);
  if (jumlah <= 0) return tolak(d, '🐷 Celengan sudah penuh! Tinggal kirim ke Ibu.');
  if (d.uang < jumlah) return tolak(d, `💸 Uangnya belum cukup buat nyisihin ${formatRupiah(jumlah)}.`);
  const baru = { ...n, terkumpul: n.terkumpul + jumlah };
  return { data: { ...d, uang: d.uang - jumlah, cerita: { ...d.cerita, nabung: baru } }, pesan: [`🐷 Disisihkan ${formatRupiah(jumlah)} · celengan ${formatRupiah(baru.terkumpul)}/${formatRupiah(n.target)}`] };
}

export function kirimNabung(d: SaveData): HasilAksi {
  const n = d.cerita.nabung;
  if (!n || n.status !== 'aktif') return tolak(d, '🐷 Celengan Ibu belum dibuka.');
  if (n.terkumpul < n.target) return tolak(d, `🐷 Kurang ${formatRupiah(n.target - n.terkumpul)} lagi.`);
  const pesan = ['📤 Celengan terkirim ke Ibu!'];
  let x: SaveData = { ...d, cerita: pasangFlag({ ...d.cerita, nabung: { ...n, status: 'terkirim' }, antrean: [...d.cerita.antrean, 'd_nabung_terkirim'] }, ['bantuWarung'], d.hari) };
  x = beriHadiah(x, { efek: CERITA.nabung.hadiah }, pesan);
  return { data: x, pesan };
}

export function batalNabung(d: SaveData): HasilAksi {
  const n = d.cerita.nabung;
  if (!n || n.status !== 'aktif') return tolak(d, '🐷 Tidak ada celengan aktif.');
  const c = pasangFlag({ ...d.cerita, nabung: { ...n, status: 'batal' } }, ['belumBisaBantu'], d.hari);
  return { data: { ...d, uang: d.uang + n.terkumpul, cerita: c }, pesan: [`🐷 Celengan dibatalkan, ${formatRupiah(n.terkumpul)} kembali ke dompet. Ibu tetap paham kok ❤️`] };
}
