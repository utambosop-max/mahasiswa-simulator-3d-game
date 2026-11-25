// Kardus pindahan bertali rafia (prosedural). Titik asal = tengah kardus.
import { RoundedBox } from '@react-three/drei';

export function Kardus({ skala = 1 }: { skala?: number }) {
  return (
    <group scale={skala}>
      <RoundedBox args={[0.6, 0.45, 0.45]} radius={0.03} smoothness={2} castShadow>
        <meshToonMaterial color="#d9a46c" />
      </RoundedBox>
      {/* Garis tutup kardus */}
      <mesh position={[0, 0.226, 0]}>
        <boxGeometry args={[0.6, 0.005, 0.02]} />
        <meshBasicMaterial color="#a86b3c" />
      </mesh>
      {/* Tali rafia merah muda menyilang */}
      <mesh>
        <boxGeometry args={[0.05, 0.47, 0.47]} />
        <meshToonMaterial color="#e9605a" />
      </mesh>
      <mesh>
        <boxGeometry args={[0.62, 0.47, 0.05]} />
        <meshToonMaterial color="#e9605a" />
      </mesh>
    </group>
  );
}
