// M12: bingkai bersama 8 mini-game fisika — judul, penjelasan rumus singkat, tombol Lewati & Batal.
// Mini-game dibuka oleh store (lakukan aksi tertentu / ujian SIM) dan ditutup lewat akhiriMini().
import type { ComponentType } from 'react';
import { useGame } from '../game/store';
import type { JenisMini } from '../game/m12';
import type { Selesai } from './fisika/alat';
import { Penalti } from './fisika/Penalti';
import { AngkatBeban } from './fisika/AngkatBeban';
import { SetemGitar } from './fisika/SetemGitar';
import { BatuPantul } from './fisika/BatuPantul';
import { IsiBensin } from './fisika/IsiBensin';
import { RebusMi } from './fisika/RebusMi';
import { Juggling } from './fisika/Juggling';
import { UjianSim } from './fisika/UjianSim';
import { Panel } from '../ui/kit';
import { sfxPop } from '../audio/sfx';

const DAFTAR: Record<JenisMini, { judul: string; rumus: string; Komponen: ComponentType<{ selesai: Selesai }> }> = {
  penalti: { judul: '⚽ Adu Penalti', rumus: 'Lintasan parabola: y = v·sinθ·t − ½·g·t²', Komponen: Penalti },
  beban: { judul: '🏋️ Angkat Beban', rumus: 'Pendulum terbalik: makin miring, makin cepat jatuh', Komponen: AngkatBeban },
  gitar: { judul: '🎸 Setem Gitar', rumus: 'Frekuensi senar f = (1/2L)·√(T/μ) · beat = |f − f₀|', Komponen: SetemGitar },
  batu: { judul: '🪨 Lempar Batu Pantul', rumus: 'Memantul jika sudut datang kecil · v_y baru = −e·v_y', Komponen: BatuPantul },
  bensin: { judul: '⛽ Isi Bensin Pas', rumus: 'Volume = ∫ laju alir dt — sisa di selang tetap mengalir', Komponen: IsiBensin },
  mi: { judul: '🍜 Rebus Mi', rumus: 'Pemanasan Newton: T = T_api + (T₀ − T_api)·e^(−kt)', Komponen: RebusMi },
  juggling: { judul: '⚽ Juggling Bola', rumus: 'Jatuh bebas: v = v₀ − g·t', Komponen: Juggling },
  sim: { judul: '🪪 Ujian Praktik SIM', rumus: 'Jarak rem s = v² / (2·μ·g)', Komponen: UjianSim },
};

export function MiniFisika() {
  const m = useGame((s) => s.miniFisika);
  const akhiri = useGame((s) => s.akhiriMini);
  if (!m) return null;
  const { judul, rumus, Komponen } = DAFTAR[m.jenis];
  const wajib = m.jenis === 'sim'; // ujian SIM tidak bisa dilewati (hanya dibatalkan)
  return (
    <Panel
      judul={judul}
      sub={`📐 ${rumus}`}
      lebar="lg"
      tutupLuar={false}
      onTutup={() => akhiri('batal')}
      aksiHeader={
        !wajib && (
          <button
            onPointerDown={() => {
              sfxPop();
              akhiri('lewati');
            }}
            className="min-h-12 shrink-0 rounded-2xl bg-stone-200/70 px-3 text-sm font-extrabold text-stone-600 active:scale-95"
          >
            Lewati ⏭
          </button>
        )
      }
    >
      <Komponen selesai={(skor) => setTimeout(() => akhiri(skor), 900)} />
    </Panel>
  );
}
