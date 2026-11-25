// State kecil khusus tampilan HP (tidak disimpan ke save game):
//  • berapa halaman Buku Sakti yang sudah dilihat (badge "Baru") — localStorage, dibungkus try/catch
//  • daftar notifikasi terbuka di dalam HP
//  • konfirmasi keluar game (tombol Kembali fisik Android)
import { create } from 'zustand';

const KUNCI_BUKU = 'mhs-buku-dilihat';

function bacaBuku(): number {
  try {
    return Number(localStorage.getItem(KUNCI_BUKU) ?? 0) || 0;
  } catch {
    return 0;
  }
}

type UiHP = {
  bukuDilihat: number;
  tandaiBuku: (jumlahHalaman: number) => void;
  riwayatTerbuka: boolean;
  setRiwayat: (v: boolean) => void;
  konfirmasiKeluar: boolean;
  setKonfirmasiKeluar: (v: boolean) => void;
};

export const useUiHP = create<UiHP>((set) => ({
  bukuDilihat: bacaBuku(),
  tandaiBuku: (n) => {
    try {
      localStorage.setItem(KUNCI_BUKU, String(n));
    } catch {
      /* abaikan: badge muncul lagi setelah reload, tidak fatal */
    }
    set({ bukuDilihat: n });
  },
  riwayatTerbuka: false,
  setRiwayat: (riwayatTerbuka) => set({ riwayatTerbuka }),
  konfirmasiKeluar: false,
  setKonfirmasiKeluar: (konfirmasiKeluar) => set({ konfirmasiKeluar }),
}));
