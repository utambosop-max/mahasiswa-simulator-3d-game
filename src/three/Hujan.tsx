import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, type InstancedMesh } from 'three';
import { playerPos } from '../game/playerPos';
import { DUNIA } from '../game/duniaLayout';

const JUMLAH = 320;
const LUAS = 28; // kotak hujan 28 × 28 m di sekitar pemain
const TINGGI = 14;

/** Hujan: garis-garis tipis jatuh (1 InstancedMesh = 1 draw call), ikut posisi pemain. */
export function Hujan() {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  // Posisi relatif tiap tetes (dibuat sekali)
  const tetes = useMemo(
    () =>
      Array.from({ length: JUMLAH }, () => ({
        x: (Math.random() - 0.5) * LUAS,
        z: (Math.random() - 0.5) * LUAS,
        y: Math.random() * TINGGI,
        v: 14 + Math.random() * 6,
      })),
    [],
  );

  useLayoutEffect(() => {
    if (ref.current) ref.current.frustumCulled = false; // ikut pemain, jangan disembunyikan kamera
  }, []);

  useFrame((_, rawDt) => {
    const m = ref.current;
    if (!m) return;
    const dt = Math.min(rawDt, 0.05);
    for (let i = 0; i < JUMLAH; i++) {
      const t = tetes[i];
      t.y -= t.v * dt;
      if (t.y < 0) t.y += TINGGI;
      dummy.position.set(playerPos.x + t.x, t.y, playerPos.z + t.z);
      dummy.rotation.set(0.15, 0, 0.15); // sedikit miring tertiup angin
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, JUMLAH]}>
      <boxGeometry args={[0.025, 0.55, 0.025]} />
      <meshBasicMaterial color="#cfe6ff" transparent opacity={0.55} depthWrite={false} />
    </instancedMesh>
  );
}

/** Genangan air di persimpangan jalan saat hujan (lingkaran pipih mengkilap, tanpa outline). */
export function Genangan() {
  const titik = useMemo(() => {
    const t: [number, number, number][] = [];
    DUNIA.jalanH.forEach((z, i) =>
      DUNIA.jalanV.forEach((x, j) => {
        t.push([x + ((i + j) % 2 ? 1.1 : -0.9), z + (j % 2 ? 0.8 : -0.6), 0.7 + ((i * 3 + j) % 3) * 0.25]);
      }),
    );
    return t;
  }, []);
  return (
    <group>
      {titik.map(([x, z, r], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.025, z]} scale={[1.4, 1, 1]}>
          <circleGeometry args={[r, 16]} />
          <meshStandardMaterial color="#9fb6cc" transparent opacity={0.55} roughness={0.05} metalness={0.2} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
