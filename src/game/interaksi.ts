// Objek yang bisa dipakai saat didekati, per lokasi.
import type { AksiId, Lokasi, SaveData } from './sim';
import {
  BANGUNAN,
  GEROBAK,
  HALTE,
  KUCING,
  LAPANGAN,
  LAPANGAN_KAMPUNG,
  PARKIR_MOTOR,
  PASAR_KAGET,
  PERTAMINI,
  SAUNG,
  SUNGAI,
  TAMAN,
  WARUNG,
  WARUNG_UKURAN,
  titikDepan,
  type Warung,
} from './duniaLayout';
import { AKUARIUM } from './kamarLayout';
import { PENGHUNI_RUMAH, PENJAGA, PINTU_GEDUNG, aksiKonter, tataGedung } from './gedungLayout';
import { WARGA } from './m11';
import { TITIK_CILOK } from './cilok';

export type InteraksiId = string;

export type InteraksiDef = {
  id: InteraksiId;
  nama: string;
  /** Titik di lantai (x, z) tempat pemain harus mendekat */
  titik: [number, number];
  radius: number;
  /** Posisi penanda melayang (x, y, z) */
  penanda: [number, number, number];
  /** Aksi[0] = aksi utama (tombol besar / tombol E) */
  aksi: AksiId[];
  /** true = posisinya berpindah-pindah (motor pemain) */
  dinamis?: boolean;
  /** Hanya muncul jika syarat terpenuhi (mis. sudah punya akuarium) */
  syarat?: (d: SaveData) => boolean;
  /** Jangan tampilkan panah penanda (mis. rumah warga) */
  tanpaPenanda?: boolean;
};

/** ID khusus untuk motor milik pemain (posisinya diambil dari store). */
export const ID_MOTOR = 'motorKu';

// Semua bangunan bisa dimasuki (M11): aksi pertama = "Masuk", aksi tempat tetap tersedia di pintu.
const dariBangunan: InteraksiDef[] = BANGUNAN.filter((b) => b.aksi || b.jenis === 'rumah').map((b) => {
  const titik = titikDepan(b, 0.8);
  const muka = titikDepan(b, -0.2);
  const tuan = PENGHUNI_RUMAH[b.id];
  const warga = tuan ? WARGA.find((w) => w.id === tuan) : undefined;
  return {
    id: b.id,
    nama: b.jenis === 'rumah' ? `🏡 Rumah ${warga?.nama ?? 'Warga'}` : `${b.ikon} ${b.nama}`,
    titik,
    radius: b.jenis === 'kampus' ? 1.9 : b.jenis === 'rumah' ? 1.4 : 1.7,
    penanda: [muka[0], Math.min(b.tinggi - 0.6, 3.8), muka[1]],
    aksi: b.jenis === 'kos' ? (b.aksi ?? []) : ['masukGedung', ...(b.aksi ?? [])],
    // Rumah warga: tanpa panah penanda agar dunia tidak penuh panah (UI hanya yang penting)
    tanpaPenanda: b.jenis === 'rumah',
  };
});

// ===== M13: titik interaksi area baru — semua dihitung dari konstanta duniaLayout (satu sumber kebenaran) =====
/** Cari warung dekor berdasarkan tulisan papannya (KOPI TEPI KALI, ES DEGAN). */
const warung = (teks: string): Warung | undefined => WARUNG.find((w) => w.teks === teks);
/** Titik di depan warung (warung hadap ±z) + posisi penanda di atas atapnya. */
function interaksiWarung(id: string, nama: string, w: Warung | undefined, aksi: AksiId[]): InteraksiDef[] {
  if (!w) return [];
  const maju = w.hadap === '-z' ? -1 : 1;
  return [{ id, nama, titik: [w.x, w.z + maju * (WARUNG_UKURAN.d / 2 + 0.8)], radius: 1.5, penanda: [w.x, 2.9, w.z], aksi }];
}
/** Tepi tanggul kali (antara air & jalan setapak) tempat mancing. */
const Z_TANGGUL = SUNGAI.z + SUNGAI.setengah + 1.0;
const interaksiAreaBaru: InteraksiDef[] = [
  ...interaksiWarung('kopiKali', '☕ Kopi Tepi Kali', warung('KOPI TEPI KALI'), ['ngopiTepiKali', 'jajanKopiKali']),
  ...interaksiWarung('esDegan', '🥥 Es Degan Pak Kumis', warung('ES DEGAN'), ['jajanEsDegan']),
  ...[14, -20].map((x, i): InteraksiDef => ({
    id: `mancing${i}`,
    nama: '🎣 Spot Mancing',
    titik: [x, Z_TANGGUL],
    radius: 1.6,
    penanda: [x, 1.8, Z_TANGGUL - 0.6],
    aksi: ['mancing'],
  })),
  // Bantu panen: di depan saung sawah & saung kebun (sisi +z saung)
  ...SAUNG.map(([x, z], i): InteraksiDef => ({
    id: `saung${i}`,
    nama: i === 0 ? '🌾 Saung Pak Tani (Sawah)' : '🥬 Saung Kebun Sayur',
    titik: [x, z + 2.2],
    radius: 1.6,
    penanda: [x, 3.2, z],
    aksi: ['bantuPanen'],
  })),
  // Pasar kaget: dua titik di lorong (barat & timur jalan vertikal tengah)
  ...[-1, 1].map((s): InteraksiDef => ({
    id: `pasarKaget${s < 0 ? 'Barat' : 'Timur'}`,
    nama: '🏮 Pasar Kaget',
    titik: [(s * (PASAR_KAGET.x0 + PASAR_KAGET.x1)) / 2, PASAR_KAGET.z],
    radius: 3.0,
    penanda: [(s * (PASAR_KAGET.x0 + PASAR_KAGET.x1)) / 2, 3.2, PASAR_KAGET.z],
    aksi: ['jajanPasarKaget'],
  })),
  { id: 'lapanganKampung', nama: '⚽ Lapangan Kampung', titik: [LAPANGAN_KAMPUNG.x, LAPANGAN_KAMPUNG.z], radius: 4.5, penanda: [LAPANGAN_KAMPUNG.x, 2.6, LAPANGAN_KAMPUNG.z], aksi: ['mainBolaKampung'] },
];

/** Interaksi di dalam gedung: pintu keluar, konter (aksi gedung), meja kerja kafe, tuan rumah warga. */
function interaksiGedung(id: string): InteraksiDef[] {
  const t = tataGedung(id);
  if (!t) return [];
  const b = t.bangunan;
  const daftar: InteraksiDef[] = [
    { id: 'pintuGedung', nama: '🚪 Pintu Keluar', titik: [PINTU_GEDUNG.x + 0.8, PINTU_GEDUNG.z], radius: 1.0, penanda: [PINTU_GEDUNG.x + 0.1, 2.4, PINTU_GEDUNG.z], aksi: ['keluarGedung'] },
  ];
  const aksi = aksiKonter(b);
  if (t.konter && aksi.length > 0) {
    daftar.push({ id: 'konter', nama: `${b.ikon} ${PENJAGA[b.id]?.nama ?? b.nama}`, titik: [t.konter.x, t.konter.z], radius: 1.5, penanda: [t.penjaga.x, 2.3, t.penjaga.z], aksi });
  }
  if (t.tuanRumah) {
    const w = WARGA.find((x) => x.id === t.tuanRumah);
    if (w) daftar.push({ id: `${PREFIX_WARGA}${w.id}`, nama: `${w.ikon} ${w.nama} (${w.peran})`, titik: [t.penjaga.x, t.penjaga.z + 0.9], radius: 1.3, penanda: [t.penjaga.x, 2.3, t.penjaga.z], aksi: [] });
  }
  if (t.meja) daftar.push({ id: 'mejaKafe', nama: '💻 Meja Kerja', titik: [t.meja.x, t.meja.z], radius: 1.2, penanda: [t.meja.x, 1.6, t.meja.z - 1.1], aksi: ['wfhKafe', 'nugasKafe'] });
  return daftar;
}

const cacheGedung = new Map<string, InteraksiDef[]>();
/** Daftar interaksi untuk lokasi sekarang (gedung: tergantung gedung yang dimasuki). */
export function daftarInteraksi(lokasi: Lokasi, gedung: string | null): readonly InteraksiDef[] {
  if (lokasi !== 'gedung') return INTERAKSI[lokasi];
  if (!gedung) return [];
  let d = cacheGedung.get(gedung);
  if (!d) {
    d = interaksiGedung(gedung);
    cacheGedung.set(gedung, d);
  }
  return d;
}

export const INTERAKSI: Record<Lokasi, readonly InteraksiDef[]> = {
  kamar: [
    { id: 'kasur', nama: '🛏️ Kasur', titik: [-2.2, -1.7], radius: 1.0, penanda: [-3.2, 0.95, -1.85], aksi: ['tidur', 'rebahan'] },
    { id: 'meja', nama: '📚 Meja Belajar', titik: [0.8, -1.6], radius: 0.95, penanda: [0.8, 1.25, -2.4], aksi: ['belajar', 'nugas', 'freelance', 'nulisSkripsi', 'kerjakanLomba'] },
    {
      id: 'akuarium',
      nama: '🐟 Akuarium Cupang',
      titik: [AKUARIUM.x, AKUARIUM.z + 0.85],
      radius: 0.75,
      penanda: [AKUARIUM.x, 1.4, AKUARIUM.z],
      aksi: ['kasihMakanIkan'],
      syarat: (d) => !!d.tas.akuarium,
    },
    {
      id: 'tanaman',
      nama: '🪴 Pot Tanaman',
      titik: [2.15, -1.9],
      radius: 0.7,
      penanda: [2.15, 1.5, -2.62],
      aksi: ['siramTanaman'],
      syarat: (d) => d.level.dekorasi === 3,
    },
    // M12: galon air & pot cabai (di jendela dapur) ada di pojok dapur
    { id: 'dapur', nama: '🍳 Pojok Dapur, Galon & Pot Cabai', titik: [-2.8, 0.4], radius: 0.95, penanda: [-3.55, 1.35, 0.25], aksi: ['masakMi', 'minum', 'siramCabai', 'panenCabai'] },
    { id: 'pintu', nama: '🚪 Pintu', titik: [-3.3, 2.0], radius: 0.95, penanda: [-3.7, 2.4, 2.0], aksi: ['keluar'] },
    { id: 'lemari', nama: '📦 Lemari (Belanja Online & Sapu)', titik: [3.2, -1.65], radius: 0.95, penanda: [3.2, 1.95, -2.5], aksi: ['bukaUpgrade', 'bersihKamar'] },
    { id: 'ember', nama: '🚿 Kamar Mandi', titik: [2.95, 1.6], radius: 1.0, penanda: [3.0, 1.4, 2.4], aksi: ['mandi', 'buangAir'] },
    { id: 'gitar', nama: '🎸 Gitar', titik: [-3.0, -0.48], radius: 0.8, penanda: [-3.82, 1.7, -0.48], aksi: ['mainGitar'] },
  ],
  dunia: [
    ...dariBangunan,
    ...interaksiAreaBaru,
    { id: 'taman', nama: '🌳 Bangku Taman', titik: [TAMAN.bangku.x, TAMAN.bangku.z - 1.1], radius: 1.3, penanda: [TAMAN.bangku.x, 1.6, TAMAN.bangku.z], aksi: ['santaiTaman', 'jogging'] },
    { id: 'lapangan', nama: '⚽ Lapangan Futsal', titik: [LAPANGAN.x, LAPANGAN.z], radius: 4.5, penanda: [LAPANGAN.x, 2.6, LAPANGAN.z], aksi: ['mainFutsal', 'jajanPasarMalam', 'naikKomidi'] },
    { id: 'kucing', nama: '🐱 Oyen (Kucing Kos)', titik: [KUCING.x + 0.9, KUCING.z + 0.6], radius: 1.3, penanda: [KUCING.x, 1.3, KUCING.z], aksi: ['elusKucing', 'kasihMakanOyen'] },
    { id: 'pertamini', nama: '⛽ Bensin Eceran & Bengkel Pak Jo', titik: [PERTAMINI.x, PERTAMINI.z + 1.2], radius: 1.6, penanda: [PERTAMINI.x, 2.2, PERTAMINI.z], aksi: ['isiBensin', 'bukaBengkel'] },
    { id: 'gerobak', nama: '🍳 Nasi Goreng Bang Jali', titik: [GEROBAK.x, GEROBAK.z + 1.5], radius: 1.5, penanda: [GEROBAK.x, 2.8, GEROBAK.z], aksi: ['gerobakNasgor'] },
    // M12: gerobak cilok keliling — titiknya ikut bergerak (TITIK_CILOK diubah tiap frame oleh GerobakCilok)
    { id: 'cilok', nama: '🍡 Cilok Mang Ujang', titik: TITIK_CILOK, radius: 1.6, penanda: [0, 0, 0], aksi: ['beliCilok'], dinamis: true, tanpaPenanda: true },
    ...HALTE.map(
      (h): InteraksiDef => ({
        id: h.id,
        nama: `🚏 ${h.nama}`,
        titik: [h.x, h.z + (h.hadap === '+z' ? 0.9 : -0.9)],
        radius: 2.6, // halte lebar 3.6 m — orang wajar mendekat dari samping
        penanda: [h.x, 3.2, h.z],
        aksi: ['naikAngkot'],
      }),
    ),
    {
      id: ID_MOTOR,
      nama: '🛵 Motor Kamu',
      titik: [PARKIR_MOTOR.x, PARKIR_MOTOR.z],
      radius: 1.4,
      penanda: [PARKIR_MOTOR.x, 1.9, PARKIR_MOTOR.z],
      aksi: ['naikMotor'],
      dinamis: true,
    },
  ],
  gedung: [], // lihat daftarInteraksi()
};

export const cariInteraksi = (lokasi: Lokasi, id: InteraksiId | null, gedung: string | null = null) =>
  daftarInteraksi(lokasi, gedung).find((i) => i.id === id) ?? null;

/** Warga yang sedang didekati: id interaksi "warga:<id>" (posisi warga berpindah-pindah). */
export const PREFIX_WARGA = 'warga:';
export const idWarga = (dekat: InteraksiId | null) => (dekat && dekat.startsWith(PREFIX_WARGA) ? dekat.slice(PREFIX_WARGA.length) : null);

/** Tujuan angkot: halte seberang. */
export function tujuanAngkot(dariId: InteraksiId): { x: number; z: number; rotY: number; nama: string } | null {
  const asal = HALTE.find((h) => h.id === dariId);
  const tujuan = HALTE.find((h) => h.id !== dariId);
  if (!asal || !tujuan) return null;
  const maju = tujuan.hadap === '+z' ? 1 : -1;
  return { x: tujuan.x, z: tujuan.z + maju * 1.6, rotY: maju > 0 ? 0 : Math.PI, nama: tujuan.nama };
}
