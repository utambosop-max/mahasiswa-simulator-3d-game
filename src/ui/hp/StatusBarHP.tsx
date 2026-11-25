// Status bar HP (bukan tombol): jam game · hari & tanggal · 🔔 jumlah notif · sinyal (= status online) · baterai (= Energi).
// Metafora selalu disertai teks ("⚡ 72%", "Offline", "Lemas") supaya tidak bergantung warna/ikon saja.
import { useGame } from '../../game/store';
import { useOnline } from '../../online/onlineStore';
import { BAL, namaHari, teksJam } from '../../game/sim';

function Baterai({ energi }: { energi: number }) {
  const lemas = energi < BAL.ambang.energiLemas;
  return (
    <span className={`flex items-center gap-1 ${lemas ? 'text-bahaya-teks' : ''}`} aria-label={`Energi ${energi} persen${lemas ? ', lemas' : ''}`}>
      {/* Ikon baterai: kotak berisi sesuai energi + kepala kecil di kanan */}
      {/* Badan baterai + kepala kecil sebagai saudara (bukan absolute) supaya tidak meluber */}
      <span className="flex items-center">
        <span className="flex h-3.5 w-7 items-center rounded-[0.3rem] border-2 border-current p-[1px]">
          <span className={`h-full rounded-[0.15rem] ${lemas ? 'bg-stat-bahaya' : 'bg-stat-energi'}`} style={{ width: `${Math.max(6, energi)}%` }} />
        </span>
        <span className="h-1.5 w-1 rounded-r-sm bg-current" />
      </span>
      <span className="tabular-nums">⚡{energi}%</span>
      {lemas && <span>Lemas</span>}
    </span>
  );
}

export function StatusBarHP() {
  const menit = useGame((s) => s.menit);
  const hari = useGame((s) => s.hari);
  const tanggal = useGame((s) => s.tanggal);
  const energi = useGame((s) => s.energi);
  const notif = useGame((s) => s.notifBaru);
  const status = useOnline((s) => s.status);
  const sinyal = status === 'main' || status === 'lobi' ? '📶 Online' : status === 'menyambung' ? '📶 …' : status === 'putus' ? '📶 Putus' : '✈️ Offline';
  return (
    <div className="flex h-7 shrink-0 items-center gap-2 px-3 text-mini font-extrabold whitespace-nowrap text-teks">
      <span className="tabular-nums">{teksJam(menit)}</span>
      <span className="text-teks-2">
        {namaHari(hari).slice(0, 3)}, {tanggal}
      </span>
      <span className="flex-1" />
      <span aria-label={`${notif} notifikasi belum dibaca`}>🔔{notif}</span>
      <span>{sinyal}</span>
      <Baterai energi={Math.round(energi)} />
    </div>
  );
}
