// Bengkel Pak Jo: upgrade mesin motor & cat ulang warna motor.
import { useGame } from '../game/store';
import { F2, formatRupiah, hargaIsiBensin, infoMotor } from '../game/sim';
import { catMotor, upgradeMotor } from '../game/fitur';
import { Chip, Kartu, Panel, Tombol } from './kit';

export function Bengkel() {
  const s = useGame();
  if (!s.bengkel) return null;
  const berikut = F2.motorUpgrade.find((u) => u.level === s.motorLevel + 1);
  const m = infoMotor(s);
  return (
    <Panel judul="🔧 Bengkel Pak Jo" kanan={<Chip>💰 {formatRupiah(s.uang)}</Chip>} onTutup={() => useGame.setState({ bengkel: false })} lebar="md">
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Kartu judul="🏍️ Mesin" kanan={`level ${s.motorLevel}/3`}>
            <p className="text-mini font-semibold text-teks-2">
              Kencang ×{m.kecepatan} · irit ×{m.hemat}
            </p>
          </Kartu>
          <Kartu judul="⛽ Bensin" kanan={`${Math.round(s.bensin)}%`}>
            <p className="text-mini font-semibold text-teks-2">Isi penuh {formatRupiah(hargaIsiBensin(s))}</p>
          </Kartu>
        </div>
        <Tombol onTekan={() => s.fitur(upgradeMotor, 'upgrade')} mati={!berikut}>
          <span className="min-w-0 flex-1">{berikut ? `⬆️ ${berikut.nama} (×${berikut.kecepatan} kencang, ×${berikut.hemat} bensin)` : '✨ Mesin sudah level maksimal'}</span>
          {berikut && <span className="shrink-0 tabular-nums">{formatRupiah(berikut.harga)}</span>}
        </Tombol>
        <Kartu judul="🎨 Cat ulang motor" kanan={formatRupiah(F2.catMotor.harga)}>
          <div className="flex flex-wrap gap-2">
            {F2.catMotor.warna.map((w) => (
              <button
                key={w}
                aria-label={`Cat motor ${w}`}
                onPointerDown={() => s.fitur((d) => catMotor(d, w), 'koin')}
                className={`grid h-14 w-14 place-items-center rounded-full font-black text-white ring-2 ${s.warnaMotor === w ? 'ring-stone-800' : 'ring-transparent'}`}
                style={{ backgroundColor: w }}
              >
                {s.warnaMotor === w ? '✓' : ''}
              </button>
            ))}
          </div>
        </Kartu>
      </div>
    </Panel>
  );
}
