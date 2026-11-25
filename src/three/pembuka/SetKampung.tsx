// Set kecil "kampung halaman": rumah orang tua (meniru bentuk rumah warga) + teras, jalan desa,
// pagar bambu, pohon kelapa & pohon bulat (semua objek berulang memakai Instances), gunung jauh, asap dapur.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instance, Instances, RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import type { Group } from 'three';
import { PALETTE } from '../palette';
import { usePapan } from '../usePapan';

const RUMAH = { x: 0, z: -3, w: 6, d: 4.5, h: 2.8 };

// Pagar bambu keliling halaman (celah gerbang di depan, x −1,2..1,2)
const PAGAR: [number, number][] = [];
for (let x = -8; x <= 8.01; x += 0.5) {
  if (Math.abs(x) > 1.2) PAGAR.push([x, 5]);
  PAGAR.push([x, -7.5]);
}
for (let z = -7; z < 5; z += 0.5) {
  PAGAR.push([-8, z]);
  PAGAR.push([8, z]);
}
// Pohon kelapa: [x, z, miring]
const KELAPA: [number, number, number][] = [[-5.5, -1, 0.12], [6, 0.5, -0.15], [-7.5, 9, 0.1], [10, 9.5, -0.1], [-12, -6, 0.08]];
// Pohon bulat latar
const POHON: [number, number, number][] = [
  [-4, -9.5, 1.3], [0, -10.5, 1.6], [4.5, -9.8, 1.4], [-10, -2, 1.2], [11, -3, 1.5], [-13, 4, 1.3], [13.5, 3, 1.2], [6, 12, 1.1], [-4, 12.5, 1.2],
];

function Asap() {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    const grp = g.current;
    if (!grp) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < grp.children.length; i++) {
      // Tiga bola dipakai ulang: naik, membesar, lalu kembali ke bawah
      const u = (t * 0.35 + i / 3) % 1;
      const c = grp.children[i];
      c.position.set(Math.sin(u * 4 + i) * 0.2, u * 2, 0);
      c.scale.setScalar(0.25 + u * 0.5);
    }
  });
  return (
    <group ref={g} position={[2.1, 4.4, -4.2]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.5, 10, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export function SetKampung({ asap }: { asap: boolean }) {
  const papan = usePapan('WARUNG IBU', '#7cc6a4', '#ffffff', 512, 112);
  const zDepan = RUMAH.z + RUMAH.d / 2;
  return (
    <group>
      {/* Tanah & halaman */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[90, 90]} />
        <meshToonMaterial color={PALETTE.rumput} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -1]} receiveShadow>
        <planeGeometry args={[15.5, 12]} />
        <meshToonMaterial color="#c8e39a" />
      </mesh>
      {/* Jalan desa tanah + jalan setapak ke rumah */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 7.6]} receiveShadow>
        <planeGeometry args={[90, 3]} />
        <meshToonMaterial color="#e6c79a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.02, 3.8]} receiveShadow>
        <planeGeometry args={[1.6, 5]} />
        <meshToonMaterial color="#e6c79a" />
      </mesh>

      {/* Rumah orang tua (meniru Rumah warga: badan membulat + atap limas) */}
      <group position={[RUMAH.x, 0, RUMAH.z]}>
        <RoundedBox args={[RUMAH.w, RUMAH.h, RUMAH.d]} radius={0.12} smoothness={2} position={[0, RUMAH.h / 2, 0]} castShadow receiveShadow>
          <meshToonMaterial color="#fde8c8" />
          <Outlines thickness={0.03} color={PALETTE.outline} />
        </RoundedBox>
        {/* Atap limas: putar 45° di mesh dalam, skala di grup luar */}
        <group position={[0, RUMAH.h + 0.8, 0]} scale={[RUMAH.w * 0.8, 1, RUMAH.d * 0.85]}>
          <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[1, 1.6, 4]} />
            <meshToonMaterial color={PALETTE.merahBata} />
          </mesh>
        </group>
        {/* Cerobong dapur */}
        <mesh position={[2.1, 3.6, -1.2]} castShadow>
          <boxGeometry args={[0.5, 1.2, 0.5]} />
          <meshToonMaterial color="#c9c3bb" />
        </mesh>
        {/* Pintu, jendela, papan warung kelontong */}
        <RoundedBox args={[1, 1.9, 0.1]} radius={0.04} smoothness={2} position={[-0.9, 0.95 + 0.18, RUMAH.d / 2 + 0.05]}>
          <meshToonMaterial color={PALETTE.kayuGelap} />
        </RoundedBox>
        <mesh position={[1.4, 1.55, RUMAH.d / 2 + 0.03]}>
          <boxGeometry args={[1.4, 0.9, 0.05]} />
          <meshToonMaterial color="#bfe6ff" />
        </mesh>
        <mesh position={[1.4, 2.35, RUMAH.d / 2 + 0.05]}>
          <planeGeometry args={[1.8, 0.4]} />
          <meshBasicMaterial map={papan} toneMapped={false} />
        </mesh>
      </group>
      {/* Teras: lantai, 2 tiang, atap kecil */}
      <RoundedBox args={[6.4, 0.18, 2.2]} radius={0.05} smoothness={2} position={[0, 0.09, zDepan + 1.1]} receiveShadow>
        <meshToonMaterial color={PALETTE.lantaiKayu} />
      </RoundedBox>
      {[-2.9, 2.9].map((x) => (
        <mesh key={x} position={[x, 1.4, zDepan + 2.0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 2.6, 8]} />
          <meshToonMaterial color={PALETTE.kayuGelap} />
        </mesh>
      ))}
      <mesh position={[0, 2.75, zDepan + 1.15]} rotation={[0.22, 0, 0]} castShadow>
        <boxGeometry args={[6.6, 0.1, 2.5]} />
        <meshToonMaterial color={PALETTE.oranye} />
      </mesh>
      {/* Bangku teras */}
      <RoundedBox args={[1.4, 0.4, 0.45]} radius={0.05} smoothness={2} position={[-2.2, 0.38, zDepan + 0.5]}>
        <meshToonMaterial color={PALETTE.kayuGelap} />
      </RoundedBox>

      {/* Pagar bambu (instanced) */}
      <Instances limit={PAGAR.length}>
        <cylinderGeometry args={[0.05, 0.05, 1, 6]} />
        <meshToonMaterial color="#d9c27a" />
        {PAGAR.map(([x, z], i) => (
          <Instance key={i} position={[x, 0.5, z]} />
        ))}
      </Instances>

      {/* Pohon kelapa: batang miring + 5 pelepah daun (instanced) */}
      <Instances limit={KELAPA.length}>
        <cylinderGeometry args={[0.12, 0.18, 5, 8]} />
        <meshToonMaterial color={PALETTE.batang} />
        {KELAPA.map(([x, z, m], i) => (
          <Instance key={i} position={[x + m * 2.5, 2.5, z]} rotation={[0, 0, -m]} />
        ))}
      </Instances>
      <Instances limit={KELAPA.length * 5}>
        <coneGeometry args={[0.35, 2.2, 4]} />
        <meshToonMaterial color={PALETTE.daun[0]} />
        {KELAPA.flatMap(([x, z, m], i) =>
          [0, 1, 2, 3, 4].map((k) => {
            const a = (k / 5) * Math.PI * 2 + i;
            return (
              <Instance
                key={`${i}-${k}`}
                position={[x + m * 5 + Math.sin(a) * 0.9, 5, z + Math.cos(a) * 0.9]}
                rotation={[Math.cos(a) * 1.25, 0, -Math.sin(a) * 1.25]}
                scale={[1, 1, 0.35]}
              />
            );
          }),
        )}
      </Instances>
      {/* Pohon bulat latar (instanced) */}
      <Instances limit={POHON.length}>
        <cylinderGeometry args={[0.18, 0.24, 1.6, 8]} />
        <meshToonMaterial color={PALETTE.batang} />
        {POHON.map(([x, z], i) => (
          <Instance key={i} position={[x, 0.8, z]} />
        ))}
      </Instances>
      <Instances limit={POHON.length}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshToonMaterial color={PALETTE.daun[1]} />
        {POHON.map(([x, z, s], i) => (
          <Instance key={i} position={[x, 1.6 + s, z]} scale={s} />
        ))}
      </Instances>
      {/* Gunung jauh */}
      {[[-22, -35, 12], [4, -42, 16], [28, -36, 11]].map(([x, z, h], i) => (
        <mesh key={i} position={[x, h / 2, z]}>
          <coneGeometry args={[h * 1.2, h, 6]} />
          <meshToonMaterial color={i === 1 ? '#9fc9b0' : '#b5d6c0'} />
        </mesh>
      ))}
      {asap && <Asap />}
    </group>
  );
}
