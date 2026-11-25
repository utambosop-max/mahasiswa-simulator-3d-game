import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, Fog, type AmbientLight, type DirectionalLight, type HemisphereLight, type PointLight } from 'three';
import { useGame } from '../game/store';
import { cuacaHari, type CuacaId, type Fase, type Lokasi } from '../game/sim';
import { POSISI } from '../game/kamarLayout';
import { playerPos } from '../game/playerPos';
import { posisiMatahari, type PosisiMatahari } from '../game/fisika';

type Suasana = {
  bg: Color;
  sun: Color;
  sunI: number;
  sky: Color;
  ground: Color;
  hemiI: number;
  amb: number;
  lampu: number; // lampu kamar (kuning)
  laptop: number; // cahaya layar laptop (biru)
};

const c = (hex: string) => new Color(hex);

/** Suasana cahaya per fase (lihat docs/ART_BIBLE.md §5). Dibuat sekali di level modul. */
export const SUASANA: Record<Fase, Suasana> = {
  pagi: { bg: c('#fff1dc'), sun: c('#ffe2b8'), sunI: 1.2, sky: c('#fff4e0'), ground: c('#e0b48a'), hemiI: 0.6, amb: 0.35, lampu: 0, laptop: 0 },
  siang: { bg: c('#fff8ec'), sun: c('#fff4e6'), sunI: 1.4, sky: c('#ffffff'), ground: c('#e8c49a'), hemiI: 0.65, amb: 0.4, lampu: 0, laptop: 0 },
  sore: { bg: c('#ffd2a6'), sun: c('#ffad6b'), sunI: 1.1, sky: c('#ffd9b0'), ground: c('#c98d5c'), hemiI: 0.55, amb: 0.3, lampu: 0, laptop: 0 },
  malam: { bg: c('#3b4673'), sun: c('#a9b8ff'), sunI: 0.45, sky: c('#8a96d0'), ground: c('#4a3a55'), hemiI: 0.5, amb: 0.28, lampu: 1.6, laptop: 0.5 },
  begadang: { bg: c('#1d2244'), sun: c('#7f8fe0'), sunI: 0.3, sky: c('#5a64a8'), ground: c('#2e2440'), hemiI: 0.4, amb: 0.22, lampu: 0.9, laptop: 1.6 },
};

const ARAH_MATAHARI = [5, 10, 4] as const;
// Matahari sungguhan (M12): arah dihitung dari jam & tanggal game (rumus NOAA di fisika.ts)
const JARAK_MATAHARI = 12;
const MATAHARI: PosisiMatahari = { x: 0, y: 1, z: 0, elevasi: 90 };
const JINGGA = c('#ff9a5c'); // cahaya & langit saat matahari rendah (fajar/senja)
const SUN_TARGET = new Color();
// Cuaca: langit dicampur abu-abu & matahari meredup (warna bantu dibuat sekali, dipakai ulang tiap frame)
const ABU = c('#9aa3ad');
const BG_CUACA = new Color();
const MENDUNG: Record<CuacaId, { campur: number; matahari: number }> = {
  cerah: { campur: 0, matahari: 1 },
  berawan: { campur: 0.25, matahari: 0.8 },
  hujan: { campur: 0.55, matahari: 0.45 },
};

/** Pencahayaan hangat & ringan yang berganti halus mengikuti fase waktu dan lokasi. */
export function Lighting({ lokasi }: { lokasi: Lokasi }) {
  const fase = useGame((s) => s.fase);
  const cuaca = useGame((s) => cuacaHari(s.hari).id);
  // Mode hemat: tanpa bayangan (paling berat untuk GPU HP)
  const bayangan = useGame((s) => s.grafik !== 'hemat');
  // Ultra: peta bayangan 2× lebih tajam (tepi bayangan lebih halus)
  const ukuranBayangan = useGame((s) => (s.grafik === 'ultra' ? 2048 : 1024));
  const scene = useThree((s) => s.scene);
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const amb = useRef<AmbientLight>(null);
  const lampu = useRef<PointLight>(null);
  const laptop = useRef<PointLight>(null);
  // Kamar kos & interior gedung = dalam ruangan (tanpa kabut, bayangan sempit, ada lampu)
  const dalam = lokasi !== 'dunia';
  const kamar = lokasi === 'kamar';
  const luasBayangan = dalam ? 7 : 14;

  // Saat muncul / ganti lokasi: langsung pakai suasana fase sekarang (tanpa transisi)
  useEffect(() => {
    const s = SUASANA[useGame.getState().fase];
    scene.background = s.bg.clone();
    // Kabut tipis di dunia luar: memberi kesan jauh & menyembunyikan ujung peta
    scene.fog = dalam ? null : new Fog(s.bg.clone(), 38, 85);
    const l = sun.current;
    if (l) {
      l.color.copy(s.sun);
      l.intensity = s.sunI;
      l.shadow.camera.updateProjectionMatrix();
      scene.add(l.target); // target harus ada di scene agar bisa digeser
    }
    if (hemi.current) {
      hemi.current.color.copy(s.sky);
      hemi.current.groundColor.copy(s.ground);
      hemi.current.intensity = s.hemiI;
    }
    if (amb.current) amb.current.intensity = s.amb;
    if (lampu.current) lampu.current.intensity = s.lampu;
    if (laptop.current) laptop.current.intensity = s.laptop;
    return () => {
      if (l) scene.remove(l.target);
    };
  }, [scene, lokasi, dalam]);

  useFrame((_, dt) => {
    const s = SUASANA[fase];
    const k = 1 - Math.exp(-dt * 2.5);
    const m = MENDUNG[dalam ? 'cerah' : cuaca];
    // Posisi matahari dari jam game. senja = 1 saat matahari tepat di cakrawala, 0 saat ≥ 15° di atasnya.
    const st = useGame.getState();
    posisiMatahari(st.hari, st.menit, MATAHARI);
    const siangHari = !dalam && MATAHARI.elevasi > 2;
    const senja = siangHari ? Math.max(0, 1 - MATAHARI.elevasi / 15) : 0;
    if (scene.background instanceof Color) {
      BG_CUACA.copy(s.bg).lerp(JINGGA, senja * 0.45 * (1 - m.campur)).lerp(ABU, m.campur);
      scene.background.lerp(BG_CUACA, k);
      if (scene.fog) scene.fog.color.copy(scene.background);
    }
    const l = sun.current;
    if (l) {
      SUN_TARGET.copy(s.sun).lerp(JINGGA, senja * 0.7);
      l.color.lerp(SUN_TARGET, k);
      // Matahari rendah = sinar lewat atmosfer lebih tebal → lebih redup (minimal 45%)
      const redup = siangHari ? 0.45 + 0.55 * Math.min(1, MATAHARI.elevasi / 30) : 1;
      l.intensity += (s.sunI * m.matahari * redup - l.intensity) * k;
      // Di dunia luar, area bayangan mengikuti pemain
      const px = dalam ? 0 : playerPos.x;
      const pz = dalam ? 0 : playerPos.z;
      if (siangHari) {
        // y dijaga ≥ 0,3 agar bayangan pagi/sore panjang tapi tidak keluar dari area peta bayangan
        const y = Math.max(0.3, MATAHARI.y);
        const panjang = JARAK_MATAHARI / Math.hypot(MATAHARI.x, y, MATAHARI.z);
        l.position.set(px + MATAHARI.x * panjang, y * panjang, pz + MATAHARI.z * panjang);
      } else {
        // Malam / dalam ruangan: arah tetap (cahaya bulan / lampu)
        l.position.set(px + ARAH_MATAHARI[0], ARAH_MATAHARI[1], pz + ARAH_MATAHARI[2]);
      }
      l.target.position.set(px, 0, pz);
      l.target.updateMatrixWorld();
    }
    if (hemi.current) {
      hemi.current.color.lerp(s.sky, k);
      hemi.current.groundColor.lerp(s.ground, k);
      hemi.current.intensity += (s.hemiI - hemi.current.intensity) * k;
    }
    if (amb.current) amb.current.intensity += (s.amb - amb.current.intensity) * k;
    // Gedung: lampu toko/kantor selalu menyala terang
    const targetLampu = kamar ? s.lampu : Math.max(1.1, s.lampu);
    if (lampu.current) lampu.current.intensity += (targetLampu - lampu.current.intensity) * k;
    if (laptop.current) laptop.current.intensity += (s.laptop - laptop.current.intensity) * k;
  });

  return (
    <>
      <hemisphereLight ref={hemi} />
      <ambientLight ref={amb} />
      <directionalLight
        key={`${lokasi}-${ukuranBayangan}`}
        ref={sun}
        castShadow={bayangan}
        shadow-mapSize={[ukuranBayangan, ukuranBayangan]}
        shadow-camera-left={-luasBayangan}
        shadow-camera-right={luasBayangan}
        shadow-camera-top={luasBayangan}
        shadow-camera-bottom={-luasBayangan}
        shadow-camera-far={40}
        shadow-bias={-0.0005}
      />
      {/* Lampu kamar & cahaya laptop: hanya di dalam kos, tanpa bayangan agar ringan */}
      {dalam && (
        <>
          <pointLight ref={lampu} position={[0, 2.4, 0.3]} color="#ffd59a" distance={kamar ? 10 : 14} decay={1} />
          {kamar && (
            <pointLight
              ref={laptop}
              position={[POSISI.meja[0] + 0.05, 0.75, POSISI.meja[2] + 0.3]}
              color="#7fd8ff"
              distance={3}
              decay={2}
            />
          )}
        </>
      )}
    </>
  );
}
