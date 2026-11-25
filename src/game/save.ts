// Auto-save ke localStorage. Semua akses dibungkus try/catch (aturan proyek).
import { LOKASI, PERABOT, URUTAN_FASE, lengkapiSave, type Fase, type Lokasi, type SaveData } from './sim';

const KEY = 'mahasiswa-sim-save-v1';

function valid(d: unknown): d is SaveData {
  if (typeof d !== 'object' || d === null) return false;
  const x = d as Record<string, unknown>;
  const angka = ['uang', 'ipk', 'energi', 'stres', 'hari', 'tanggal', 'bulan', 'streakMi'].every(
    (k) => typeof x[k] === 'number' && Number.isFinite(x[k]),
  );
  const fase = typeof x.fase === 'string' && URUTAN_FASE.includes(x.fase as Fase);
  const hadir = typeof x.hadir === 'object' && x.hadir !== null;
  const lv = x.level as Record<string, unknown> | undefined;
  const level = typeof lv === 'object' && lv !== null && PERABOT.every((p) => [1, 2, 3].includes(lv[p] as number));
  return x.versi === 1 && angka && fase && hadir && level;
}

/** Muat save. Mengembalikan null jika tidak ada atau rusak. */
export function muat(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d: unknown = JSON.parse(raw);
    if (!valid(d)) return null;
    // Save lama (Milestone 2) belum punya `lokasi`
    const lokasi: Lokasi = LOKASI.includes(d.lokasi) ? d.lokasi : 'kamar';
    // Save Milestone 3 belum punya `porsiFase`
    const porsiFase = typeof d.porsiFase === 'number' && Number.isFinite(d.porsiFase) ? d.porsiFase : 0;
    // Save Milestone 4 belum punya data event & kos (kos lama dianggap sudah dibayar)
    const kosLunas = typeof d.kosLunas === 'boolean' ? d.kosLunas : true;
    const hariBelajar = typeof d.hariBelajar === 'number' && Number.isFinite(d.hariBelajar) ? d.hariBelajar : 0;
    const kuliahLibur = typeof d.kuliahLibur === 'boolean' ? d.kuliahLibur : false;
    const eh = d.eventHari as unknown;
    const eventHari =
      typeof eh === 'object' && eh !== null && typeof (eh as SaveData['eventHari']).hari === 'number'
        ? (eh as SaveData['eventHari'])
        : { hari: 0, jumlah: 0 };
    const kamarBerdua = typeof d.kamarBerdua === 'boolean' ? d.kamarBerdua : false;
    // Save sebelum M7 belum punya profil, misi, pencapaian, dll → dilengkapi nilai awal
    return lengkapiSave({ ...d, lokasi, porsiFase, kosLunas, hariBelajar, kuliahLibur, eventHari, kamarBerdua });
  } catch {
    return null;
  }
}

/** Periksa & lengkapi save dari sumber luar (mis. server online). Null jika rusak. */
export function rapikanSave(d: unknown): SaveData | null {
  if (!valid(d)) return null;
  return lengkapiSave({
    ...d,
    lokasi: LOKASI.includes(d.lokasi) ? d.lokasi : 'kamar',
    porsiFase: Number.isFinite(d.porsiFase) ? d.porsiFase : 0,
    kosLunas: typeof d.kosLunas === 'boolean' ? d.kosLunas : true,
    hariBelajar: Number.isFinite(d.hariBelajar) ? d.hariBelajar : 0,
    kuliahLibur: !!d.kuliahLibur,
    eventHari: d.eventHari && typeof d.eventHari.hari === 'number' ? d.eventHari : { hari: 0, jumlah: 0 },
    kamarBerdua: !!d.kamarBerdua,
  });
}

export function simpan(d: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // Penyimpanan penuh/diblokir → game tetap jalan tanpa save
  }
}

export function hapusSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // abaikan
  }
}
