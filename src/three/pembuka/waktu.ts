// Jam bersama animasi pembuka. Objek `jam` diubah tiap frame oleh Sutradara (tanpa React),
// sedangkan `usePembuka` (zustand) hanya berubah saat shot/baris teks berganti → UI jarang re-render.
import { create } from 'zustand';

export const jam = {
  /** Detik sejak pembuka mulai */
  t: 0,
  shot: 0,
  /** Detik sejak shot sekarang mulai */
  lokal: 0,
  /** Permintaan lompat ke shot berikut (ketuk layar) */
  lompat: false,
  selesai: false,
};

type UI = { shot: number; baris: number; set: (shot: number, baris: number) => void };
export const usePembuka = create<UI>()((set) => ({ shot: 0, baris: 0, set: (shot, baris) => set({ shot, baris }) }));

export function resetJam() {
  jam.t = 0;
  jam.shot = 0;
  jam.lokal = 0;
  jam.lompat = false;
  jam.selesai = false;
  usePembuka.getState().set(0, 0);
}
