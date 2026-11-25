import { useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { PALETTE, OUTLINE } from '../palette';
import { KAMAR, POSISI } from '../../game/kamarLayout';
import { useGame } from '../../game/store';
import { F2, type Fase } from '../../game/sim';
import { Kasur } from '../props/Kasur';
import { MejaBelajar } from '../props/MejaBelajar';
import { Lemari } from '../props/Lemari';
import { PojokDapur } from '../props/PojokDapur';
import { Ember } from '../props/Ember';
import { Kipas } from '../props/Kipas';
import { Dekorasi } from '../props/Dekorasi';
import { DekorKos, KamarMandi } from '../props/KosExtra';
import { kosDari } from '../../game/m11';

/** Tekstur lantai papan kayu, digambar lewat kode (tanpa file gambar). */
function buatTeksturLantai(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 384; // rasio 4:3 = ukuran lantai 8 x 6
  const g = c.getContext('2d');
  if (g) {
    const baris = 8;
    const tinggi = c.height / baris;
    const panjang = 192;
    for (let r = 0; r < baris; r++) {
      const geser = (r % 2) * (panjang / 2);
      for (let x = -geser, i = 0; x < c.width; x += panjang, i++) {
        g.fillStyle = (r + i) % 2 === 0 ? PALETTE.lantaiKayu : PALETTE.lantaiKayuGelap;
        g.fillRect(x, r * tinggi, panjang, tinggi);
        g.strokeStyle = 'rgba(90, 55, 25, 0.35)';
        g.lineWidth = 3;
        g.strokeRect(x, r * tinggi, panjang, tinggi);
      }
    }
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function Lantai() {
  const tex = useMemo(buatTeksturLantai, []);
  useEffect(() => () => tex.dispose(), [tex]);
  const w = KAMAR.halfW * 2;
  const d = KAMAR.halfD * 2;
  return (
    <group>
      {/* Tanah di luar kamar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.21, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshLambertMaterial color="#f2d3a8" />
      </mesh>
      {/* Alas lantai */}
      <RoundedBox args={[w + 0.4, 0.2, d + 0.4]} radius={0.06} smoothness={2} position={[0, -0.1, 0]}>
        <meshToonMaterial color={PALETTE.kayuGelap} />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </RoundedBox>
      {/* Permukaan papan kayu */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshToonMaterial map={tex} />
      </mesh>
    </group>
  );
}

function Dinding() {
  // Warna cat dinding bisa dibeli di toko (fitur M8)
  const catId = useGame((s) => s.catDinding);
  // Cat bawaan (krem) mengikuti warna khas kos yang ditempati (M11)
  const warnaKos = useGame((s) => kosDari(s).dinding);
  const dasar = F2.catDinding.find((c) => c.id === catId) ?? F2.catDinding[0];
  const cat = catId === 'krem' ? { ...dasar, warna: warnaKos } : dasar;
  const { halfW, halfD, tinggiDinding: h } = KAMAR;
  return (
    <group>
      {/* Dinding belakang */}
      <RoundedBox args={[halfW * 2 + 0.4, h, 0.2]} radius={0.06} smoothness={2} position={[0, h / 2, -halfD - 0.1]} receiveShadow>
        <meshToonMaterial color={cat.warna} />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </RoundedBox>
      <RoundedBox args={[halfW * 2, 0.8, 0.05]} radius={0.02} smoothness={2} position={[0, 0.4, -halfD + 0.02]} receiveShadow>
        <meshToonMaterial color={cat.bawah} />
      </RoundedBox>

      {/* Dinding kiri */}
      <RoundedBox args={[0.2, h, halfD * 2 + 0.4]} radius={0.06} smoothness={2} position={[-halfW - 0.1, h / 2, 0]} receiveShadow>
        <meshToonMaterial color={cat.warna} />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </RoundedBox>
      <RoundedBox args={[0.05, 0.8, halfD * 2]} radius={0.02} smoothness={2} position={[-halfW + 0.02, 0.4, 0]} receiveShadow>
        <meshToonMaterial color={cat.bawah} />
      </RoundedBox>

      {/* Dinding depan & kanan dibuat rendah agar kamera isometric bisa melihat isi kamar */}
      <RoundedBox args={[halfW * 2 + 0.4, 0.3, 0.2]} radius={0.06} smoothness={2} position={[0, 0.15, halfD + 0.1]}>
        <meshToonMaterial color={cat.bawah} />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </RoundedBox>
      <RoundedBox args={[0.2, 0.3, halfD * 2 + 0.4]} radius={0.06} smoothness={2} position={[halfW + 0.1, 0.15, 0]}>
        <meshToonMaterial color={cat.bawah} />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </RoundedBox>
    </group>
  );
}

/** Warna langit di jendela per fase waktu. */
const LANGIT: Record<Fase, string> = {
  pagi: '#bfe6ff',
  siang: '#a8dcff',
  sore: '#ffc48a',
  malam: '#2c3a6b',
  begadang: '#141a38',
};

function Jendela() {
  const fase = useGame((s) => s.fase);
  const malam = fase === 'malam' || fase === 'begadang';
  const z = -KAMAR.halfD + 0.03;
  return (
    <group position={[POSISI.meja[0], 1.65, z]}>
      <RoundedBox args={[1.5, 1.1, 0.08]} radius={0.04} smoothness={2}>
        <meshToonMaterial color={PALETTE.putih} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[1.3, 0.9]} />
        <meshBasicMaterial color={LANGIT[fase]} />
      </mesh>
      {/* Bulan saat malam */}
      {malam && (
        <mesh position={[0.35, 0.22, 0.047]}>
          <circleGeometry args={[0.09, 16]} />
          <meshBasicMaterial color="#fff3c4" />
        </mesh>
      )}
      {/* Kusen tengah */}
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.06, 0.9, 0.02]} />
        <meshToonMaterial color={PALETTE.putih} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[1.3, 0.06, 0.02]} />
        <meshToonMaterial color={PALETTE.putih} />
      </mesh>
      {/* Awan kecil di "luar" (siang hari) */}
      {!malam && (
        <>
          <mesh position={[-0.35, 0.22, 0.047]}>
            <circleGeometry args={[0.1, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.22, 0.24, 0.047]}>
            <circleGeometry args={[0.13, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </>
      )}
    </group>
  );
}

function JamDinding() {
  return (
    <group position={[-1.3, 1.95, -KAMAR.halfD + 0.04]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.06, 20]} />
        <meshToonMaterial color={PALETTE.oranye} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      <mesh position={[0, 0, 0.031]}>
        <circleGeometry args={[0.2, 20]} />
        <meshBasicMaterial color={PALETTE.putih} />
      </mesh>
      <mesh position={[0, 0.06, 0.04]}>
        <boxGeometry args={[0.025, 0.13, 0.01]} />
        <meshBasicMaterial color={PALETTE.outline} />
      </mesh>
      <mesh position={[0.04, 0, 0.04]}>
        <boxGeometry args={[0.09, 0.025, 0.01]} />
        <meshBasicMaterial color={PALETTE.outline} />
      </mesh>
    </group>
  );
}

function Kalender() {
  return (
    <group position={[-2.3, 1.65, -KAMAR.halfD + 0.03]}>
      <RoundedBox args={[0.4, 0.5, 0.02]} radius={0.01} smoothness={2}>
        <meshToonMaterial color={PALETTE.putih} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <mesh position={[0, 0.18, 0.012]}>
        <planeGeometry args={[0.4, 0.12]} />
        <meshBasicMaterial color={PALETTE.merahBata} />
      </mesh>
    </group>
  );
}

function Pintu() {
  const x = -KAMAR.halfW + 0.03;
  return (
    <group position={[x, 0, 2.0]}>
      <RoundedBox args={[0.08, 2.0, 1.0]} radius={0.03} smoothness={2} position={[0, 1.0, 0]}>
        <meshToonMaterial color={PALETTE.kayuGelap} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <mesh position={[0.07, 1.0, -0.35]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshToonMaterial color={PALETTE.mentega} />
      </mesh>
    </group>
  );
}

/** Kamar Kos: wujud perabot mengikuti level upgrade di save. */
export function KamarKos() {
  const level = useGame((s) => s.level);
  const shower = useGame((s) => kosDari(s).toilet === 'shower');
  return (
    <group>
      <Lantai />
      <Dinding />
      <Jendela />
      <JamDinding />
      <Kalender />
      <Pintu />
      <Kasur level={level.kasur} position={POSISI.kasur} />
      <MejaBelajar level={level.meja} position={POSISI.meja} />
      <Kipas level={level.kipas} />
      <Dekorasi level={level.dekorasi} />
      <Lemari position={POSISI.lemari} />
      <PojokDapur position={POSISI.pojokDapur} />
      {!shower && <Ember position={POSISI.ember} />}
      <KamarMandi />
      <DekorKos />
    </group>
  );
}
