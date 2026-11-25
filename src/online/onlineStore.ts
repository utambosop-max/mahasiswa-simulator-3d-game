// Status mode online (terpisah dari store game agar mode offline tidak terganggu).
import { create } from 'zustand';
import type { TempatKerja } from '../game/sim';
import type { InfoKamar, InfoPemain, KeadaanKerjaBareng } from './protokol';

export type StatusOnline = 'mati' | 'menyambung' | 'lobi' | 'main' | 'putus';

type OnlineState = {
  /** Layar sambung online sedang dibuka (dari layar judul) */
  layarOnline: boolean;
  status: StatusOnline;
  galat: string | null;
  alamat: string;
  nama: string;
  warna: string;
  /** Kode rahasia server (diberi pemilik server) */
  kode: string;
  /** Identitas acak HP ini — server memakainya agar namamu tidak bisa dipakai orang lain */
  token: string;
  lobi: { dikenal: boolean; kamarTersedia: { kamarId: string; penghuni: string }[] } | null;
  saya: string | null;
  pemain: InfoPemain[];
  /** Jam bersama dari server (menit mutlak, lihat menitMutlak di sim.ts) */
  menit: number;
  /** Laju jam bersama (menit game per detik nyata); > 1 berarti dipercepat */
  laju: number;
  kamar: InfoKamar | null;
  gelembung: Record<string, { teks: string; id: number }>;
  chatTerbuka: boolean;
  kerjaLobi: { tempat: TempatKerja; ids: string[] } | null;
  kerjaBareng: KeadaanKerjaBareng | null;
  /** Waktu (performance.now) state kerja terakhir diterima → batang kesabaran dihitung mundur dari sini */
  kerjaDiterima: number;
  kerjaHasil: { tempat: TempatKerja; benar: number; gagal: number; tips: number } | null;
  /** Ajakan pacaran dari teman yang menunggu jawaban */
  ajakan: { dari: string; nama: string } | null;
  /** Sambung ulang otomatis dijadwalkan pada waktu ini (Date.now); null = tidak ada (tunggu tombol) */
  ulangDalam: number | null;
};

export const KEY_ONLINE = 'mahasiswa-sim-online';

/** Ingat nama, warna & alamat server terakhir (localStorage dibungkus try/catch). */
function bacaIngatan(): { nama: string; warna: string; alamat: string; kode: string; token: string } {
  const bawaan = { nama: '', warna: '', alamat: '', kode: '', token: '' };
  try {
    const raw = localStorage.getItem(KEY_ONLINE);
    if (!raw) return bawaan;
    const d = JSON.parse(raw) as Partial<typeof bawaan>;
    return {
      nama: typeof d.nama === 'string' ? d.nama : '',
      warna: typeof d.warna === 'string' ? d.warna : '',
      alamat: typeof d.alamat === 'string' ? d.alamat : '',
      kode: typeof d.kode === 'string' ? d.kode : '',
      token: typeof d.token === 'string' && d.token.length >= 16 ? d.token : '',
    };
  } catch {
    return bawaan;
  }
}

export function simpanIngatan(nama: string, warna: string, alamat: string, kode: string, token: string) {
  try {
    localStorage.setItem(KEY_ONLINE, JSON.stringify({ nama, warna, alamat, kode, token }));
  } catch {
    // abaikan
  }
}

/** Alamat server bawaan: jika game dibuka dari server itu sendiri (http://IP:8787) → pakai alamat itu. */
function alamatBawaan(): string {
  const { protocol, host, hostname, port } = window.location;
  if (protocol === 'http:' && port === '8787') return host;
  if (protocol === 'http:' && port === '5173') return `${hostname}:8787`; // saat npm run dev
  // Dibuka dari link online (mis. https://abc.trycloudflare.com) → server = alamat itu sendiri
  if (protocol === 'https:' && hostname !== 'localhost') return host;
  return '';
}

const ingat = bacaIngatan();
/** Token acak dibuat sekali per HP (disimpan di localStorage) */
const tokenHP = ingat.token || buatToken();
function buatToken(): string {
  try {
    return crypto.randomUUID().replace(/-/g, '');
  } catch {
    // randomUUID butuh halaman https; getRandomValues tetap ada di http (WiFi rumah)
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  }
}

export const useOnline = create<OnlineState>()(() => ({
  layarOnline: false,
  status: 'mati',
  galat: null,
  alamat: alamatBawaan() || ingat.alamat,
  nama: ingat.nama,
  warna: ingat.warna,
  kode: ingat.kode,
  token: tokenHP,
  lobi: null,
  saya: null,
  pemain: [],
  menit: 0,
  laju: 1,
  kamar: null,
  gelembung: {},
  chatTerbuka: false,
  kerjaLobi: null,
  kerjaBareng: null,
  kerjaDiterima: 0,
  kerjaHasil: null,
  ajakan: null,
  ulangDalam: null,
}));

export const namaPemain = (id: string) => useOnline.getState().pemain.find((p) => p.id === id)?.nama ?? id;
