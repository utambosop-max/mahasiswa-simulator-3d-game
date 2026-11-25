// Tampilan saat pemain sedang sibuk (beraksi / tidur / pulang kampung).
// Jam terus berjalan (dipercepat). Dipakai mode offline & online.
import { useGame } from '../game/store';
import { menitMutlak, teksJam } from '../game/sim';
import { lajuSekarang } from '../game/jam';
import { useOnline } from '../online/onlineStore';

export function OverlaySibuk() {
  const sibuk = useGame((s) => s.sibuk);
  const hari = useGame((s) => s.hari);
  const menit = useGame((s) => s.menit);
  const online = useGame((s) => s.online);
  const lajuOnline = useOnline((s) => s.laju);
  const pemain = useOnline((s) => s.pemain);
  const saya = useOnline((s) => s.saya);
  if (!sibuk) return null;

  const kini = menitMutlak({ hari, menit });
  const total = Math.max(1, sibuk.sampai - sibuk.mulai);
  const persen = Math.min(100, Math.max(0, ((kini - sibuk.mulai) / total) * 100));
  const selesai = teksJam(((sibuk.sampai % 1440) + 1440) % 1440);
  const laju = online ? lajuOnline : lajuSekarang();
  // Online: jam hanya dipercepat kalau semua teman juga sibuk
  const belum = online ? pemain.filter((p) => p.id !== saya && (p.status === 'bebas' || p.status === 'kerja')).map((p) => p.nama) : [];
  const tidur = sibuk.jenis !== 'aksi';

  const isi = (
    <>
      <p className={`${tidur ? 'text-2xl' : 'text-lg'} font-black`}>{sibuk.label}</p>
      <p className="text-sm font-bold opacity-90">
        🕐 {teksJam(menit)} → selesai jam {selesai}
      </p>
      <div className="h-3 w-56 overflow-hidden rounded-full bg-white/30">
        <div className="h-full rounded-full bg-amber-300 transition-[width] duration-300" style={{ width: `${persen}%` }} />
      </div>
      <p className="text-mini font-bold opacity-80">
        {laju > 1 ? `⏩ Waktu dipercepat ×${laju}` : belum.length > 0 ? `⏳ Jam normal — menunggu ${belum.join(', ')} ikut sibuk/tidur` : '⏳ Jam berjalan...'}
      </p>
      {online && <p className="text-mini font-bold opacity-70">Kamu tetap bisa chat lewat tombol 💬</p>}
    </>
  );

  if (tidur) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-indigo-950/60 text-white">
        <div className="animate-bounce text-6xl">{sibuk.jenis === 'tidur' ? '😴' : '🚌'}</div>
        {isi}
      </div>
    );
  }
  // Aksi biasa: kartu kecil di bawah tengah (di atas baris alat), tidak menutupi notifikasi di atas
  return (
    <div className="pointer-events-none absolute bottom-[8.6rem] left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 rounded-2xl bg-amber-900/70 px-4 py-2 text-white shadow-lg">
      {isi}
    </div>
  );
}
