// Notifikasi push gaya HP (pengganti Toasts lama): banner putih di tengah atas, di bawah HUD.
// • Tidak bisa disentuh (pointer-events-none) agar tidak menghalangi permainan. Maks. 3 banner (diatur store).
// • Ikon & nama aplikasi sumber ditebak dari emoji depan teks (toast(teks) lama tetap jalan).
// • Riwayat lengkap ada di HP (🔔 di layar utama / ChatYuk › Notif).
import { useEffect, useRef } from 'react';
import { useGame } from '../../game/store';
import { BAL } from '../../game/sim';
import { NOTIF_BATERAI, appDariTeks } from './daftarApp';

export function NotifHP() {
  const toasts = useGame((s) => s.toasts);
  const ojol = useGame((s) => s.ojol !== null);
  const energi = useGame((s) => s.energi);
  const layarUtama = useGame((s) => s.layarUtama);

  // Sekali notif lucu saat energi turun melewati ambang "lemas" (baterai = Energi)
  const tadi = useRef(energi);
  useEffect(() => {
    const batas = BAL.ambang.energiLemas;
    if (!layarUtama && tadi.current >= batas && energi < batas) {
      useGame.getState().toast(NOTIF_BATERAI[Math.floor(Math.random() * NOTIF_BATERAI.length)]);
    }
    tadi.current = energi;
  }, [energi, layarUtama]);

  return (
    // Saat narik ojol, banner turun sedikit agar tidak menutupi panel order
    <div
      aria-live="polite"
      className={`safe-x pointer-events-none absolute inset-x-0 z-30 flex flex-col items-center gap-1.5 px-4 ${ojol ? 'top-[8.6rem]' : 'top-[4.6rem]'}`}
    >
      {toasts.map((t) => {
        const app = appDariTeks(t.teks, t.app);
        return (
          <div
            key={t.id}
            className="anim-notif-masuk flex max-w-[62%] items-start gap-2.5 rounded-kartu bg-kartu/95 py-1.5 pr-3.5 pl-2 text-teks shadow-tipis ring-1 ring-hp-casing/10"
          >
            <span
              className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[0.6rem] text-lg leading-none"
              style={{ backgroundColor: app?.warna ?? '#efe6dc' }}
              aria-hidden
            >
              {app?.ikon ?? '🔔'}
            </span>
            <span className="min-w-0">
              <span className="block text-mini font-extrabold text-teks-2">{app?.nama ?? 'Notifikasi'} · baru saja</span>
              <span className="block text-ket leading-snug font-bold">{t.teks}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Daftar notifikasi (dipakai di HP: tombol 🔔 & ChatYuk › Notif). Membuka daftar = tandai dibaca. */
export function DaftarNotif() {
  const riwayat = useGame((s) => s.riwayat);
  const bacaNotif = useGame((s) => s.bacaNotif);
  useEffect(() => {
    bacaNotif();
  }, [bacaNotif, riwayat.length]);
  if (riwayat.length === 0) return <p className="text-isi font-bold text-teks-2">Belum ada notifikasi. HP-mu sepi kayak dompet tanggal tua.</p>;
  return (
    <div className="flex flex-col gap-1.5">
      {[...riwayat].reverse().map((r, i) => {
        const app = appDariTeks(r.teks, r.app);
        return (
          <div key={i} className="flex items-start gap-2.5 rounded-kartu bg-kartu px-2.5 py-2 shadow-tipis ring-1 ring-hp-casing/5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[0.6rem] text-lg" style={{ backgroundColor: app?.warna ?? '#efe6dc' }} aria-hidden>
              {app?.ikon ?? '🔔'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-mini font-extrabold text-teks-2">
                {app?.nama ?? 'Notifikasi'} · {r.waktu}
              </span>
              <span className="block text-ket font-bold">{r.teks}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
