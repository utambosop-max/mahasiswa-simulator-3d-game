// Tombol Kembali fisik Android (plugin resmi @capacitor/app, disetujui pemilik proyek 2026-11-23).
// Urutan: tutup lapisan teratas dulu → dialog → aplikasi HP → HP → panel. Jika tidak ada yang terbuka:
// tampilkan konfirmasi "Yakin keluar? Progres sudah tersimpan."
// Di web (browser PC/HP) Capacitor.isNativePlatform() = false → listener TIDAK dipasang sama sekali.
import { Capacitor } from '@capacitor/core';
import { useGame } from '../game/store';
import { useOnline } from '../online/onlineStore';
import { useUiHP } from './hp/uiHP';

/** Kirim tombol Esc tiruan: panel kit (Panel), peta, mini-game sudah menangani Esc sendiri. */
const kirimEsc = () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));

/** Satu langkah "kembali". Dipisah dari listener supaya bisa dites di browser (window.__kembali). */
export function langkahKembali() {
  const ui = useUiHP.getState();
  const st = useGame.getState();
  const on = useOnline.getState();

  // 1) Dialog paling atas
  if (ui.konfirmasiKeluar) return ui.setKonfirmasiKeluar(false);
  if (st.event) return st.toast('💬 Balas dulu pesannya, baru boleh kabur 😅');
  // 2–3) Aplikasi → layar utama HP → tutup HP
  if (st.hpTerbuka) {
    if (ui.riwayatTerbuka) return ui.setRiwayat(false);
    if (st.hpApp) return useGame.setState({ hpApp: null });
    return st.setHP(false);
  }
  // 4) Panel & layar lain
  if (on.chatTerbuka) return useOnline.setState({ chatTerbuka: false });
  if (on.layarOnline) return useOnline.setState({ layarOnline: false });
  if (st.modeFoto) return useGame.setState({ modeFoto: false });
  if (st.petaTerbuka) return st.setPeta(false);
  if (st.menuMakan || st.menuUpgrade || st.tokoBarang || st.bengkel || st.panelTempat) {
    kirimEsc();
    // Cadangan: panel yang tidak memakai kit Panel (tanpa penangan Esc) ditutup langsung
    queueMicrotask(() => useGame.setState({ menuMakan: null, menuUpgrade: false, tokoBarang: false, bengkel: false, panelTempat: null }));
    return;
  }
  // Mini-game, kuis, rapor, wisuda, pembuat karakter, pembuka: biarkan komponen itu memutuskan (Esc), jangan paksa tutup
  if (st.kerja || st.miniFisika || st.kuisUjian || st.raporBaru || st.wisuda || st.buatKarakter || st.pembuka || st.transisi) return kirimEsc();
  // 5) Tidak ada yang terbuka → konfirmasi keluar
  ui.setKonfirmasiKeluar(true);
}

/** Keluar dari aplikasi (dipanggil tombol "Keluar" di konfirmasi). Progres disimpan dulu. */
export async function keluarAplikasi() {
  if (!Capacitor.isNativePlatform()) return;
  const { App } = await import('@capacitor/app');
  await App.exitApp();
}

/** Pasang listener sekali di awal aplikasi. Mengembalikan fungsi pelepas. */
export function pasangTombolKembali(): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  let lepas: (() => void) | null = null;
  let batal = false;
  // Impor dinamis: kode plugin hanya dimuat di APK
  import('@capacitor/app')
    .then(({ App }) => App.addListener('backButton', () => langkahKembali()))
    .then((h) => {
      if (batal) void h.remove();
      else lepas = () => void h.remove();
    })
    .catch(() => {
      /* plugin tidak tersedia → tombol Kembali memakai perilaku bawaan Android */
    });
  return () => {
    batal = true;
    lepas?.();
  };
}
