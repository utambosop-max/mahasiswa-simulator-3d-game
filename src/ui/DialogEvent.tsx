import { getar } from '../game/getar';
import { useEffect } from 'react';
import { useGame, ambilSave } from '../game/store';
import { cekPilihan, efekPilihan, ringkasEfek, teksJam } from '../game/sim';
import { sfxSalah } from '../audio/sfx';

/**
 * Event random & adegan cerita = "chat masuk" (rombak-ui §3.5): avatar (ikon) + nama pengirim (judul) + gelembung (teks),
 * pilihan = tombol balas cepat bernomor 1/2 (nomor = penanda selain warna, juga petunjuk keyboard).
 * Satu warna aksen: pilihan 1 oranye, sisanya netral. Pilihan terkunci: abu + 🔒 + alasan, tetap bisa ditekan.
 */
export function DialogEvent() {
  const s = useGame();
  const ev = s.event;

  // Keyboard PC: 1 / 2 = pilih (pilihan terkunci → tampilkan alasan, sama seperti disentuh)
  useEffect(() => {
    if (!ev) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= ev.pilihan.length) useGame.getState().pilihEventIni(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ev]);

  if (!ev) return null;
  const save = ambilSave(s);
  const cerita = ev.pilihan.some((p) => p.cerita);

  return (
    <div className="safe-x absolute inset-0 z-40 flex items-center justify-center bg-redup">
      <div
        role="dialog"
        aria-label={`Pesan dari ${ev.judul}`}
        className="anim-chat-masuk flex max-h-[94%] w-[min(94%,36rem)] flex-col gap-2 overflow-y-auto rounded-layar bg-hp-layar p-3 text-teks shadow-hp ring-4 ring-hp-casing"
      >
        {/* Header aplikasi chat */}
        <div className="flex items-center gap-2 text-mini font-extrabold text-teks-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-[#7cc6a4] text-sm">{cerita ? '📒' : '💬'}</span>
          <span className="flex-1">{cerita ? 'Buku Sakti · Cerita' : 'ChatYuk · Pesan baru'}</span>
          <span className="tabular-nums">{teksJam(s.menit)}</span>
        </div>
        {/* Avatar + nama + gelembung */}
        <div className="flex items-start gap-2.5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-hp-krem text-4xl leading-none ring-2 ring-hp-casing/10">{ev.ikon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-judul font-black">{ev.judul}</p>
            <p className="mt-1 rounded-kartu rounded-tl-md bg-kartu px-3.5 py-2 text-isi leading-snug font-semibold shadow-tipis ring-1 ring-hp-casing/5">
              {ev.teks}
            </p>
          </div>
        </div>
        <p className="px-1 text-mini font-extrabold text-teks-2">Balas:</p>
        <div className={`grid gap-2 ${ev.pilihan.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {ev.pilihan.map((p, i) => {
            const cek = cekPilihan(save, p);
            // Hasil kuis dirahasiakan sampai dikerjakan
            const info = !cek.boleh ? cek.alasan : p.kuis ? '🎲 Tergantung rajin belajar 2 hari terakhir' : ringkasEfek(efekPilihan(save, p).efek);
            return (
              <button
                key={p.label}
                aria-disabled={!cek.boleh || undefined}
                onClick={() => {
                  getar(10);
                  if (cek.boleh) s.pilihEventIni(i);
                  else {
                    sfxSalah();
                    s.toast(cek.alasan ?? 'Belum bisa');
                  }
                }}
                className={`flex min-h-14 items-center gap-2.5 rounded-tombol px-3 py-1.5 text-left font-extrabold ${
                  !cek.boleh
                    ? 'border-2 border-dashed border-hp-casing/25 bg-netral/60 text-teks-2'
                    : i === 0
                      ? 'bg-aksen text-teks shadow-tombol active:translate-y-0.5 active:shadow-none'
                      : 'bg-netral text-teks active:scale-[0.98]'
                }`}
              >
                {/* Nomor balasan (penanda non-warna + tombol keyboard) */}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/80 text-ket font-black text-teks ring-1 ring-hp-casing/15">
                  {cek.boleh ? i + 1 : '🔒'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-isi leading-tight">{p.bayarKos ? '💸 Bayar kos sekarang' : p.label}</span>
                  {info && <span className="block text-mini font-bold opacity-90">{info}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
