// Posisi warga yang berjalan di dunia (diperbarui tiap frame oleh komponen NPC; objek dipakai ulang
// agar tidak membuat objek baru di useFrame). Dipakai pemain untuk mendeteksi warga yang bisa diajak ngobrol.
export type PosWarga = { id: string; x: number; z: number; aktif: boolean };
export const POS_WARGA: PosWarga[] = [];

/** Ambil (atau buat sekali) slot posisi untuk warga `id`. */
export function slotWarga(id: string): PosWarga {
  let p = POS_WARGA.find((w) => w.id === id);
  if (!p) {
    p = { id, x: 0, z: 0, aktif: false };
    POS_WARGA.push(p);
  }
  return p;
}

/** Warga yang sedang didekati pemain → berhenti berjalan. */
export const wargaDiajak = { id: null as string | null };
