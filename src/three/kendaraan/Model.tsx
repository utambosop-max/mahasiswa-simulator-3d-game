// Model kendaraan prosedural (menghadap +z). Dipakai lalu lintas, motor pemain & hiasan.
// Optimasi 2026-11-23 (20): roda, lampu depan & lampu belakang yang sama warnanya digabung jadi 1 mesh
// (geometri bersama, dibuat sekali) + material bersama → mobil 17→9 draw call, motor 7→6. Bentuk tidak berubah.
import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import { BoxGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { PALETTE, OUTLINE } from '../palette';
import { basic, gabung, geoBersama, toon } from '../lod/bahan';

const BAN = '#3a3a3a';
type V3 = [number, number, number];
const RODA_ROT: V3 = [0, 0, Math.PI / 2];

/** Roda-roda satu kendaraan digabung (1 draw call). */
const geoRoda = (kunci: string, posisi: V3[], r = 0.34, tebal = 0.26) =>
  geoBersama(`roda-${kunci}`, () => gabung(posisi.map((pos) => ({ geo: new CylinderGeometry(r, r, tebal, 12), pos, rot: RODA_ROT }))));
const geoLampu = (kunci: string, posisi: V3[]) =>
  geoBersama(`lampu-${kunci}`, () => gabung(posisi.map((pos) => ({ geo: new SphereGeometry(0.11, 8, 6), pos }))));

const POS_RODA_MOBIL: V3[] = [-0.86, 0.86].flatMap((x) => [-1.25, 1.25].map((z): V3 => [x, 0.34, z]));
const POS_RODA_ANGKOT: V3[] = [-0.86, 0.86].flatMap((x) => [-1.35, 1.35].map((z): V3 => [x, 0.34, z]));

const lampu = (nyala: boolean) => basic(nyala ? '#fff3b0' : '#f4f4f4');

export function MobilModel({ warna, malam }: { warna: string; malam: boolean }) {
  return (
    <group>
      <RoundedBox args={[1.8, 0.7, 3.9]} radius={0.22} smoothness={2} position={[0, 0.62, 0]} castShadow material={toon(warna)}>
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <RoundedBox args={[1.56, 0.62, 2.0]} radius={0.2} smoothness={2} position={[0, 1.22, -0.2]} castShadow material={toon('#bfe6ff')}>
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <RoundedBox args={[1.6, 0.12, 1.7]} radius={0.05} smoothness={2} position={[0, 1.54, -0.25]} material={toon(warna)} />
      <mesh geometry={geoRoda('mobil', POS_RODA_MOBIL)} material={toon(BAN)} />
      <mesh geometry={geoLampu('mobil', [[-0.55, 0.66, 1.96], [0.55, 0.66, 1.96]])} material={lampu(malam)} />
      <mesh
        geometry={geoBersama('lampuBelakang-mobil', () => gabung([-0.6, 0.6].map((x) => ({ geo: new BoxGeometry(0.3, 0.12, 0.04), pos: [x, 0.68, -1.96] as V3 }))))}
        material={basic('#ff5a5a')}
      />
    </group>
  );
}

export function AngkotModel({ warna, malam }: { warna: string; malam: boolean }) {
  return (
    <group>
      <RoundedBox args={[1.8, 1.55, 4.1]} radius={0.22} smoothness={2} position={[0, 1.0, 0]} castShadow material={toon(warna)}>
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {/* Deretan jendela */}
      <RoundedBox args={[1.84, 0.5, 3.2]} radius={0.08} smoothness={2} position={[0, 1.35, -0.25]} material={toon('#bfe6ff')} />
      <RoundedBox args={[1.5, 0.55, 0.1]} radius={0.05} smoothness={2} position={[0, 1.35, 2.03]} material={toon('#bfe6ff')} />
      {/* Garis putih & papan trayek */}
      <RoundedBox args={[1.84, 0.12, 4.0]} radius={0.04} smoothness={2} position={[0, 0.78, 0]} material={toon(PALETTE.putih)} />
      <RoundedBox args={[1.0, 0.26, 0.5]} radius={0.06} smoothness={2} position={[0, 1.92, 1.2]} material={toon(PALETTE.mentega)}>
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <mesh geometry={geoRoda('angkot', POS_RODA_ANGKOT)} material={toon(BAN)} />
      <mesh geometry={geoLampu('angkot', [[-0.6, 0.62, 2.06], [0.6, 0.62, 2.06]])} material={lampu(malam)} />
    </group>
  );
}

export function MotorModel({ warna, malam = false }: { warna: string; malam?: boolean }) {
  return (
    <group>
      <mesh geometry={geoRoda('motor', [[0, 0.25, 0.5], [0, 0.25, -0.5]], 0.24, 0.12)} material={toon(BAN)} />
      <RoundedBox args={[0.38, 0.42, 1.0]} radius={0.12} smoothness={2} position={[0, 0.55, 0]} castShadow material={toon(warna)}>
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <RoundedBox args={[0.34, 0.12, 0.5]} radius={0.05} smoothness={2} position={[0, 0.82, -0.12]} material={toon(BAN)} />
      <mesh position={[0, 0.98, 0.45]} rotation={[0, 0, Math.PI / 2]} material={toon('#5f6672')}>
        <cylinderGeometry args={[0.03, 0.03, 0.62, 6]} />
      </mesh>
      <mesh position={[0, 0.85, 0.56]} material={lampu(malam)}>
        <sphereGeometry args={[0.11, 8, 6]} />
      </mesh>
    </group>
  );
}
