// Store global game (zustand). Menghubungkan mesin simulasi ↔ tampilan.
import { create } from 'zustand';
import {
  AKSI,
  beliMakanan,
  beliUpgrade,
  dataAwal,
  jalankanAksi,
  cekAksi,
  selesaiKerja,
  pilihEvent,
  catatEvent,
  jalankanPilihan,
  pakaiWaktu,
  majuMenit,
  menitMutlak,
  teksJam,
  JAM,
  KERJA,
  type JenisSibuk,
  slotWaktu,
  tambahStat,
  selesaiOjol,
  setSkorKuis,
  ujianAktif,
  LABEL_FASE,
  namaHari,
  formatRupiah,
  FITUR,
  TRANSISI_PULANG,
  type EventDef,
  type Profil,
  type RaporSemester,
  type HasilAksi,
  type AksiId,
  type HasilKerja,
  type PerabotId,
  type SaveData,
  type TempatKerja,
  type TempatMakan,
} from './sim';
import { hapusSave, muat, simpan } from './save';
import { adeganBerikut, cekCerita, jawabCerita } from './cerita';
import { F3, WARGA, cekJamMalam, hantuMuncul, jalankanSosial, type AksiSosial } from './m11';
import { PENGHUNI_RUMAH, SPAWN_GEDUNG } from './gedungLayout';
import { MINI_UNTUK, bikinSim, bonusMini, minumAir, panenCabai, siramCabai, type JenisMini } from './m12';
import { F4 } from './fisika';
import { idWarga, tujuanAngkot, type InteraksiId } from './interaksi';
import { BANGUNAN, PARKIR_MOTOR, SPAWN_DUNIA, titikDepan } from './duniaLayout';
import { SPAWN_KAMAR } from './kamarLayout';
import { playerPos } from './playerPos';
import { bacaGrafik, simpanGrafik, type Grafik } from './grafik';
import { mulaiSibuk, simpanOnline, kirimUpgradeKamar } from '../online/aksiOnline';
import { ambilSoal, beliBarang, buatOrder, cekKemajuan, pakaiBarang, setorTabungan, tarikTabungan, type OrderOjol, type Soal, type TitikOjol } from './fitur';
import { bacaZoom, simpanZoom } from './pengaturan';
import { getar } from './getar';
import {
  sfxAdukKopi,
  sfxPeluit,
  sfxLangkah,
  sfxKetik,
  sfxKlakson,
  sfxKoin,
  sfxMesin,
  sfxNotifHP,
  sfxPintu,
  sfxPop,
  sfxSalah,
  sfxSelesaiKerja,
  sfxTidur,
  sfxTuangKopi,
  sfxUpgrade,
  sfxWajan,
  sfxPencapaian,
  sfxMisi,
  sfxMeong,
  sfxGitar,
  sfxKecewa,
  sfxLevelUp,
  sfxWisuda,
  sfxIsiBensin,
  sfxFaseBersama,
} from '../audio/sfx';

/** `app` = id aplikasi HP sumber notifikasi (opsional; bila kosong ditebak dari emoji depan teks) */
export type Toast = { id: number; teks: string; app?: string };
export type Transisi = { id: number; teks: string };
export type Pose = { x: number; z: number; rotY: number };

type GameState = SaveData & {
  dekat: InteraksiId | null;
  toasts: Toast[];
  transisi: Transisi | null;
  menuTerbuka: boolean;
  menuMakan: TempatMakan | null;
  petaTerbuka: boolean;
  /** Mini-game kerja sambilan yang sedang dibuka */
  kerja: TempatKerja | null;
  /** Panel upgrade kamar terbuka? */
  menuUpgrade: boolean;
  /** Event random yang sedang ditampilkan (dialog pilihan) */
  event: EventDef | null;
  /** Layar judul (menu utama) saat game baru dibuka */
  layarUtama: boolean;
  grafik: Grafik;
  /** Naik setiap ada momen meriah → memicu partikel konfeti */
  konfeti: number;
  /** Sedang main online? (save dikirim ke server, waktu maju bersama) */
  online: boolean;
  /** Online: sedang tidur / pulang kampung menunggu teman → tidak bisa bergerak */
  terkunci: boolean;
  // ===== M7 =====
  hpTerbuka: boolean;
  tokoBarang: boolean;
  buatKarakter: boolean;
  /** Animasi pembuka sedang diputar (tidak disimpan; lihat src/three/pembuka) */
  pembuka: boolean;
  /** Pembuka selesai / dilewati → tandai `pembukaSelesai`, simpan, kembali ke kamar */
  selesaiPembuka: () => void;
  raporBaru: RaporSemester | null;
  ojol: OjolState | null;
  /** Buka/tutup HP. `app` = langsung buka aplikasi tertentu (mis. 'pengaturan'); tanpa app = layar utama */
  setHP: (buka: boolean, app?: string | null) => void;
  /** Aplikasi HP yang sedang dibuka (null = layar utama) */
  hpApp: string | null;
  /** Jumlah notifikasi belum dibaca (badge 📱 & 🔔) */
  notifBaru: number;
  bacaNotif: () => void;
  setTokoBarang: (buka: boolean) => void;
  simpanProfil: (p: Profil) => void;
  beliBarangIni: (id: string) => void;
  pakaiBarangIni: (id: string) => void;
  tabung: (jumlah: number, setor: boolean) => void;
  tutupRapor: () => void;
  akhiriOjol: () => void;
  /** Dipanggil pelacak ojol saat pemain sampai di titik jemput/antar, atau waktu habis */
  majuOjol: (jenis: 'sampai' | 'habis') => void;
  // ===== M8 =====
  bengkel: boolean;
  /** M12: panel layanan gedung baru yang sedang terbuka (bank, karier, toko tani, salon, pos polisi) */
  panelTempat: PanelTempat | null;
  /** M12: mini-game fisika yang sedang dimainkan (aksi = aksi yang dijalankan setelah selesai) */
  miniFisika: { jenis: JenisMini; aksi: AksiId | null } | null;
  /** Selesai mini-game: skor 0..1, 'lewati' = aksi biasa tanpa bonus, 'batal' = tidak jadi */
  akhiriMini: (hasil: number | 'lewati' | 'batal') => void;
  kuisUjian: Soal[] | null;
  wisuda: boolean;
  emote: { jenis: 'lompat' | 'putar' | 'lambai'; id: number } | null;
  zoom: number;
  modeFoto: boolean;
  kilat: number;
  riwayat: { teks: string; waktu: string; app?: string }[];
  /** Jalankan fungsi fitur (HP, toko, bengkel) yang mengubah save, lengkap dengan suara & toast */
  fitur: (fn: (d: SaveData) => HasilAksi, suara?: 'koin' | 'pop' | 'notif' | 'upgrade' | 'peluit') => boolean;
  kurangiBensin: (n: number) => void;
  jawabKuis: (benar: number) => void;
  setEmote: (jenis: 'lompat' | 'putar' | 'lambai') => void;
  /** Sedang melakukan aksi berwaktu (kuliah, kerja, tidur...) sampai menit mutlak `sampai` */
  sibuk: { sampai: number; jenis: JenisSibuk; label: string; mulai: number } | null;
  /** Majukan jam game `n` menit (dipanggil detak jam offline / pesan jam server online) */
  majukanJam: (n: number) => void;
  /** Tunggu / santai 1 jam (lewati waktu) */
  tunggu: () => void;
  /** Sudut putar kamera mengelilingi pemain (radian; π/4 = sudut isometric awal) */
  kameraSudut: number;
  /** Putar kamera sebesar `delta` radian (di kamar dibatasi agar dinding tinggi tidak menghalangi) */
  putarKamera: (delta: number) => void;
  /** Atur zoom (0.6 dekat … 1.6 jauh) */
  setZoom: (z: number) => void;
  /** Titik muncul khusus saat scene berikutnya dimuat (mis. depan pintu gedung) */
  spawnBerikut: Pose | null;
  /** M11: aksi sosial ke warga yang sedang didekati (ngobrol, hadiah, tembak, kencan, ...) */
  lakukanSosial: (aksi: AksiSosial) => void;
  /** Pemain terdeteksi tidak bisa bergerak (tombol 🆘 muncul) */
  nyangkut: boolean;
  setNyangkut: (v: boolean) => void;
  /** Pindahkan pemain ke titik aman terdekat */
  lepasNyangkut: () => void;
  /** Dipakai modul online: terapkan data baru (+ simpan) */
  terapkanOnline: (baru: SaveData, pesan?: string[]) => void;
  /** Dipakai modul online: cek event random setelah jam bersama maju */
  cobaEventOnline: () => void;
  pilihEventIni: (indeks: number) => void;
  mulaiMain: (baru: boolean) => void;
  setGrafik: (g: Grafik) => void;
  /** Sedang naik motor sendiri? (tidak disimpan — motor kembali ke parkiran kos saat dimuat) */
  naikMotor: boolean;
  motorParkir: Pose;
  /**
   * Perintah pindah posisi pemain (angkot / turun motor). `id` naik setiap perintah baru.
   * `cadangan` = posisi lain yang dicoba jika posisi utama tertutup tembok/pohon.
   */
  teleport: (Pose & { id: number; cadangan?: [number, number][] }) | null;
  setDekat: (id: InteraksiId | null) => void;
  setMenu: (buka: boolean) => void;
  setMenuMakan: (tempat: TempatMakan | null) => void;
  setPeta: (buka: boolean) => void;
  toast: (teks: string) => void;
  /** Notifikasi push dengan aplikasi sumber eksplisit (ikon di banner); toast() = notif tanpa sumber */
  notif: (teks: string, app?: string) => void;
  lakukan: (aksi: AksiId) => void;
  beli: (tempat: TempatMakan, itemId: string) => void;
  /** Akhiri mini-game kerja. `null` = batal sebelum mulai (tidak ada efek). */
  akhiriKerja: (hasil: HasilKerja | null) => void;
  setMenuUpgrade: (buka: boolean) => void;
  upgrade: (id: PerabotId) => void;
  reset: () => void;
};

/** M12: panel layanan gedung baru (lihat ui/PanelTempat.tsx). */
export const PANEL_TEMPAT = ['bank', 'karier', 'tani', 'salon', 'polisi'] as const;
export type PanelTempat = (typeof PANEL_TEMPAT)[number];
const isPanelTempat = (v: string | undefined): v is PanelTempat => (PANEL_TEMPAT as readonly string[]).includes(v ?? '');

/** Ambil bagian data yang perlu disimpan dari state. */
// Semua kunci SaveData (diambil dari data awal) → field baru otomatis ikut tersimpan
const KUNCI_SAVE = Object.keys(dataAwal()) as (keyof SaveData)[];
export function ambilSave(s: SaveData): SaveData {
  const d: Record<string, unknown> = {};
  for (const k of KUNCI_SAVE) d[k] = s[k];
  return d as SaveData;
}

/** Sesi narik ojol yang sedang berjalan (tidak disimpan). */
export type OjolState = {
  ke: number; // order ke- (0-based)
  order: OrderOjol;
  tahap: 'jemput' | 'antar';
  batas: number; // performance.now() saat order kedaluwarsa
  total: number;
  selesai: number;
  gagal: number;
};

/** true jika ada layar/menu yang menutupi permainan (pemain tidak boleh jalan). */
export const uiTerbuka = (
  s: Pick<
    GameState,
    | 'transisi'
    | 'menuTerbuka'
    | 'menuMakan'
    | 'petaTerbuka'
    | 'kerja'
    | 'menuUpgrade'
    | 'event'
    | 'layarUtama'
    | 'terkunci'
    | 'hpTerbuka'
    | 'tokoBarang'
    | 'buatKarakter'
    | 'raporBaru'
    | 'bengkel'
    | 'panelTempat'
    | 'miniFisika'
    | 'kuisUjian'
    | 'wisuda'
    | 'pembuka'
  >,
) =>
  !!s.transisi ||
  s.bengkel ||
  s.panelTempat !== null ||
  s.miniFisika !== null ||
  s.kuisUjian !== null ||
  s.wisuda ||
  s.terkunci ||
  s.hpTerbuka ||
  s.tokoBarang ||
  s.buatKarakter ||
  s.raporBaru !== null ||
  s.menuTerbuka ||
  s.menuMakan !== null ||
  s.petaTerbuka ||
  s.kerja !== null ||
  s.menuUpgrade ||
  s.event !== null ||
  s.layarUtama ||
  s.pembuka;

const SAVE_AWAL = muat();
/** true jika pemain baru pertama kali main (belum ada save). */
export const PEMAIN_BARU = SAVE_AWAL === null;

let nextId = 1;
/** true saat kuliah dijalankan setelah mini-game soal ujian selesai (jangan buka soal lagi) */
let lewatiKuis = false;
/** true saat aksi dijalankan dari akhir mini-game (agar tidak membuka mini-game lagi) */
let lewatiMini = false;
/** Cerita: kapan antrean dialog mulai terisi (performance.now), untuk jeda sebelum ditampilkan */
let ceritaSiapSejak = 0;
const CERITA_JEDA_MS = 2000;
/** BUG-06: antrean event acak yang menunggu layar kosong (maks 3 agar tidak menumpuk) */
const antreanEvent: EventDef[] = [];
export const antreanEventAcak = antreanEvent; // dibaca tes otomatis
const TOAST_MS = 3200;

// BUG-05: jumlah notif belum dibaca disimpan terpisah agar badge HP tetap ada setelah reload
const KUNCI_NOTIF_BARU = 'mhs-notif-baru';
function bacaNotifBaru(): number {
  try {
    const n = Number(localStorage.getItem(KUNCI_NOTIF_BARU) ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.min(99, Math.floor(n))) : 0;
  } catch {
    return 0;
  }
}
function simpanNotifBaru(n: number): void {
  try {
    localStorage.setItem(KUNCI_NOTIF_BARU, String(n));
  } catch {
    /* penyimpanan penuh/diblokir: abaikan */
  }
}
const TRANSISI_MS = 1300;

/** Titik jemput/antar ojol: depan semua bangunan yang punya aksi (kos, kampus, warung, toko...). */
const TEMPAT_OJOL: TitikOjol[] = BANGUNAN.filter((b) => b.aksi).map((b) => {
  const [x, z] = titikDepan(b, 1.6);
  return { x, z, nama: `${b.ikon} ${b.nama}` };
});
const GANTI_SCENE_MS = 380; // ganti dunia saat layar transisi sudah gelap

/** Suara yang cocok untuk tiap aksi. */
function sfxAksi(id: AksiId) {
  const jenis = AKSI[id].jenis;
  if (id === 'kuliah' || id === 'rebahan') sfxNotifHP();
  else if (id === 'belajar' || id === 'nugas') sfxKetik();
  else if (id === 'masakMi') sfxWajan();
  else if (id === 'nongkrong') sfxAdukKopi();
  else if (jenis === 'tidur') sfxTidur();
  else if (jenis === 'pindah') sfxPintu();
  else if (jenis === 'angkot') sfxKlakson();
  else if (id === 'mainGame' || id === 'printTugas') sfxKetik();
  else if (id === 'periksa') sfxNotifHP();
  else if (id === 'elusKucing') sfxMeong();
  else if (id === 'mainGitar') sfxGitar();
  else if (id === 'mandi') sfxTuangKopi(); // gemericik air dari gayung
  else if (id === 'bersihKamar') sfxWajan(); // desis sapu
  else if (id === 'freelance' || id === 'lesPrivat' || id === 'nulisSkripsi' || id === 'wfhKafe' || id === 'nugasKafe') sfxKetik();
  else if (id === 'buangAir') sfxTuangKopi(); // siraman air
  else if (id === 'isiBensin') sfxIsiBensin();
  else if (id === 'kasihMakanOyen') sfxMeong();
  else if (id === 'kasihMakanIkan' || id === 'siramTanaman') sfxTuangKopi(); // gemericik air
  else if (id === 'bimbingan' || jenis === 'ngobrol') sfxNotifHP();
  else if (id === 'naikKomidi') sfxUpgrade();
  // M12
  else if (id === 'tendangPenalti') sfxPeluit();
  else if (id === 'latihanGym') sfxLangkah();
  // M13 area baru (pakai SFX yang sudah ada; TODO-ASET: suara cipratan pancing & cangkul dari 23)
  else if (id === 'ngopiTepiKali') sfxAdukKopi();
  else if (id === 'mancing') sfxTuangKopi();
  else if (id === 'bantuPanen') sfxLangkah();
  else if (id === 'mainBolaKampung') sfxPeluit();
  else sfxPop();
}

export const useGame = create<GameState>()((set, get) => {
  const mulaiTransisi = (teks: string) => {
    const id = nextId++;
    set({ transisi: { id, teks } });
    setTimeout(() => {
      if (get().transisi?.id === id) set({ transisi: null });
    }, TRANSISI_MS);
  };

  /** Terapkan data baru; pindah lokasi ditunda sampai layar gelap. */
  /**
   * Cerita utama: tampilkan dialog di kepala antrean bila layar kosong (tidak ada menu/dialog/sibuk/pembuka).
   * Ditunda ± 2 detik sejak antrean terisi agar tidak bertabrakan dengan layar wisuda/rapor/transisi.
   */
  const tampilkanCerita = () => {
    const st = get();
    if (st.cerita.antrean.length === 0) {
      ceritaSiapSejak = 0;
      return;
    }
    const kini = performance.now();
    if (ceritaSiapSejak === 0) ceritaSiapSejak = kini;
    if (kini - ceritaSiapSejak < CERITA_JEDA_MS || st.sibuk || st.ojol || uiTerbuka(st)) return;
    const ev = adeganBerikut(ambilSave(st));
    if (!ev) return;
    set({ event: ev });
    sfxNotifHP();
  };

  /**
   * BUG-06: event acak yang sudah diundi masuk antrean dan baru tampil saat layar benar-benar kosong
   * (tidak ada dialog cerita, pembuka, mini-game, menu, transisi, sibuk). Dulu event langsung dibuang
   * bila ada dialog lain → pemain kehilangan event tanpa tahu. Dialog cerita tetap didahulukan.
   */
  const tampilkanEventAntre = () => {
    const st = get();
    if (antreanEvent.length === 0 || st.sibuk || st.ojol || uiTerbuka(st)) return;
    if (st.cerita.antrean.length > 0) return; // cerita duluan, event menyusul
    const ev = antreanEvent.shift();
    if (!ev) return;
    set({ event: ev });
    sfxNotifHP();
  };
  // Cek antrean tiap detik (murah: hanya membaca state) supaya event muncul segera setelah layar kosong
  if (typeof window !== 'undefined') window.setInterval(tampilkanEventAntre, 1000);

  const terapkanData = (lama: SaveData, baru00: SaveData) => {
    // Cerita utama: cek pemicu bab/adegan (data sama persis bila tidak ada perubahan)
    const cr = cekCerita(baru00);
    const baru0 = cr.data;
    if (cr.pesan.length > 0) setTimeout(() => cr.pesan.forEach((p) => get().toast(p)), 600);
    // Cek misi harian & pencapaian setiap kali data berubah
    const k = cekKemajuan(baru0);
    const baru = k.data;
    if (k.pesan.length > 0) {
      setTimeout(() => k.pesan.forEach((p) => get().toast(p)), 400);
      if (k.pencapaianBaru.length > 0) {
        sfxPencapaian();
        getar([20, 40, 20]);
        set((s) => ({ konfeti: s.konfeti + 1 }));
      } else if (k.misiBaru > 0) sfxMisi();
    }
    if (k.levelNaik) sfxLevelUp();
    // Lulus sidang → layar wisuda
    if (baru.lulus && !lama.lulus) {
      setTimeout(() => {
        set((s) => ({ wisuda: true, konfeti: s.konfeti + 1 }));
        sfxWisuda();
      }, TRANSISI_MS + 300);
    }
    // Semester berganti → tampilkan rapor
    if (baru.rapor.length > lama.rapor.length) {
      const r = baru.rapor[baru.rapor.length - 1];
      setTimeout(() => set({ raporBaru: r }), TRANSISI_MS + 300);
    }
    if (baru.lokasi !== lama.lokasi) {
      // Ganti scene setelah layar transisi menutup (gedung ikut diganti bersamaan)
      set({ ...baru, lokasi: lama.lokasi, gedung: lama.gedung });
      setTimeout(() => {
        // Masuk ke kamar saat naik motor → motor otomatis diparkir di depan kos
        const parkir = get().naikMotor ? { naikMotor: false, motorParkir: { ...PARKIR_MOTOR } } : {};
        set({ lokasi: baru.lokasi, gedung: baru.gedung, dekat: null, ...parkir });
      }, GANTI_SCENE_MS);
    } else {
      set(baru);
    }
    if (get().online) simpanOnline(baru);
    else simpan(baru);
    tampilkanCerita();
  };

  /** Jam real-time: tidak bisa memulai aksi berwaktu lain saat masih sibuk. */
  const tungguTeman = (aksi: AksiId): boolean => {
    if (!pakaiWaktu(aksi) || !get().sibuk) return false;
    sfxSalah();
    get().toast('⏳ Masih sibuk, tunggu sampai selesai dulu ya!');
    return true;
  };

  /**
   * Aksi memakan waktu → pemain "sibuk" sampai jam tertentu (karakter terkunci, jam dipercepat).
   * Online: server diberi tahu agar jam bersama bisa dipercepat kalau semua pemain sibuk.
   */
  const catatTunda = (hasil: HasilAksi, aksi: AksiId | null, lokasi: SaveData['lokasi'], label?: string) => {
    if (hasil.ditolak || !hasil.tunda) return;
    const t = hasil.tunda;
    const sampai = menitMutlak(hasil.data) + t.menit;
    const nama =
      t.jenis === 'pulang' ? '🚌 Pulang kampung' : t.jenis === 'tidur' ? '😴 Tidur' : (label ?? (aksi ? `${AKSI[aksi].ikon} ${AKSI[aksi].label}` : '⏳ Sibuk'));
    set({ sibuk: { sampai, jenis: t.jenis, label: nama, mulai: menitMutlak(hasil.data) }, terkunci: true, dekat: null });
    if (get().online) mulaiSibuk(sampai, t.jenis, aksi, lokasi);
  };

  const teleport = (pose: Pose, tunda = 0, cadangan?: [number, number][]) => {
    const kirim = () => set({ teleport: { ...pose, id: nextId++, cadangan }, dekat: null });
    if (tunda > 0) setTimeout(kirim, tunda);
    else kirim();
  };

  /**
   * Setelah waktu maju (fase/hari berganti), mungkin muncul event random.
   * Dialog ditampilkan setelah layar transisi selesai agar tidak bertumpuk.
   */
  const cobaEvent = (lama: SaveData, hasil: HasilAksi) => {
    const baru = hasil.data;
    if (hasil.ditolak || hasil.transisi === TRANSISI_PULANG) return;
    if (lama.fase === baru.fase && lama.hari === baru.hari) return;
    const ev = pilihEvent(baru);
    if (!ev) return;
    const dicatat = catatEvent(baru, ev.id);
    set({ eventHari: dicatat.eventHari, eventTerakhir: dicatat.eventTerakhir });
    simpan(ambilSave(get()));
    // Masuk antrean (bukan dibuang); dicoba lagi setelah layar transisi selesai
    if (antreanEvent.length < 3) antreanEvent.push(ev);
    setTimeout(tampilkanEventAntre, TRANSISI_MS + 150);
  };

  /** Naik / turun motor (tidak memakai waktu). */
  const aksiKendaraan = (aksi: AksiId) => {
    const st = get();
    if (aksi === 'klakson') {
      sfxKlakson();
      return;
    }
    if (aksi === 'naikMotor') {
      if (st.naikMotor) return;
      // Pemain "naik" tepat di posisi motor yang diparkir
      teleport(st.motorParkir);
      set({ naikMotor: true });
      sfxMesin();
      get().toast('🛵 Brum brum! Tekan Turun / F untuk parkir.');
    } else {
      if (!st.naikMotor) return;
      // Motor diparkir di posisi sekarang; pemain turun ke samping kanan motor.
      // Jika kanan tertutup, Player mencoba kiri → belakang → depan → posisi motor.
      const { x, z, rotY } = playerPos;
      const kanan: [number, number] = [-Math.cos(rotY), Math.sin(rotY)];
      const maju: [number, number] = [Math.sin(rotY), Math.cos(rotY)];
      const geser = (a: [number, number], j: number): [number, number] => [x + a[0] * j, z + a[1] * j];
      const [kx, kz] = geser(kanan, 0.9);
      set({ naikMotor: false, motorParkir: { x, z, rotY } });
      teleport({ x: kx, z: kz, rotY }, 0, [
        geser(kanan, -0.9),
        geser(maju, -1.4),
        geser(maju, 1.4),
        [x, z],
      ]);
      sfxPop();
      get().toast('🅿️ Motor diparkir. Dekati lagi untuk naik.');
    }
  };

  return {
    ...(SAVE_AWAL ?? dataAwal()),
    dekat: null,
    toasts: [],
    transisi: null,
    menuTerbuka: false,
    menuMakan: null,
    petaTerbuka: false,
    kerja: null,
    menuUpgrade: false,
    event: null,
    layarUtama: true,
    grafik: bacaGrafik(),
    konfeti: 0,
    naikMotor: false,
    motorParkir: { ...PARKIR_MOTOR },
    teleport: null,

    setDekat: (dekat) => set({ dekat }),
    setMenuUpgrade: (menuUpgrade) => set({ menuUpgrade }),
    // Rombak UI: pengaturan kini aplikasi di HP → setMenu(true) membuka HP › Pengaturan
    setMenu: (buka) => set(buka ? { hpTerbuka: true, hpApp: 'pengaturan', menuTerbuka: false } : { hpTerbuka: false, menuTerbuka: false }),
    setMenuMakan: (menuMakan) => set({ menuMakan }),
    setPeta: (petaTerbuka) => set({ petaTerbuka }),

    // toast(teks) tetap 1 parameter (dipakai sebagai callback forEach); sumber aplikasi lewat notif(teks, app)
    toast: (teks) => get().notif(teks),
    notif: (teks, app) => {
      const id = nextId++;
      // Riwayat notifikasi untuk aplikasi "Pesan" di HP (60 terakhir, tidak disimpan)
      const s0 = get();
      const waktu = `${namaHari(s0.hari).slice(0, 3)} tgl ${s0.tanggal} · ${teksJam(s0.menit)}`;
      // Maks. 3 banner bertumpuk (yang lama hilang dulu); badge belum dibaca maks. 99
      set((s) => ({
        toasts: [...s.toasts.slice(-2), { id, teks, app }],
        riwayat: [...s.riwayat.slice(-59), { teks, waktu, app }],
        notifBaru: Math.min(99, s.notifBaru + 1),
      }));
      simpanNotifBaru(get().notifBaru);
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), TOAST_MS);
    },

    online: false,
    terkunci: false,
    hpTerbuka: false,
    tokoBarang: false,
    buatKarakter: false,
    pembuka: false,
    selesaiPembuka: () => {
      const st = get();
      if (!st.pembuka) return;
      const lama = ambilSave(st);
      set({ pembuka: false });
      if (!lama.pembukaSelesai) {
        terapkanData(lama, { ...lama, pembukaSelesai: true });
        const nama = lama.profil?.nama ?? 'Mahasiswa';
        get().toast(`🎉 Halo, ${nama}! Selamat datang di Kos Melati.`);
        get().toast('📱 Cek misi harian & profilmu di tombol HP (kanan atas).');
      }
    },
    raporBaru: null,
    ojol: null,
    bengkel: false,
    panelTempat: null,
    miniFisika: null,
    akhiriMini: (hasil) => {
      const m = get().miniFisika;
      set({ miniFisika: null });
      if (!m || hasil === 'batal') return;
      // Ujian praktik SIM: harus lulus dulu baru SIM dibuat
      if (m.jenis === 'sim') {
        const MF = F4.miniFisika.sim;
        if (typeof hasil === 'number' && hasil * MF.percobaan >= MF.lulusMin - 0.01) get().fitur(bikinSim, 'upgrade');
        else {
          sfxSalah();
          get().toast(`🪪 Belum lulus ujian praktik (minimal ${MF.lulusMin}/${MF.percobaan} rem pas). Coba lagi, gratis kok!`);
        }
        return;
      }
      if (m.aksi) {
        lewatiMini = true;
        get().lakukan(m.aksi);
        lewatiMini = false;
      }
      // Bonus dari skor diberikan setelah aksi biasanya berjalan
      if (typeof hasil === 'number') {
        const skor = hasil;
        setTimeout(() => get().fitur((d) => bonusMini(d, m.jenis, skor), 'pop'), 500);
      }
    },
    kuisUjian: null,
    wisuda: false,
    emote: null,
    zoom: bacaZoom(),
    modeFoto: false,
    kilat: 0,
    riwayat: [],
    hpApp: null,
    notifBaru: bacaNotifBaru(),
    bacaNotif: () => {
      set({ notifBaru: 0 });
      simpanNotifBaru(0);
    },

    fitur: (fn, suara = 'pop') => {
      const lama = ambilSave(get());
      const h = fn(lama);
      if (h.ditolak) sfxSalah();
      else {
        if (h.tunda && get().sibuk) {
          // Sedang sibuk aksi lain → tolak aksi berwaktu
          sfxSalah();
          get().toast('⏳ Masih sibuk, tunggu sampai selesai dulu ya!');
          return false;
        }
        terapkanData(lama, h.data);
        if (h.tunda) catatTunda(h, null, h.data.lokasi, h.label);
        if (suara === 'koin') sfxKoin();
        else if (suara === 'notif') sfxNotifHP();
        else if (suara === 'upgrade') sfxUpgrade();
        else if (suara === 'peluit') sfxPeluit();
        else sfxPop();
      }
      h.pesan.forEach((p) => get().toast(p));
      return !h.ditolak;
    },

    kurangiBensin: (n) => {
      const st = get();
      const baru = Math.max(0, Math.round((st.bensin - n) * 10) / 10);
      if (baru === 0 && st.bensin > 0) {
        sfxSalah();
        get().toast('⛽ Bensin habis! Motor mogok... dorong pelan-pelan ke bensin eceran Pak Jo (samping kos).');
        set((s) => ({ stat: { ...s.stat, mogok: (s.stat.mogok ?? 0) + 1 } }));
      } else if (baru < 15 && st.bensin >= 15) get().toast('⛽ Bensin tinggal sedikit, segera isi!');
      set({ bensin: baru });
    },

    jawabKuis: (benar) => {
      const n = get().kuisUjian?.length ?? 3;
      set({ kuisUjian: null });
      setSkorKuis(benar / n);
      if (benar === n) set((s) => ({ stat: { ...s.stat, kuisSempurna: (s.stat.kuisSempurna ?? 0) + 1 } }));
      lewatiKuis = true;
      get().lakukan('kuliah');
      lewatiKuis = false;
      setSkorKuis(null);
    },

    setEmote: (jenis) => {
      set({ emote: { jenis, id: nextId++ } });
      getar(10);
    },

    sibuk: null,
    majukanJam: (n) => {
      if (n <= 0) return;
      const st = get();
      const lama = ambilSave(st);
      const sb = st.sibuk;
      const jenis = sb && menitMutlak(lama) < sb.sampai ? sb.jenis : null;
      // M12: sibuk aksi di kamar (belajar, nugas, freelance...) = laptop menyala → pakai listrik
      const r = majuMenit(lama, n, jenis, jenis === 'aksi' && lama.lokasi === 'kamar');
      // Jam malam kos: telat pulang → diomeli / didenda pemilik kos
      const jm = cekJamMalam(lama, r.data);
      let baru = jm.data;
      // Wisma Kenanga: kadang terlihat "penghuni lama" di pojok kamar 👻
      if (jenis !== 'tidur' && hantuMuncul(baru) && baru.hantuSlot !== slotWaktu(baru)) {
        baru = tambahStat({ ...baru, hantuSlot: slotWaktu(baru), stres: Math.min(100, baru.stres + F3.hantu.stresLihat) }, 'lihatHantu');
        jm.pesan.push(`👻 Ada sosok putih melayang di pojok kamar! 😵+${F3.hantu.stresLihat}`);
      }
      terapkanData(lama, baru);
      [...r.pesan, ...jm.pesan].forEach((p) => get().toast(p));
      // Selesai sibuk?
      if (sb && menitMutlak(r.data) >= sb.sampai) {
        set({ sibuk: null, terkunci: false });
        if (sb.jenis === 'tidur') sfxNotifHP();
        else sfxPop();
        get().toast(`${sb.jenis === 'tidur' ? '☀️ Bangun!' : `✅ Selesai: ${sb.label}`} · jam ${teksJam(r.data.menit)}`);
      }
      // Ganti fase (pagi → siang, dst.) saat tidak sibuk: info kecil + kemungkinan event random
      if (r.gantiFase > 0 && !get().sibuk) {
        sfxFaseBersama();
        get().toast(`${LABEL_FASE[r.data.fase]} · jam ${teksJam(r.data.menit)}`);
        get().cobaEventOnline();
      }
    },
    tunggu: () => {
      if (get().sibuk) return;
      const lama = ambilSave(get());
      catatTunda({ data: lama, pesan: [], tunda: { menit: JAM.tungguMenit, jenis: 'aksi' } }, null, lama.lokasi, '⏳ Santai sejenak');
      sfxPop();
    },
    kameraSudut: Math.PI / 4,
    putarKamera: (delta) => {
      const st = get();
      let a = st.kameraSudut + delta;
      // Di kamar hanya dinding depan & kanan yang rendah → kamera dibatasi di sisi itu
      if (st.lokasi !== 'dunia') a = Math.max(0.15, Math.min(Math.PI / 2 - 0.15, a));
      set({ kameraSudut: a });
    },
    setZoom: (z) => {
      const zoom = Math.max(0.6, Math.min(1.6, z));
      simpanZoom(zoom);
      set({ zoom });
    },

    spawnBerikut: null,
    lakukanSosial: (aksi) => {
      const id = idWarga(get().dekat);
      if (!id) return;
      const ok = get().fitur((d) => jalankanSosial(d, aksi, id), aksi === 'tembak' || aksi === 'ajakTinggal' ? 'notif' : aksi === 'kasihHadiah' ? 'koin' : 'pop');
      getar(10);
      if (ok && (aksi === 'tembak' || aksi === 'ajakTinggal') && get().pacar) set((s) => ({ konfeti: s.konfeti + 1 }));
    },
    nyangkut: false,
    setNyangkut: (nyangkut) => set({ nyangkut }),
    lepasNyangkut: () => {
      const st = get();
      sfxPop();
      if (st.lokasi === 'gedung') {
        teleport({ ...SPAWN_GEDUNG });
      } else if (st.lokasi === 'kamar') {
        teleport({ ...SPAWN_KAMAR });
      } else {
        // Titik aman: depan bangunan + depan kos, urut dari yang terdekat (Player mencoba satu per satu jika tertutup)
        const titik = [...TEMPAT_OJOL.map((t) => [t.x, t.z] as [number, number]), [SPAWN_DUNIA.x, SPAWN_DUNIA.z] as [number, number]].sort(
          (a, b) => Math.hypot(a[0] - playerPos.x, a[1] - playerPos.z) - Math.hypot(b[0] - playerPos.x, b[1] - playerPos.z),
        );
        teleport({ x: titik[0][0], z: titik[0][1], rotY: 0 }, 0, titik.slice(1));
      }
      set({ nyangkut: false });
      get().toast('🆘 Kamu dipindahkan ke tempat aman terdekat.');
    },

    setHP: (hpTerbuka, app = null) => set({ hpTerbuka, hpApp: hpTerbuka ? app : null }),
    setTokoBarang: (tokoBarang) => set({ tokoBarang }),
    tutupRapor: () => set({ raporBaru: null }),

    simpanProfil: (p) => {
      const lama = ambilSave(get());
      terapkanData(lama, { ...lama, profil: p });
      // Karakter baru di game baru → putar animasi pembuka dulu (sapaan muncul setelahnya)
      if (!lama.profil && !lama.pembukaSelesai) {
        set({ buatKarakter: false, pembuka: true });
        return;
      }
      set({ buatKarakter: false });
      sfxUpgrade();
      set((s) => ({ konfeti: s.konfeti + 1 }));
      get().toast(`🎉 Halo, ${p.nama}! Selamat datang di Kos Melati.`);
      get().toast('📱 Cek misi harian & profilmu di tombol HP (kanan atas).');
    },

    beliBarangIni: (id) => {
      const lama = ambilSave(get());
      const h = beliBarang(lama, id);
      if (h.ditolak) sfxSalah();
      else {
        terapkanData(lama, h.data);
        sfxKoin();
      }
      h.pesan.forEach((p) => get().toast(p));
    },

    pakaiBarangIni: (id) => {
      const lama = ambilSave(get());
      const h = pakaiBarang(lama, id);
      if (h.ditolak) sfxSalah();
      else {
        terapkanData(lama, h.data);
        sfxPop();
      }
      h.pesan.forEach((p) => get().toast(p));
    },

    tabung: (jumlah, setor) => {
      const lama = ambilSave(get());
      const h = setor ? setorTabungan(lama, jumlah) : tarikTabungan(lama, jumlah);
      if (h.ditolak) sfxSalah();
      else {
        terapkanData(lama, h.data);
        sfxKoin();
      }
      h.pesan.forEach((p) => get().toast(p));
    },

    majuOjol: (jenis) => {
      const o = get().ojol;
      if (!o) return;
      const cfg = FITUR.ojol;
      if (jenis === 'sampai' && o.tahap === 'jemput') {
        set({ ojol: { ...o, tahap: 'antar' } });
        sfxPop();
        getar(15);
        get().toast(`🙋 Penumpang naik! Antar ke ${o.order.antar.nama}`);
        return;
      }
      let total = o.total;
      let selesai = o.selesai;
      let gagal = o.gagal;
      if (jenis === 'sampai') {
        // Cepat sampai (sisa waktu > separuh) → bintang 5 + tip
        const cepat = o.batas - performance.now() > (cfg.waktuPerOrder * 1000) / 2;
        const bayar = o.order.bayar + (cepat ? cfg.tip5Bintang : 0);
        total += bayar;
        selesai++;
        sfxKoin();
        getar(20);
        get().toast(`${cepat ? '⭐⭐⭐⭐⭐' : '⭐⭐⭐⭐'} Order selesai! +${formatRupiah(bayar)}${cepat ? ' (tip ngebut)' : ''}`);
      } else {
        gagal++;
        sfxKecewa();
        get().toast('⌛ Kelamaan, order dibatalkan pelanggan...');
      }
      const ke = o.ke + 1;
      if (ke >= cfg.jumlahOrder) {
        set({ ojol: { ...o, ke, total, selesai, gagal } });
        get().akhiriOjol();
        return;
      }
      const order = buatOrder(TEMPAT_OJOL);
      set({ ojol: { ke, order, tahap: 'jemput', batas: performance.now() + cfg.waktuPerOrder * 1000, total, selesai, gagal } });
      setTimeout(() => get().toast(`📦 Order berikutnya: jemput di ${order.jemput.nama}`), 600);
    },

    akhiriOjol: () => {
      const o = get().ojol;
      set({ ojol: null });
      if (!o) return;
      if (o.selesai + o.gagal === 0) {
        get().toast('📦 Batal narik. Tidak ada order yang diambil.');
        return;
      }
      const lama = ambilSave(get());
      const hasil = selesaiOjol(lama, o.total, o.selesai, true);
      terapkanData(lama, hasil.data);
      catatTunda(hasil, 'narikOjol', lama.lokasi);
      sfxSelesaiKerja();
      if (hasil.transisi) mulaiTransisi(hasil.transisi);
      hasil.pesan.forEach((p) => get().toast(p));
      cobaEvent(lama, hasil);
    },

    terapkanOnline: (baru, pesan = []) => {
      terapkanData(ambilSave(get()), baru);
      pesan.forEach((p) => get().toast(p));
    },

    cobaEventOnline: () => {
      const st = get();
      if (st.event || st.kerja) return;
      const d = ambilSave(st);
      const ev = pilihEvent(d);
      if (!ev) return;
      const dicatat = catatEvent(d, ev.id);
      set({ eventHari: dicatat.eventHari, eventTerakhir: dicatat.eventTerakhir });
      simpanOnline(ambilSave(get()));
      setTimeout(() => {
        const s2 = get();
        if (s2.layarUtama || s2.event || s2.terkunci) return;
        set({ event: ev });
        sfxNotifHP();
      }, TRANSISI_MS + 150);
    },

    lakukan: (aksi) => {
      if (get().transisi) return; // tunggu transisi selesai
      if (tungguTeman(aksi)) return;
      const lama = ambilSave(get());
      const def = AKSI[aksi];

      if (def.jenis === 'kendaraan') {
        aksiKendaraan(aksi);
        return;
      }
      // M11: masuk / keluar gedung (interior)
      if (aksi === 'masukGedung' || aksi === 'keluarGedung') {
        const b = BANGUNAN.find((x) => x.id === (aksi === 'masukGedung' ? get().dekat : lama.gedung));
        if (!b) return;
        if (aksi === 'masukGedung' && get().naikMotor) {
          sfxSalah();
          get().toast('🛵 Parkir motormu dulu sebelum masuk!');
          return;
        }
        const keluar = aksi === 'keluarGedung';
        const [dx, dz] = titikDepan(b, 1.3);
        set({ spawnBerikut: keluar ? { x: dx, z: dz, rotY: Math.atan2(dx - b.x, dz - b.z) } : null });
        const baru: SaveData = { ...lama, lokasi: keluar ? 'dunia' : 'gedung', gedung: keluar ? null : b.id };
        terapkanData(lama, baru);
        sfxPintu();
        const nama = b.jenis === 'rumah' ? `rumah ${WARGA.find((w) => w.id === PENGHUNI_RUMAH[b.id])?.nama ?? 'warga'}` : b.nama;
        mulaiTransisi(keluar ? '🚶 Keluar...' : `🚪 Masuk ${nama}...`);
        if (!keluar && b.jenis === 'rumah') get().toast(`🏡 "Eh, ada tamu! Silakan masuk, anggap rumah sendiri."`);
        return;
      }
      if (def.jenis === 'angkot' && get().naikMotor) {
        sfxSalah();
        get().toast('🛵 Parkir motormu dulu sebelum naik angkot!');
        return;
      }

      // Aksi "menu" (warteg/warkop) hanya membuka panel pilihan makanan
      if (def.jenis === 'menu') {
        const cek = cekAksi(lama, aksi);
        if (!cek.boleh || !def.tempat) {
          sfxSalah();
          get().toast(cek.alasan ?? 'Belum bisa sekarang');
          return;
        }
        sfxPop();
        set({ menuMakan: def.tempat });
        return;
      }

      // Toko barang (payung, vitamin, obat, kopi sachet) / bengkel motor
      if (def.jenis === 'barang') {
        const cek = cekAksi(lama, aksi);
        if (!cek.boleh) {
          sfxSalah();
          get().toast(cek.alasan ?? 'Belum bisa');
          return;
        }
        sfxPop();
        if (def.toko === 'bengkel') set({ bengkel: true });
        else if (isPanelTempat(def.toko)) set({ panelTempat: def.toko });
        else set({ tokoBarang: true });
        return;
      }
      // Minggu ujian: kuliah = kerjakan soal ujian dulu (mini-game), baru nilainya dihitung
      // M12: aksi instan yang memakai fungsi fitur (galon, cabai)
      const fiturAksi = aksi === 'minum' ? minumAir : aksi === 'siramCabai' ? siramCabai : aksi === 'panenCabai' ? panenCabai : null;
      if (fiturAksi) {
        if (aksi === 'minum' || aksi === 'siramCabai') sfxTuangKopi(); // gemericik air
        get().fitur(fiturAksi, aksi === 'panenCabai' ? 'upgrade' : 'pop');
        return;
      }
      // M12: beberapa aksi diawali mini-game fisika (bisa dilewati)
      const mini = MINI_UNTUK[aksi];
      if (mini && !lewatiMini && !get().sibuk && cekAksi(lama, aksi).boleh) {
        sfxPop();
        set({ miniFisika: { jenis: mini, aksi } });
        return;
      }
      if (aksi === 'kuliah' && !lewatiKuis && ujianAktif(lama) && cekAksi(lama, aksi).boleh) {
        sfxNotifHP();
        set({ kuisUjian: ambilSoal() });
        return;
      }
      // Narik ojol: harus naik motor, lalu antar 3 order di dunia
      if (def.jenis === 'ojol') {
        const cek = cekAksi(lama, aksi);
        if (!cek.boleh || !get().naikMotor || get().ojol) {
          sfxSalah();
          get().toast(!cek.boleh ? (cek.alasan ?? 'Belum bisa') : get().ojol ? '📦 Selesaikan order yang sekarang dulu.' : '🛵 Naik motor dulu untuk narik ojol!');
          return;
        }
        sfxMesin();
        const order = buatOrder(TEMPAT_OJOL);
        set({ ojol: { ke: 0, order, tahap: 'jemput', batas: performance.now() + FITUR.ojol.waktuPerOrder * 1000, total: 0, selesai: 0, gagal: 0 } });
        get().toast(`📦 Order masuk! Jemput di ${order.jemput.nama}. Ikuti panah 🧭`);
        return;
      }

      // Kerja sambilan → buka mini-game; Upgrade → buka panel toko perabot
      if (def.jenis === 'kerja' || def.jenis === 'toko') {
        const cek = cekAksi(lama, aksi);
        if (!cek.boleh || (def.jenis === 'kerja' && !def.kerja)) {
          sfxSalah();
          get().toast(cek.alasan ?? 'Belum bisa sekarang');
          return;
        }
        sfxPop();
        if (def.jenis === 'kerja') set({ kerja: def.kerja ?? null });
        else set({ menuUpgrade: true });
        return;
      }

      // Angkot: hitung halte tujuan sebelum menjalankan aksi
      const tujuan = def.jenis === 'angkot' ? tujuanAngkot(get().dekat ?? '') : null;
      if (def.jenis === 'angkot' && !tujuan) {
        sfxSalah();
        get().toast('🚏 Cari halte angkot dulu.');
        return;
      }

      const hasil = jalankanAksi(lama, aksi, true);
      if (hasil.ditolak) {
        sfxSalah();
      } else {
        terapkanData(lama, hasil.data);
        catatTunda(hasil, aksi, lama.lokasi);
        sfxAksi(aksi);
        if (tujuan) {
          teleport(tujuan, GANTI_SCENE_MS);
          hasil.pesan.push(`🚏 Turun di ${tujuan.nama}`);
        }
      }
      if (hasil.transisi) mulaiTransisi(hasil.transisi);
      hasil.pesan.forEach((p) => get().toast(p));
      cobaEvent(lama, hasil);
    },

    beli: (tempat, itemId) => {
      const lama = ambilSave(get());
      const hasil = beliMakanan(lama, tempat, itemId, true);
      if (hasil.ditolak) {
        sfxSalah();
      } else {
        terapkanData(lama, hasil.data);
        catatTunda(hasil, null, lama.lokasi);
        sfxKoin();
        if (tempat === 'warkop') sfxTuangKopi();
        else sfxWajan();
        set({ menuMakan: null });
      }
      if (hasil.transisi) mulaiTransisi(hasil.transisi);
      hasil.pesan.forEach((p) => get().toast(p));
    },

    akhiriKerja: (h) => {
      const tempat = get().kerja;
      set({ kerja: null });
      if (!tempat || !h) return; // batal sebelum mulai → tidak ada efek
      const lama = ambilSave(get());
      const hasil = selesaiKerja(lama, tempat, h, true);
      if (hasil.ditolak) sfxSalah();
      else {
        terapkanData(lama, hasil.data);
        catatTunda(hasil, null, lama.lokasi, `${KERJA[tempat].ikon} Kerja di ${KERJA[tempat].nama}`);
        sfxSelesaiKerja();
        if (h.gagal === 0 && h.benar > 0) set((s) => ({ konfeti: s.konfeti + 1 })); // shift sempurna!
      }
      if (hasil.transisi) mulaiTransisi(hasil.transisi);
      hasil.pesan.forEach((p) => get().toast(p));
      cobaEvent(lama, hasil);
    },

    pilihEventIni: (i) => {
      const ev = get().event;
      const p = ev?.pilihan[i];
      if (!ev || !p) return;
      const lama = ambilSave(get());
      const hasil = jalankanPilihan(lama, p, true);
      if (hasil.ditolak) {
        sfxSalah();
      } else {
        set({ event: null });
        // Cerita utama: pasang flag/relasi & antrekan dialog lanjutan
        if (p.cerita) {
          const jc = jawabCerita(hasil.data, p.cerita);
          hasil.data = jc.data;
          hasil.pesan.push(...jc.pesan);
        }
        terapkanData(lama, hasil.data);
        catatTunda(hasil, null, lama.lokasi);
        if ((hasil.data.uang ?? 0) > lama.uang) {
          sfxKoin();
          set((s) => ({ konfeti: s.konfeti + 1 }));
        } else sfxPop();
      }
      if (hasil.transisi) mulaiTransisi(hasil.transisi);
      hasil.pesan.forEach((t) => get().toast(t));
    },

    mulaiMain: (baru) => {
      if (baru) get().reset();
      set({ layarUtama: false });
      sfxPop();
      const { toast } = get();
      // Belum punya karakter (main baru / save lama sebelum M7) → buat karakter dulu
      if (!get().profil) {
        set({ buatKarakter: true });
        return;
      }
      // Pembuka sempat terputus (app ditutup saat menonton) → anggap sudah ditonton, jangan diulang paksa
      if (!get().pembukaSelesai) {
        const lama = ambilSave(get());
        terapkanData(lama, { ...lama, pembukaSelesai: true });
      }
      if (baru || PEMAIN_BARU) {
        toast('🏠 Selamat datang di kos baru! Uang kos bulan ini sudah dibayar.');
        toast('👉 Dekati benda yang ada panahnya. Lewat pintu untuk keluar ke kampung!');
      } else {
        toast('💾 Progres dimuat. Selamat datang kembali!');
      }
    },

    setGrafik: (grafik) => {
      simpanGrafik(grafik);
      set({ grafik });
    },

    upgrade: (id) => {
      const lama = ambilSave(get());
      const hasil = beliUpgrade(lama, id);
      if (hasil.ditolak) sfxSalah();
      else {
        terapkanData(lama, hasil.data);
        if (get().online) kirimUpgradeKamar(hasil.data.level); // teman sekamar ikut menikmati
        sfxKoin();
        sfxUpgrade();
        // Tutup panel agar pemain langsung melihat perabot barunya "pop" di kamar
        set((s) => ({ menuUpgrade: false, konfeti: s.konfeti + 1 }));
      }
      hasil.pesan.forEach((p) => get().toast(p));
    },

    reset: () => {
      hapusSave();
      const d = dataAwal();
      set({
        ...d,
        menuTerbuka: false,
        menuMakan: null,
        petaTerbuka: false,
        kerja: null,
        menuUpgrade: false,
        event: null,
        dekat: null,
        naikMotor: false,
        motorParkir: { ...PARKIR_MOTOR },
        ojol: null,
        hpTerbuka: false,
        tokoBarang: false,
        raporBaru: null,
      });
      simpan(d);
      get().toast('🔄 Data direset. Selamat datang lagi di kos!');
    },
  };
});

// Akses debug untuk uji otomatis — HANYA saat `npm run dev`, tidak ikut ke build produksi/APK.
if (import.meta.env.DEV) {
  (window as unknown as { __game: typeof useGame; __pos: typeof playerPos }).__game = useGame;
  (window as unknown as { __pos: typeof playerPos }).__pos = playerPos;
}

/** Simpan sekarang (dipanggil saat app ke background). */
export const simpanSekarang = () => {
  const st = useGame.getState();
  if (st.online) simpanOnline(ambilSave(st), true);
  else simpan(ambilSave(st));
};
