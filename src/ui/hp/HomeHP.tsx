// Layar utama HP: widget info vital (uang, tanggal tua, misi) + grid ikon aplikasi (urutan tetap → memori posisi).
// Kolom kanan: ✕ tutup HP & 🔔 daftar notifikasi (keduanya 56 px).
import { useGame } from '../../game/store';
import { useShallow } from 'zustand/react/shallow';
import { formatRupiah, isTanggalTua } from '../../game/sim';
import { cariMisi, progresMisi, siapkanMisi } from '../../game/fitur';
import { sfxPop } from '../../audio/sfx';
import { TombolTutup } from '../kit';
import { DAFTAR_APP } from './daftarApp';
import { IkonApp } from './IkonApp';

type Props = {
  onBuka: (id: string) => void;
  onTutup: () => void;
  onNotif: () => void;
  /** Badge per aplikasi */
  badge: Record<string, number>;
  baru: Record<string, boolean>;
};

function Widget({ onBuka }: { onBuka: (id: string) => void }) {
  const s = useGame(useShallow(({ hari, tanggal, bulan, uang, misi, stat }) => ({ hari, tanggal, bulan, uang, misi, stat })));
  const d = siapkanMisi(s);
  const daftar = d.misi.daftar;
  const selesai = daftar.filter((m) => m.klaim).length;
  const tua = isTanggalTua(s.tanggal);
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-kartu bg-kartu/90 p-3 shadow-tipis ring-1 ring-hp-casing/5">
      <p className="text-mini font-extrabold text-teks-2">💰 Uang saku</p>
      <p className={`text-angka font-black tabular-nums ${s.uang < 100000 ? 'text-bahaya-teks' : ''}`}>{formatRupiah(s.uang)}</p>
      <p className={`rounded-lg px-2 py-0.5 text-mini font-extrabold ${tua ? 'bg-peringatan' : 'bg-netral'}`}>
        {tua ? '😱 Tanggal tua — rem jajan!' : `🗓️ Tgl ${s.tanggal}, bulan ke-${s.bulan}`}
      </p>
      <div className="my-0.5 h-px bg-hp-casing/10" />
      <p className="text-mini font-extrabold">
        ✅ Misi hari ini {selesai}/{daftar.length}
      </p>
      <ul className="flex flex-col gap-0.5">
        {daftar.slice(0, 3).map((it) => {
          const m = cariMisi(it.id);
          if (!m) return null;
          const beres = it.klaim || progresMisi(d, m) >= m.target;
          return (
            <li key={it.id} className="wrap-anywhere text-mini font-semibold text-teks-2">
              {beres ? '✔' : '•'} {m.teks}
            </li>
          );
        })}
      </ul>
      <button
        onClick={() => {
          sfxPop();
          onBuka('todo');
        }}
        className="mt-auto flex min-h-14 items-center justify-between rounded-tombol bg-netral px-3 text-isi font-extrabold active:scale-[0.98]"
      >
        Buka To-Do <span aria-hidden>›</span>
      </button>
    </div>
  );
}

export function HomeHP({ onBuka, onTutup, onNotif, badge, baru }: Props) {
  const notif = useGame((s) => s.notifBaru);
  return (
    <div className="anim-app-buka flex min-h-0 flex-1 gap-3 px-3 pt-1 pb-1">
      <div className="grid min-w-0 flex-1 content-start gap-3 overflow-y-auto overscroll-contain p-1 @min-[42rem]:grid-cols-[11.5rem_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-wrap content-start gap-x-1 gap-y-1.5 @min-[42rem]:col-start-2 @min-[42rem]:row-start-1">
          {DAFTAR_APP.map((a) => (
            <IkonApp key={a.id} app={a} badge={badge[a.id]} baru={baru[a.id]} onBuka={() => onBuka(a.id)} terkunci={false} />
          ))}
        </div>
        <div className="@min-[42rem]:col-start-1 @min-[42rem]:row-start-1">
          <Widget onBuka={onBuka} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <TombolTutup onTekan={onTutup} label="Tutup HP" />
        <button
          aria-label={`Notifikasi, ${notif} belum dibaca`}
          onPointerDown={() => {
            sfxPop();
            onNotif();
          }}
          className="relative grid h-14 w-14 place-items-center rounded-tombol bg-white/70 text-2xl ring-1 ring-hp-casing/10 active:scale-95"
        >
          🔔
          {notif > 0 && (
            <span className="absolute -top-1 -right-1 grid h-6 min-w-6 place-items-center rounded-full bg-[#c2381f] px-1 text-mini font-black text-white">{notif > 9 ? '9+' : notif}</span>
          )}
        </button>
      </div>
    </div>
  );
}
