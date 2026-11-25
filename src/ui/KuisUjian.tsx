// Mini-game soal ujian (UTS/UAS): 3 soal pilihan ganda. Nilai = gabungan persiapan belajar + jawaban.
// Persiapan ≥ 60% (atau akrab dengan Pak Dosen) → 1 pilihan salah dicoret sebagai petunjuk.
import { useMemo, useState } from 'react';
import { useGame } from '../game/store';
import { F2, levelRelasi, persiapanUjian, ujianAktif } from '../game/sim';
import { sfxKoin, sfxPop, sfxSalah } from '../audio/sfx';
import { getar } from '../game/getar';

export function KuisUjian() {
  const soal = useGame((s) => s.kuisUjian);
  if (!soal) return null;
  return <Kuis key={soal.map((x) => x.t).join('|')} />;
}

function Kuis() {
  const s = useGame();
  const soal = s.kuisUjian ?? [];
  const [no, setNo] = useState(0);
  const [benar, setBenar] = useState(0);
  const [jawab, setJawab] = useState<number | null>(null);
  const ujian = ujianAktif(s);
  const persiapan = persiapanUjian(s);
  const petunjuk = persiapan >= F2.kuisUjian.petunjukPersiapan || levelRelasi(s, 'pakDosen') >= 3;
  // Pilihan salah yang dicoret (tetap sama per soal)
  const coret = useMemo(() => soal.map((q) => [0, 1, 2].filter((i) => i !== q.b)[Math.floor(Math.random() * 2)]), [soal]);
  const q = soal[no];
  if (!q) return null;

  const pilih = (i: number) => {
    if (jawab !== null) return;
    setJawab(i);
    const ok = i === q.b;
    if (ok) {
      sfxKoin();
      setBenar((b) => b + 1);
    } else {
      sfxSalah();
      getar(30);
    }
    setTimeout(() => {
      if (no + 1 >= soal.length) s.jawabKuis(benar + (ok ? 1 : 0));
      else {
        setNo(no + 1);
        setJawab(null);
        sfxPop();
      }
    }, 900);
  };

  return (
    <div className="safe-x absolute inset-0 z-50 flex items-center justify-center bg-indigo-950/60">
      <div className="flex max-h-[94%] w-[min(92%,760px)] overflow-y-auto flex-col gap-3 rounded-3xl bg-hp-layar p-5 text-teks shadow-sm">
        <div className="flex items-center justify-between font-extrabold">
          <span className="text-lg">📝 {ujian?.nama ?? 'Ujian'} · Soal {no + 1}/{soal.length}</span>
          <span className="rounded-xl bg-white px-3 py-1 text-sm">📚 Persiapan {Math.round(persiapan * 100)}% · ✅ {benar}</span>
        </div>
        <p className="rounded-2xl bg-white px-4 py-3 text-xl font-extrabold">{q.t}</p>
        <div className="flex flex-col gap-2">
          {q.p.map((p, i) => {
            const dicoret = petunjuk && coret[no] === i && jawab === null;
            const warna = jawab === null ? 'bg-white' : i === q.b ? 'bg-emerald-300' : i === jawab ? 'bg-rose-300' : 'bg-white opacity-60';
            return (
              <button
                key={i}
                onPointerDown={() => pilih(i)}
                className={`min-h-14 rounded-2xl px-4 text-left text-lg font-extrabold shadow-sm active:scale-[0.98] ${warna} ${dicoret ? 'line-through opacity-40' : ''}`}
              >
                {['A', 'B', 'C'][i]}. {p}
              </button>
            );
          })}
        </div>
        <p className="text-center text-mini font-bold opacity-70">
          {petunjuk ? '💡 Karena kamu rajin belajar, 1 jawaban salah sudah dicoret!' : '💡 Belajar ≥ 4 hari sebelum ujian = dapat petunjuk.'}
        </p>
      </div>
    </div>
  );
}
