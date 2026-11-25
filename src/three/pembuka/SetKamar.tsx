// Set ringkas kamar kos (meniru kamar asli): lantai kayu, 2 dinding, kasur lipat, jendela + kalender dinding.
// Kalender digambar ke CanvasTexture; hanya digambar ulang saat angkanya berubah (bukan tiap frame).
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { CanvasTexture, SRGBColorSpace, type Group } from 'three';
import { PALETTE } from '../palette';
import { jam } from './waktu';

const LABEL = Array.from({ length: 31 }, (_, i) => String(i)); // label angka dibuat sekali

function Kalender({ aktif, durasi }: { aktif: boolean; durasi: number }) {
  const grup = useRef<Group>(null);
  const terakhir = useRef(-1);
  const { kanvas, tex } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 320;
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return { kanvas: c, tex: t };
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);

  const gambar = (n: number) => {
    const g = kanvas.getContext('2d');
    if (!g) return;
    const merah = n >= 30;
    g.fillStyle = '#fffaf2';
    g.fillRect(0, 0, 256, 320);
    g.fillStyle = merah ? '#e23b3b' : '#e98a6b';
    g.fillRect(0, 0, 256, 70);
    g.fillStyle = '#ffffff';
    g.font = '900 40px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('BULAN 1', 128, 38);
    g.fillStyle = merah ? '#e23b3b' : '#3b2a20';
    g.font = '900 170px system-ui, sans-serif';
    g.fillText(LABEL[n], 128, 200);
    tex.needsUpdate = true;
  };

  useFrame(() => {
    // Shot kalender: 1 → 30 membalik cepat (pecahan 0,08–0,3), lalu bergetar
    const f = aktif ? jam.lokal / durasi : 0;
    const n = aktif ? Math.max(1, Math.min(30, Math.round(1 + ((f - 0.08) / 0.22) * 29))) : 1;
    if (n !== terakhir.current) {
      terakhir.current = n;
      gambar(n);
    }
    if (grup.current) grup.current.rotation.z = aktif && n >= 30 && f < 0.75 ? Math.sin(jam.t * 40) * 0.06 : 0;
  });

  return (
    <group ref={grup} position={[-0.75, 1.6, -1.96]}>
      <mesh>
        <planeGeometry args={[0.8, 1.0]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.52, 0.01]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshBasicMaterial color="#3b2a20" />
      </mesh>
    </group>
  );
}

export function SetKamar({ kalender, durasi }: { kalender: boolean; durasi: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 4]} />
        <meshToonMaterial color={PALETTE.lantaiKayu} />
      </mesh>
      {/* Dinding belakang (dengan lubang jendela dibuat dari 4 potong) & kiri */}
      <mesh position={[-1.4, 1.3, -2.05]} receiveShadow>
        <boxGeometry args={[2.2, 2.6, 0.1]} />
        <meshToonMaterial color={PALETTE.dindingKos} />
      </mesh>
      <mesh position={[1.95, 1.3, -2.05]} receiveShadow>
        <boxGeometry args={[1.1, 2.6, 0.1]} />
        <meshToonMaterial color={PALETTE.dindingKos} />
      </mesh>
      <mesh position={[0.55, 0.45, -2.05]}>
        <boxGeometry args={[1.7, 0.9, 0.1]} />
        <meshToonMaterial color={PALETTE.dindingKos} />
      </mesh>
      <mesh position={[0.55, 2.25, -2.05]}>
        <boxGeometry args={[1.7, 0.7, 0.1]} />
        <meshToonMaterial color={PALETTE.dindingKos} />
      </mesh>
      {/* Bingkai & ambang jendela + langit di luar */}
      <mesh position={[0.55, 0.95, -2.1]}>
        <boxGeometry args={[1.8, 0.1, 0.6]} />
        <meshToonMaterial color={PALETTE.kayuGelap} />
      </mesh>
      <mesh position={[0.55, 1.4, -2.6]}>
        <planeGeometry args={[3, 2.5]} />
        <meshBasicMaterial color={PALETTE.langit} />
      </mesh>
      <mesh position={[-2.55, 1.3, 0]} receiveShadow>
        <boxGeometry args={[0.1, 2.6, 4]} />
        <meshToonMaterial color="#f6dcb5" />
      </mesh>
      <mesh position={[0, 0.1, -2]} >
        <boxGeometry args={[5, 0.2, 0.12]} />
        <meshToonMaterial color={PALETTE.dindingBawah} />
      </mesh>
      {/* Kasur lipat + bantal */}
      <RoundedBox args={[1.9, 0.16, 0.95]} radius={0.06} smoothness={2} position={[-1.35, 0.08, -1.1]} castShadow receiveShadow>
        <meshToonMaterial color={PALETTE.kasur} />
      </RoundedBox>
      <RoundedBox args={[0.5, 0.12, 0.7]} radius={0.05} smoothness={2} position={[-2.0, 0.22, -1.1]}>
        <meshToonMaterial color={PALETTE.bantal} />
      </RoundedBox>
      <Kalender aktif={kalender} durasi={durasi} />
    </group>
  );
}
