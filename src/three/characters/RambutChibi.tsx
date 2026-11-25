// Gaya rambut chibi prosedural (dipasang di grup kepala; kepala = bola jari-jari 0.42 di titik 0,0,0).
// Bentuk sederhana dengan siluet berbeda tiap gaya agar langsung terbaca dari kamera atas (skill cartoon-3d-stylizer §0).
//
// Optimasi 2026-11-23 (20 Tech Artist): semua potongan rambut berwarna sama digabung jadi SATU geometri per gaya
// (dibuat sekali, dipakai semua chibi) → 1 draw call per rambut (dulu 3–9). Bentuk & posisi potongan tidak berubah.
import { BufferGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, MeshToonMaterial, SphereGeometry } from 'three';
import { gabung, geoBersama, toon } from '../lod/bahan';

const SETENGAH = Math.PI / 2;
type V3 = [number, number, number];
type Potong = { geo: BufferGeometry; pos?: V3; rot?: V3; skala?: V3 };

// Tutup kepala dasar (setengah bola sedikit ke belakang) + rambut samping (di depan telinga) agar bervolume, bukan "helm".
const tutup = (skala: V3 = [1.09, 1.0, 1.09], miring = -0.35): Potong[] => [
  { geo: new SphereGeometry(0.42, 20, 12, 0, Math.PI * 2, 0, SETENGAH), pos: [0, 0.06, -0.04], skala, rot: [miring, 0, 0] },
  ...[-1, 1].map((s): Potong => ({ geo: new SphereGeometry(0.13, 10, 8), pos: [s * 0.4, -0.02, 0.06], rot: [0.2, 0, s * 0.15], skala: [0.45, 1, 0.7] })),
];
// Poni 3 jumput di dahi (memberi siluet "rambut", terlihat dari kamera atas)
const poni3 = (): Potong[] =>
  [-0.17, 0, 0.17].map((x, i) => ({ geo: new SphereGeometry(0.13, 10, 8), pos: [x, 0.24 - (i === 1 ? 0 : 0.03), 0.3], rot: [0.7, 0, x * -1.6], skala: [1, 0.55, 0.65] }));

/** Daftar potongan per gaya (semua berwarna rambut). */
const POTONGAN: Record<string, () => Potong[]> = {
  jabrik: () => [
    ...tutup(),
    // Duri-duri rambut ke atas
    ...[-0.2, 0, 0.2].flatMap((x) => [-0.12, 0.1].map((z): Potong => ({ geo: new ConeGeometry(0.09, 0.24, 6), pos: [x, 0.42, z], rot: [z * 1.5, 0, -x * 1.6] }))),
  ],
  poni: () => [...tutup(), { geo: new SphereGeometry(0.34, 16, 8), pos: [0, 0.2, 0.3], rot: [0.5, 0, 0], skala: [1, 0.45, 0.5] }],
  belah: () => [...tutup(), { geo: new SphereGeometry(0.3, 14, 8), pos: [0.15, 0.25, 0.24], rot: [0.4, 0, -0.5], skala: [1, 0.4, 0.55] }],
  // Rambut terurai di belakang sampai bahu
  panjang: () => [...tutup([1.08, 0.98, 1.08]), { geo: new SphereGeometry(0.4, 16, 10), pos: [0, -0.18, -0.2], skala: [1.05, 1.25, 0.7] }],
  kuncir: () => [...tutup(), { geo: new CapsuleGeometry(0.08, 0.3, 4, 8), pos: [0, 0.12, -0.46], rot: [0.9, 0, 0] }],
  cepol: () => [...tutup(), { geo: new SphereGeometry(0.16, 14, 10), pos: [0, 0.48, -0.08] }],
  // Gumpalan bola kecil mengembang
  keriting: () =>
    ([[0, 0.32, -0.05], [-0.26, 0.22, 0], [0.26, 0.22, 0], [-0.18, 0.28, -0.24], [0.18, 0.28, -0.24], [0, 0.2, -0.32], [-0.32, 0.02, -0.1], [0.32, 0.02, -0.1], [0, 0.3, 0.2]] as V3[]).map(
      (pos): Potong => ({ geo: new SphereGeometry(0.17, 10, 8), pos }),
    ),
  // Hijab bagian leher (bagian kepala bermaterial dua sisi, dibuat terpisah di bawah)
  hijabLeher: () => [{ geo: new CylinderGeometry(0.3, 0.38, 0.3, 14), pos: [0, -0.38, -0.02], skala: [1, 0.5, 1] }],
  // 'pendek' (gaya paling umum): tutup + poni 3 jumput
  pendek: () => [...tutup(), ...poni3()],
};

const geoRambut = (gaya: string) => geoBersama(`rambut-${gaya}`, () => gabung((POTONGAN[gaya] ?? POTONGAN.pendek)()));

// Material khusus (cache per warna): botak transparan, hijab dua sisi
const khusus = new Map<string, MeshToonMaterial>();
function bahanKhusus(kunci: string, buat: () => MeshToonMaterial) {
  let m = khusus.get(kunci);
  if (!m) {
    m = buat();
    khusus.set(kunci, m);
  }
  return m;
}

export function RambutChibi({ gaya = 'pendek', warna }: { gaya?: string; warna: string }) {
  switch (gaya) {
    case 'botak':
      return (
        <mesh position={[0, 0.08, -0.04]} scale={[1.01, 0.92, 1.01]} rotation={[-0.35, 0, 0]}
          material={bahanKhusus(`botak${warna}`, () => new MeshToonMaterial({ color: warna, transparent: true, opacity: 0.35 }))}>
          <sphereGeometry args={[0.42, 16, 10, 0, Math.PI * 2, 0, SETENGAH]} />
        </mesh>
      );
    case 'kuncir':
      return (
        <group>
          <mesh geometry={geoRambut('kuncir')} material={toon(warna)} />
          {/* Ikat rambut merah */}
          <mesh position={[0, 0.2, -0.4]} material={toon('#e9605a')}>
            <sphereGeometry args={[0.05, 8, 6]} />
          </mesh>
        </group>
      );
    case 'hijab':
      return (
        <group>
          {/* Kerudung menutup kepala & leher, wajah tetap terlihat */}
          <mesh position={[0, 0.02, -0.06]} scale={[1.12, 1.1, 1.1]}
            material={bahanKhusus(`hijab${warna}`, () => new MeshToonMaterial({ color: warna, side: DoubleSide }))}>
            {/* Celah wajah di sisi +z (phi = π/2): bola digambar dari 0.68π sepanjang 1.64π */}
            <sphereGeometry args={[0.42, 20, 14, Math.PI * 0.68, Math.PI * 1.64]} />
          </mesh>
          <mesh geometry={geoRambut('hijabLeher')} material={toon(warna)} />
        </group>
      );
    default:
      return <mesh geometry={geoRambut(POTONGAN[gaya] ? gaya : 'pendek')} material={toon(warna)} />;
  }
}
