import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import { useGame } from '../game/store';
import { FITUR } from '../game/sim';
import { playerPos } from '../game/playerPos';

/**
 * Penanda tujuan ojol: tiang cahaya tinggi (terlihat dari jauh, seperti landmark) + label.
 * Juga memeriksa tiap frame apakah pemain sudah sampai / waktu order habis.
 */
export function TargetOjol() {
  const ojol = useGame((s) => s.ojol);
  const lokasi = useGame((s) => s.lokasi);
  const panah = useRef<Group>(null);
  const kunci = useRef(''); // cegah memicu majuOjol dua kali untuk tahap yang sama

  useFrame(({ clock }) => {
    if (panah.current) panah.current.position.y = 3.2 + Math.sin(clock.getElapsedTime() * 4) * 0.25;
    const st = useGame.getState();
    const o = st.ojol;
    if (!o || st.lokasi !== 'dunia') return;
    const tahapKunci = `${o.ke}-${o.tahap}`;
    if (kunci.current === tahapKunci) return;
    const t = o.tahap === 'jemput' ? o.order.jemput : o.order.antar;
    if (performance.now() > o.batas) {
      kunci.current = tahapKunci;
      st.majuOjol('habis');
    } else if (Math.hypot(playerPos.x - t.x, playerPos.z - t.z) < FITUR.ojol.radiusSampai && st.naikMotor) {
      kunci.current = tahapKunci;
      st.majuOjol('sampai');
    }
  });

  if (!ojol || lokasi !== 'dunia') return null;
  const t = ojol.tahap === 'jemput' ? ojol.order.jemput : ojol.order.antar;
  const warna = ojol.tahap === 'jemput' ? '#7cc6a4' : '#ffb36b';
  return (
    <group position={[t.x, 0, t.z]}>
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[0.35, 0.6, 8, 12, 1, true]} />
        <meshBasicMaterial color={warna} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[FITUR.ojol.radiusSampai - 0.4, FITUR.ojol.radiusSampai, 32]} />
        <meshBasicMaterial color={warna} transparent opacity={0.7} depthWrite={false} />
      </mesh>
      <group ref={panah} position={[0, 3.2, 0]}>
        <Html center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className="rounded-xl border-2 border-white px-2 py-0.5 text-sm font-extrabold whitespace-nowrap text-white shadow" style={{ backgroundColor: warna }}>
            {ojol.tahap === 'jemput' ? '🙋 Jemput' : '📦 Antar'}
          </div>
        </Html>
      </group>
    </group>
  );
}
