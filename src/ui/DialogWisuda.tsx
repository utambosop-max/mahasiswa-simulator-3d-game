// Layar wisuda: muncul saat lulus sidang. Ringkasan perjalanan kuliah. Game tetap bisa dilanjutkan.
import { useGame } from '../game/store';
import { F2, JURUSAN, formatRupiah, predikatIpk } from '../game/sim';

export function DialogWisuda() {
  const s = useGame();
  if (!s.wisuda) return null;
  const pr = predikatIpk(s.ipk);
  const jur = JURUSAN.find((j) => j.id === s.profil?.jurusan);
  const tahun = (s.hari / 360).toFixed(1);
  return (
    <div className="safe-x absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-indigo-900/80 to-amber-900/70">
      <div className="anim-datang flex max-h-[94%] w-[min(92%,640px)] overflow-y-auto flex-col items-center gap-2 rounded-3xl bg-hp-layar p-6 text-center text-teks shadow-sm">
        <div className="flex gap-2 text-5xl">
          <span className="animate-bounce">🎓</span>
          <span className="animate-bounce [animation-delay:150ms]">🎉</span>
          <span className="animate-bounce [animation-delay:300ms]">💐</span>
        </div>
        <h2 className="text-3xl font-black text-orange-600">Selamat Wisuda, {s.profil?.nama}!</h2>
        <p className="text-lg font-extrabold">
          Sarjana {jur?.ikon} {jur?.nama} · IPK {s.ipk.toFixed(2)} {pr.ikon} {pr.nama}
        </p>
        <div className="grid w-full grid-cols-3 gap-2 text-sm font-extrabold">
          <div className="rounded-xl bg-white p-2">📅 {s.hari} hari ({tahun} tahun)</div>
          <div className="rounded-xl bg-white p-2">📘 {s.sks} SKS</div>
          <div className="rounded-xl bg-white p-2">🏆 {s.pencapaian.length} pencapaian</div>
          <div className="rounded-xl bg-white p-2">💼 {s.stat.kerja ?? 0} shift kerja</div>
          <div className="rounded-xl bg-white p-2">🍜 {s.stat.masakMi ?? 0} mi instan</div>
          <div className="rounded-xl bg-white p-2">📸 {s.follower} follower</div>
        </div>
        <p className="font-bold">🎁 Ortu menangis bangga & kirim hadiah {formatRupiah(F2.wisuda.hadiahOrtu)}. Topi toga kini menempel di kepalamu!</p>
        <p className="text-sm font-bold opacity-75">Kamu tetap bisa lanjut hidup di kos: kerja, nongkrong, dan bantu teman-teman lulus.</p>
        <button
          onPointerDown={() => useGame.setState({ wisuda: false })}
          className="mt-1 min-h-16 rounded-tombol bg-aksen px-8 text-xl font-extrabold text-teks shadow-tombol active:translate-y-0.5 active:shadow-none"
        >
          🎓 Lanjut Hidup
        </button>
      </div>
    </div>
  );
}
