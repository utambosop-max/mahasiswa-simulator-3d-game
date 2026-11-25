// Rantang 3 susun (prosedural). Titik asal = dasar rantang.
const SUSUN = ['#a8e6cf', '#ffe08a', '#a8e6cf'];

export function Rantang() {
  return (
    <group>
      {SUSUN.map((w, i) => (
        <group key={i} position={[0, 0.05 + i * 0.1, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.13, 0.12, 0.09, 14]} />
            <meshToonMaterial color={w} />
          </mesh>
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.135, 0.135, 0.015, 14]} />
            <meshToonMaterial color="#e98a6b" />
          </mesh>
        </group>
      ))}
      {/* Pegangan */}
      <mesh position={[0, 0.32, 0]}>
        <torusGeometry args={[0.12, 0.012, 5, 12, Math.PI]} />
        <meshToonMaterial color="#c9c3bb" />
      </mesh>
    </group>
  );
}
