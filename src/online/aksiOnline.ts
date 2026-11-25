// Fungsi kecil yang dipanggil store game saat mode online (tidak mengimpor store game).
import type { AksiId, JenisSibuk, Level, Lokasi, PerabotId, SaveData } from '../game/sim';
import { kirim } from './net';
import { kunciTempat } from './protokol';
import { useOnline } from './onlineStore';

/** Beri tahu server bahwa saya sibuk sampai menit mutlak `sampai` (server mempercepat jam jika semua pemain sibuk). */
export function mulaiSibuk(sampai: number, jenis: JenisSibuk, aksi: AksiId | null, lokasi: Lokasi) {
  const o = useOnline.getState();
  const tempat = aksi ? kunciTempat(aksi, lokasi, o.kamar?.kamarId ?? '') : null;
  kirim({ t: 'siap', sampai, jenis, aksi, tempat });
}
let timerSimpan: number | null = null;
let saveTerakhir: SaveData | null = null;

/** Kirim save ke server (ditunda 800 ms agar tidak terlalu sering). */
export function simpanOnline(d: SaveData, segera = false) {
  saveTerakhir = d;
  if (segera) {
    if (timerSimpan) clearTimeout(timerSimpan);
    timerSimpan = null;
    kirim({ t: 'simpan', save: d });
    return;
  }
  if (timerSimpan) return;
  timerSimpan = window.setTimeout(() => {
    timerSimpan = null;
    if (saveTerakhir) kirim({ t: 'simpan', save: saveTerakhir });
  }, 800);
}

export function kirimUpgradeKamar(level: Record<PerabotId, Level>) {
  const o = useOnline.getState();
  kirim({ t: 'upgradeKamar', level, oleh: o.nama });
}
