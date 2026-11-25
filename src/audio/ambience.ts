// Suasana latar (bukan musik berulang — lihat skill procedural-sfx-synth §0):
// pagi/siang = kicau burung (di luar), malam = jangkrik, hujan = rintik. Sangat pelan.
import { useGame } from '../game/store';
import { cuacaHari } from '../game/sim';
import { mulaiAmbienceArea } from './ambienceArea';
import { ambBurung, ambHujan, ambJangkrik, sfxPetir } from './sfx';

const KEY = 'mahasiswa-sim-suasana';

function baca(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'mati';
  } catch {
    return true;
  }
}

let nyala = baca();
export const suasanaNyala = () => nyala;
export function setSuasana(v: boolean) {
  nyala = v;
  try {
    localStorage.setItem(KEY, v ? 'nyala' : 'mati');
  } catch {
    // abaikan
  }
}

let mulai = false;
/** Jalankan penjadwal ambience (sekali saja, setelah audio di-unlock). */
export function mulaiAmbience() {
  if (mulai) return;
  mulai = true;
  mulaiAmbienceArea(suasanaNyala); // kali, sawah, pasar kaget, gang (ikut posisi pemain)
  setInterval(() => {
    if (!nyala || document.visibilityState === 'hidden') return;
    const s = useGame.getState();
    if (s.layarUtama || s.kerja || s.pembuka) return; // selama animasi pembuka: ambience dunia diam
    const hujan = cuacaHari(s.hari).id === 'hujan';
    const luar = s.lokasi === 'dunia';
    if (hujan) {
      ambHujan(); // hujan terdengar juga dari dalam kamar
      // Sesekali petir: kilatan putih (UI) + gemuruh
      if (Math.random() < 0.035) {
        useGame.setState((g) => ({ kilat: g.kilat + 1 }));
        setTimeout(sfxPetir, 250 + Math.random() * 500); // suara datang setelah cahaya
      }
      return;
    }
    const r = Math.random();
    if ((s.fase === 'pagi' || s.fase === 'siang') && luar && r < 0.35) ambBurung();
    else if ((s.fase === 'malam' || s.fase === 'begadang') && r < 0.55) ambJangkrik();
  }, 800);
}
