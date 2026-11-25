// Dialog rapor akhir semester (muncul saat semester berganti).
import { useGame } from '../game/store';
import { AKADEMIK, formatRupiah } from '../game/sim';

export function DialogRapor() {
  const r = useGame((s) => s.raporBaru);
  const tutup = useGame((s) => s.tutupRapor);
  if (!r) return null;
  const cumLaude = r.ipk >= AKADEMIK.predikat[0].min;
  return (
    <div className="safe-x absolute inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="anim-datang flex max-h-[94%] w-[min(90%,560px)] overflow-y-auto flex-col items-center gap-3 rounded-3xl bg-hp-layar p-6 text-center text-teks shadow-sm">
        <div className="text-6xl">{r.ikon}</div>
        <h2 className="text-2xl font-black">📜 Rapor Semester {r.semester}</h2>
        <div className="text-5xl font-black text-orange-600">{r.ipk.toFixed(2)}</div>
        <p className="text-lg font-extrabold">
          {r.predikat} · {r.selisih >= 0 ? '▲ naik' : '▼ turun'} {Math.abs(r.selisih).toFixed(3)} dari awal semester
        </p>
        {cumLaude && <p className="font-extrabold text-emerald-600">🎁 Ortu bangga! Hadiah {formatRupiah(AKADEMIK.cumLaudeHadiah)} masuk dompet.</p>}
        <p className="text-sm font-bold opacity-75">Semester {r.semester + 1} dimulai. Semangat kuliah lagi!</p>
        <button
          onPointerDown={tutup}
          className="min-h-16 rounded-tombol bg-aksen px-8 text-xl font-extrabold text-teks shadow-tombol active:translate-y-0.5 active:shadow-none"
        >
          Lanjut Semester Baru 🎒
        </button>
      </div>
    </div>
  );
}
