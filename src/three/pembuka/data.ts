// Tipe & pembaca data animasi pembuka (src/data/pembuka.json).
import { Color } from 'three';
import json from '../../data/pembuka.json';

export type V2 = [number, number];
export type V3 = [number, number, number];
export type Lokasi = 'kampung' | 'jalan' | 'kota' | 'kamar';
export type Kurva = 'linier' | 'halus' | 'masuk' | 'keluar';
export type Gestur = 'ikat' | 'serah' | 'ambles' | 'tidur' | 'angkat' | 'duduk' | 'lihatHP';
export type Bawaan = 'kardus' | 'rantang' | 'buku' | 'hp' | 'gelas' | 'kunci';
export type JenisTeks = 'subtitle' | 'dialog' | 'gelembung' | 'wa' | 'besar' | 'saldo' | 'judul';
export type Musik = 'b1' | 'b2' | 'b3' | 'gantung' | 'diam';

export type AksiTokoh = {
  id: string;
  dari: V2;
  ke?: V2;
  /** Jendela waktu bergerak (pecahan durasi shot) */
  jalan?: V2;
  y?: number;
  hadap: number;
  lambai?: V2;
  gestur?: Gestur;
  gesturWaktu?: V2;
  bawa?: Bawaan;
  /** Muncul mulai pecahan ini (sebelumnya disembunyikan) */
  muncul?: number;
  naik?: 'motor';
};
export type Kendaraan = { id: 'bus' | 'angkot'; dari: V2; ke: V2; waktu: V2; kurva: Kurva; hadap: number };
export type Teks = { t: number; jenis: JenisTeks; tokoh?: string; isi: string; pos?: V2 };
export type Shot = {
  id: string;
  lokasi: Lokasi;
  durasi: number;
  musik: Musik;
  mesin?: boolean;
  kamera: { pos: [V3, V3]; target: [V3, V3]; kurva: Kurva; ikut?: string };
  langit: string[];
  cahaya: number[];
  efek?: string[];
  tokoh: AksiTokoh[];
  props?: { id: string; pos: V3 }[];
  kendaraan?: Kendaraan[];
  teks: Teks[];
  audio: { t: number; cue: string }[];
};
export type Penampilan = {
  nama: string;
  warnaNama: string;
  kulit?: string;
  baju?: string;
  rambut?: string;
  gaya?: string;
  celana?: string;
  aksesoris?: string[];
};

export const PENAMPILAN = json.penampilan as Record<string, Penampilan>;
export const SHOT = json.shot as unknown as Shot[];

/** Waktu mulai tiap shot (detik) & total durasi. */
export const MULAI: number[] = [];
let akum = 0;
for (const s of SHOT) {
  MULAI.push(akum);
  akum += s.durasi;
}
export const TOTAL = akum;

/** Warna langit tiap shot diurai sekali di sini (agar useFrame tidak membuat objek baru). */
export const WARNA_LANGIT: Color[][] = SHOT.map((s) => s.langit.map((w) => new Color(w)));

export function kurva(k: Kurva, u: number): number {
  const x = Math.min(1, Math.max(0, u));
  if (k === 'halus') return x * x * (3 - 2 * x);
  if (k === 'masuk') return x * x;
  if (k === 'keluar') return 1 - (1 - x) * (1 - x);
  return x;
}

/** Ganti {nama} & {uang} di teks. */
export function isiTeks(t: string, nama: string, uang: string): string {
  return t.split('{nama}').join(nama).split('{uang}').join(uang);
}
