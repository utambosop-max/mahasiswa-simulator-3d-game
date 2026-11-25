// Cerita utama "Buku Sakti Ibu": bentuk data yang DISIMPAN di save + nilai awal & migrasi save lama.
// Sengaja tidak mengimpor apa pun dari sim.ts (sim.ts memanggil file ini) agar tidak ada import melingkar.

/** Status satu bab: aktif (sedang dikerjakan), selesai, rencanaB (tenggat lewat, tanpa hukuman), lewat (dilompati karena sudah lulus). */
export type StatusBab = 'aktif' | 'selesai' | 'rencanaB' | 'lewat';

export type ProgresBab = {
  s: StatusBab;
  /** Hari bab dimulai */
  mulai: number;
  /** Nilai statistik saat bab dimulai (tujuan dihitung dari selisihnya) */
  dasar: Record<string, number>;
  /** Id tujuan yang sudah tercapai (tetap tercapai walau keadaan berubah lagi) */
  tujuan: string[];
  /** Hari bab ditutup */
  akhir?: number;
};

/** Misi sukarela "nabung bantu warung Ibu" (keputusan CEO 2026-11-23: kiriman TIDAK dipotong). */
export type MisiNabung = {
  target: number;
  terkumpul: number;
  mulai: number;
  batas: number; // hari terakhir
  status: 'aktif' | 'terkirim' | 'batal' | 'lewat';
};

export type DataCeritaSave = {
  v: 1;
  bab: Record<string, ProgresBab>;
  /** Flag cerita → hari saat flag dipasang */
  flag: Record<string, number>;
  /** Adegan sekali-tampil yang sudah dipicu */
  adegan: string[];
  /** Dialog yang menunggu ditampilkan (disimpan agar tidak hilang saat game ditutup) */
  antrean: string[];
  nabung: MisiNabung | null;
  ending: string | null;
};

export type DataCerita = { cerita: DataCeritaSave };

export function bawaanCerita(): DataCerita {
  return { cerita: { v: 1, bab: {}, flag: {}, adegan: [], antrean: [], nabung: null, ending: null } };
}

/** Migrasi: save lama tanpa `cerita` / data rusak → nilai awal (aman). */
export function lengkapiCerita(x: Partial<DataCerita>): DataCerita {
  const b = bawaanCerita().cerita;
  const c = x.cerita as Partial<DataCeritaSave> | undefined;
  if (!c || typeof c !== 'object') return { cerita: b };
  const obj = <T extends object>(v: unknown, def: T): T => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as T) : def);
  const arrStr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);
  const n = c.nabung;
  const nabungOk = !!n && typeof n === 'object' && typeof n.target === 'number' && typeof n.terkumpul === 'number' && typeof n.batas === 'number';
  // Bab: buang entri rusak
  const bab: Record<string, ProgresBab> = {};
  for (const [id, p] of Object.entries(obj(c.bab, {} as Record<string, ProgresBab>))) {
    if (p && typeof p === 'object' && typeof p.s === 'string' && typeof p.mulai === 'number') {
      bab[id] = { s: p.s, mulai: p.mulai, dasar: obj(p.dasar, {}), tujuan: arrStr(p.tujuan), ...(typeof p.akhir === 'number' ? { akhir: p.akhir } : {}) };
    }
  }
  return {
    cerita: {
      v: 1,
      bab,
      flag: obj(c.flag, {}),
      adegan: arrStr(c.adegan),
      antrean: arrStr(c.antrean).slice(0, 20),
      nabung: nabungOk ? (n as MisiNabung) : null,
      ending: typeof c.ending === 'string' ? c.ending : null,
    },
  };
}
