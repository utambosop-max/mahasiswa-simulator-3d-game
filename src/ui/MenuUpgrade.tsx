import { getar } from '../game/getar';
import { useGame, ambilSave } from '../game/store';
import { cekUpgrade, formatRupiah, infoUpgrade } from '../game/sim';
import { sfxSalah } from '../audio/sfx';
import { Chip, Ket, Panel, Tombol } from './kit';

/** Panel "belanja online" perabot kamar: tiap perabot bisa naik ke level 2 lalu 3. */
export function MenuUpgrade() {
  const s = useGame();
  if (!s.menuUpgrade) return null;
  const save = ambilSave(s);

  return (
    <Panel
      judul="🛋️ Upgrade Kamar"
      sub="💡 Uang kurang? Kerja di Warteg (Pagi–Sore) atau Warkop (Sore–Begadang)"
      kanan={<Chip>💰 {formatRupiah(s.uang)}</Chip>}
      onTutup={() => s.setMenuUpgrade(false)}
      lebar="lg"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {infoUpgrade(save).map(({ def, sekarang, berikut }) => {
          const cek = cekUpgrade(save, def.id);
          return (
            <div key={def.id} className="flex items-center gap-3 rounded-2xl bg-white p-2 ring-1 ring-stone-900/5">
              <span className="text-3xl">{def.ikon}</span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-sm leading-tight font-extrabold">
                  {def.nama}
                  {/* Titik level: ●●○ */}
                  <span className="text-mini tracking-widest text-orange-500" aria-label={`Level ${sekarang.level} dari 3`}>
                    {[1, 2, 3].map((l) => (l <= sekarang.level ? '●' : '○')).join('')}
                  </span>
                </span>
                <Ket className="truncate">Sekarang: {sekarang.label}</Ket>
                <span className="text-mini font-bold text-emerald-700">{berikut ? `➜ ${berikut.label}: ${berikut.deskripsi}` : '✨ Sudah paling bagus!'}</span>
              </div>
              {berikut && (
                <Tombol
                  mati={!cek.boleh}
                  className="shrink-0 flex-col justify-center gap-0 px-3"
                  onTekan={() => {
                    getar(10);
                    if (cek.boleh) s.upgrade(def.id);
                    else {
                      sfxSalah();
                      s.toast(cek.alasan ?? 'Belum bisa');
                    }
                  }}
                >
                  <span className="text-mini leading-none">Beli</span>
                  <span className="tabular-nums">{formatRupiah(berikut.harga)}</span>
                </Tombol>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
