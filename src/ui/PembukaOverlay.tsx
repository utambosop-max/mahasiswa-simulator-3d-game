// Lapisan UI animasi pembuka: letterbox sinematik, subtitle, kotak dialog, gelembung, notifikasi WA,
// kartu saldo, teks besar "TANGGAL TUA", judul game, dan tombol "Lewati ⏭" (muncul sejak detik pertama).
import { useGame } from '../game/store';
import { formatRupiah } from '../game/sim';
import { PENAMPILAN, SHOT, isiTeks, type Teks } from '../three/pembuka/data';
import { jam, usePembuka } from '../three/pembuka/waktu';

const GAYA = `
@keyframes pbk-pudar { from { opacity: 1 } to { opacity: 0 } }
@keyframes pbk-muncul { from { opacity: 0; transform: translateY(10px) scale(.96) } to { opacity: 1; transform: none } }
@keyframes pbk-getar { 0%,100% { transform: translate(-50%,-50%) rotate(-2deg) } 25% { transform: translate(calc(-50% + 6px),-50%) rotate(2deg) } 50% { transform: translate(-50%,calc(-50% - 4px)) rotate(-1deg) } 75% { transform: translate(calc(-50% - 6px),-50%) rotate(1deg) } }
.pbk-muncul { animation: pbk-muncul .28s ease-out both }
`;

function terakhir(daftar: Teks[], jenis: Teks['jenis']): Teks | undefined {
  for (let i = daftar.length - 1; i >= 0; i--) if (daftar[i].jenis === jenis) return daftar[i];
  return undefined;
}

export function PembukaOverlay({ onLewati }: { onLewati: () => void }) {
  const shot = usePembuka((s) => s.shot);
  const baris = usePembuka((s) => s.baris);
  const nama = useGame((s) => s.profil?.nama ?? 'Kamu');
  const uang = useGame((s) => s.uang);
  const s = SHOT[shot];
  const tampil = s.teks.slice(0, baris);
  const isi = (t: string) => isiTeks(t, nama, formatRupiah(uang));
  const sub = terakhir(tampil, 'subtitle');
  const dialog = terakhir(tampil, 'dialog');
  const gelembung = terakhir(tampil, 'gelembung');
  const wa = tampil.filter((t) => t.jenis === 'wa');
  const saldo = terakhir(tampil, 'saldo');
  const judul = terakhir(tampil, 'judul');
  const besar = !judul ? terakhir(tampil, 'besar') : undefined;
  const pembicara = dialog?.tokoh ? PENAMPILAN[dialog.tokoh] : undefined;

  return (
    <div
      className="absolute inset-0 z-[70] select-none overflow-hidden text-amber-950"
      // Ketuk layar = lompat ke shot berikut (percepat)
      onPointerDown={(e) => {
        if (!(e.target as HTMLElement).closest('button')) jam.lompat = true;
      }}
    >
      <style>{GAYA}</style>
      {/* Kilas hitam saat pindah lokasi (menutupi pergantian set) */}
      <div key={s.lokasi} className="pointer-events-none absolute inset-0 bg-black" style={{ animation: 'pbk-pudar .55s ease-out forwards' }} />
      {/* Letterbox sinematik */}
      <div className="absolute inset-x-0 top-0 h-[9%] bg-black" />
      <div className="absolute inset-x-0 bottom-0 h-[9%] bg-black" />

      {/* Tombol Lewati — kanan atas, ≥ 56 px, aman dari poni (safe area) */}
      <button
        onPointerDown={onLewati}
        aria-label="Lewati pembuka"
        className="absolute top-2 z-10 min-h-14 min-w-14 rounded-2xl bg-white/90 px-5 text-lg font-black text-amber-900 shadow active:scale-95"
        style={{ right: 'calc(env(safe-area-inset-right) + 0.75rem)' }}
      >
        Lewati ⏭
      </button>

      {sub && (
        <p key={`s${shot}`} className="pbk-muncul absolute inset-x-[8%] bottom-[14%] text-center text-2xl font-black text-white italic drop-shadow-[0_2px_3px_rgba(0,0,0,.8)]">
          {isi(sub.isi)}
        </p>
      )}

      {dialog && pembicara && !judul && (
        <div key={`d${shot}-${dialog.t}`} className="pbk-muncul absolute bottom-[12%] left-1/2 w-[62%] -translate-x-1/2">
          <span className="relative z-10 ml-5 inline-block rounded-xl px-4 py-1 text-base font-black text-white" style={{ backgroundColor: pembicara.warnaNama }}>
            {isi(pembicara.nama)}
          </span>
          <div className="-mt-2 rounded-3xl border-4 border-amber-900/80 bg-amber-50 px-6 py-3 text-2xl font-extrabold shadow-lg">{isi(dialog.isi)}</div>
        </div>
      )}

      {gelembung && (
        <div
          key={`g${shot}`}
          className="pbk-muncul absolute rounded-full border-4 border-amber-900/70 bg-white px-5 py-2 text-xl font-black"
          style={{ left: `${gelembung.pos?.[0] ?? 50}%`, top: `${gelembung.pos?.[1] ?? 30}%` }}
        >
          💤 {isi(gelembung.isi)}
        </div>
      )}

      {wa.length > 0 && (
        <div className="absolute top-[12%] left-[4%] flex w-[38%] flex-col gap-2">
          <div className="rounded-xl bg-emerald-600 px-3 py-1 text-sm font-black text-white">💬 Keluarga Bahagia 🏠</div>
          {wa.map((w) => (
            <div key={w.t} className="pbk-muncul rounded-2xl bg-white px-4 py-2 shadow-md">
              <span className="text-mini font-black" style={{ color: PENAMPILAN[w.tokoh ?? 'ibu'].warnaNama }}>
                {PENAMPILAN[w.tokoh ?? 'ibu'].nama}
              </span>
              <p className="text-lg font-extrabold">{isi(w.isi)}</p>
            </div>
          ))}
        </div>
      )}

      {saldo && (
        <div className="pbk-muncul absolute top-[16%] right-[6%] w-[22%] rounded-[1.6rem] border-[6px] border-stone-800 bg-sky-50 p-3 text-center shadow-xl">
          <p className="text-mini font-black text-teks-2">🏦 Saldo kamu</p>
          <p className="text-2xl font-black text-emerald-700">{isi(saldo.isi)}</p>
          <p className="text-mini font-bold text-teks-2">Kiriman bulan ini</p>
        </div>
      )}

      {besar && (
        <p
          className="absolute top-1/2 left-1/2 text-7xl font-black whitespace-nowrap text-rose-600 drop-shadow-[0_4px_0_#fff]"
          style={{ animation: 'pbk-getar .12s linear infinite', WebkitTextStroke: '3px #7a1d1d' }}
        >
          {besar.isi}
        </p>
      )}

      {judul && (
        <div className="pbk-muncul absolute inset-x-0 top-[9%] bottom-[9%] grid place-items-center bg-amber-50/75">
          <div className="text-center">
            <p className="text-6xl font-black text-orange-500 drop-shadow-[0_4px_0_#7a3b2e]">🎓 {isi(judul.isi)}</p>
            <p className="mt-3 text-2xl font-extrabold text-amber-900">Bertahan sampai wisuda. Dimulai dari tanggal 1!</p>
          </div>
        </div>
      )}
    </div>
  );
}
