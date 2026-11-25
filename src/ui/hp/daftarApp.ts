// Registry aplikasi HP: nama/ikon/warna/sub-tab dibaca dari src/data/aplikasi-hp.json (aturan §6: data di JSON).
// File ini hanya memberi tipe & fungsi bantu (tanpa komponen) supaya bisa dipakai HUD, notifikasi, dan HPMenu.
import data from '../../data/aplikasi-hp.json';

export type TabApp = { id: string; ikon: string; nama: string; online?: boolean };
export type AppDef = { id: string; ikon: string; nama: string; judul: string; warna: string; tab: TabApp[] };

export const DAFTAR_APP: AppDef[] = data.aplikasi;
export const ALASAN_ONLINE: Record<string, string> = data.alasanOnline;

export const cariApp = (id: string | null | undefined): AppDef | undefined => DAFTAR_APP.find((a) => a.id === id);

/** Tebak aplikasi sumber notifikasi dari emoji di depan teks (agar toast lama tidak perlu diubah satu per satu). */
export function appDariTeks(teks: string, app?: string): AppDef | undefined {
  if (app) return cariApp(app);
  const awal = teks.trimStart();
  const cocok = data.notifSumber.find((n) => n.awalan.some((a) => awal.startsWith(a)));
  return cocok ? cariApp(cocok.app) : undefined;
}

/** Kalimat lucu saat baterai (energi) hampir habis — diacak (≥ 3 variasi, skill indonesian-humor-writing). */
export const NOTIF_BATERAI: string[] = data.notifBaterai;
