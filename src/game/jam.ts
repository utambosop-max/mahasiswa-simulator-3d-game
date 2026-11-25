// Jam real-time mode offline: 1 detik nyata = 1 menit game (lihat balance.json → jam).
// - Berhenti saat menu/dialog terbuka, saat di layar judul, dan saat aplikasi di-background.
// - Saat pemain sibuk (beraksi/tidur) jam dipercepat agar tidak perlu menunggu lama.
// - Mode online TIDAK memakai ticker ini: jam datang dari server (pesan 'jam').
import { useGame, uiTerbuka } from './store';
import { JAM, menitMutlak } from './sim';

const TICK_MS = 250;
let sisaPecahan = 0; // pecahan menit yang belum diterapkan
let terakhir = 0;
let timer: number | null = null;

/** Laju jam sekarang (menit game per detik nyata). */
export function lajuSekarang(): number {
  const sb = useGame.getState().sibuk;
  if (!sb) return JAM.menitPerDetik;
  return sb.jenis === 'aksi' ? JAM.lajuSibuk : JAM.lajuTidur;
}

function tick() {
  const now = performance.now();
  const dt = Math.min(1, (now - terakhir) / 1000); // maks 1 detik per tick (setelah tab tidur, tidak loncat jauh)
  terakhir = now;
  const st = useGame.getState();
  // Waktu berhenti: layar judul, online (jam dari server), aplikasi di belakang, atau menu/dialog terbuka
  if (st.layarUtama || st.online || document.hidden) return;
  if (uiTerbuka({ ...st, terkunci: false })) return;

  sisaPecahan += dt * lajuSekarang();
  let n = Math.floor(sisaPecahan);
  if (n <= 0) return;
  sisaPecahan -= n;
  // Jangan melewati waktu selesai sibuk (supaya "Selesai jam 09.00" tepat)
  if (st.sibuk) n = Math.min(n, Math.max(1, st.sibuk.sampai - menitMutlak(st)));
  st.majukanJam(n);
}

/** Mulai ticker (dipanggil sekali dari App). Mengembalikan fungsi berhenti. */
export function mulaiJam(): () => void {
  if (timer !== null) return () => {};
  terakhir = performance.now();
  timer = window.setInterval(tick, TICK_MS);
  return () => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  };
}
