import { useGame } from '../game/store';
import { FITUR } from '../game/sim';

/** Layar gelap singkat saat waktu berjalan (tidur, kuliah, belajar...) + tips acak. */
export function TransisiOverlay() {
  const transisi = useGame((s) => s.transisi);
  if (!transisi) return null;
  // Tips dipilih dari id transisi (tetap sama selama layar ini tampil)
  const tip = FITUR.tips[transisi.id % FITUR.tips.length];
  return (
    <div
      key={transisi.id}
      className="transisi-fade pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-indigo-950/70"
    >
      <p className="animate-bounce text-3xl font-extrabold text-white drop-shadow">{transisi.teks}</p>
      <p className="max-w-[70%] rounded-xl bg-white/15 px-4 py-1.5 text-center text-sm font-bold text-white/90">{tip}</p>
    </div>
  );
}
