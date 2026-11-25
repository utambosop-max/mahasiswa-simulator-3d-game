// M13: kehidupan latar ringan — kucing kampung, merpati yang terbang saat didekati, bebek di sungai.
// Satu useFrame per jenis, tanpa alokasi objek baru di dalamnya.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instance, Instances } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import type { Group, Object3D } from 'three';
import { playerPos } from '../../game/playerPos';
import { sfxMerpati } from '../../audio/sfx';
import { BEBEK, KAWANAN_BURUNG, KUCING_KAMPUNG, SUNGAI } from '../../game/duniaLayout';
import { PALETTE, OUTLINE } from '../palette';
import { GEO_BOLA, GEO_KERUCUT } from './geoBersama';
import { useTampilDekat } from './useTampilDekat';

/** Model kucing chibi kecil. `tidur` = meringkuk. Ekor bisa digoyang lewat `ekorRef`. */
export function KucingModel({ warna, tidur = false, ekorRef }: { warna: string; tidur?: boolean; ekorRef?: (g: Group | null) => void }) {
  return (
    <group scale={0.9}>
      <mesh position={[0, 0.2, 0]} scale={tidur ? [0.28, 0.17, 0.3] : [0.2, 0.2, 0.32]}>
        <primitive object={GEO_BOLA} attach="geometry" />
        <meshToonMaterial color={warna} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      <group position={tidur ? [0.12, 0.22, 0.24] : [0, 0.42, 0.28]}>
        <mesh scale={0.17}>
          <primitive object={GEO_BOLA} attach="geometry" />
          <meshToonMaterial color={warna} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.09, 0.13, 0]} scale={[0.05, 0.09, 0.05]}>
            <primitive object={GEO_KERUCUT} attach="geometry" />
            <meshToonMaterial color={warna} />
          </mesh>
        ))}
        {!tidur &&
          [-1, 1].map((s) => (
            <mesh key={`m${s}`} position={[s * 0.06, 0.02, 0.15]} scale={0.025}>
              <primitive object={GEO_BOLA} attach="geometry" />
              <meshBasicMaterial color="#2a1d15" />
            </mesh>
          ))}
      </group>
      <group ref={ekorRef} position={[0, 0.24, -0.28]}>
        <mesh position={[0, 0.12, -0.05]} rotation={[-0.5, 0, 0]} scale={[0.05, 0.28, 0.05]}>
          <primitive object={GEO_BOLA} attach="geometry" />
          <meshToonMaterial color={warna} />
        </mesh>
      </group>
    </group>
  );
}

const WARNA_KUCING = ['#ffb36b', '#fffaf2', '#5f6672', '#c48d55', '#3b2a20'];

/** Kucing kampung yang duduk santai, ekornya bergoyang. */
export function KucingKampung() {
  const ekor = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < ekor.current.length; i++) {
      const g = ekor.current[i];
      if (g) g.rotation.z = Math.sin(t * 2.2 + i * 1.7) * 0.5;
    }
  });
  return (
    <group>
      {KUCING_KAMPUNG.map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
          <KucingModel warna={WARNA_KUCING[i % WARNA_KUCING.length]} tidur={i === 3} ekorRef={(g) => (ekor.current[i] = g)} />
        </group>
      ))}
    </group>
  );
}

// ===== Merpati: mematuk di tanah, terbang menjauh saat pemain mendekat, lalu kembali =====
const PER_KAWANAN = 4;
const OFS_BURUNG: [number, number][] = [
  [0, 0],
  [0.7, 0.4],
  [-0.5, 0.6],
  [0.3, -0.7],
];
const RADIUS_KAGET = 3.2;
const LAMA_TERBANG = 2.6; // detik sampai hilang dari pandangan
const LAMA_PERGI = 9; // detik sebelum kembali mendarat
const SK_BADAN = [0.13, 0.11, 0.17] as const;
const SK_KEPALA = 0.07;

export function KawananBurung() {
  const badan = useRef<(Object3D | null)[]>([]);
  const kepala = useRef<(Object3D | null)[]>([]);
  // State per kawanan: waktu sejak kaget (−1 = di tanah) & arah terbang
  const st = useRef(KAWANAN_BURUNG.map(() => ({ t: -1, ax: 1, az: 0 }))).current;

  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05);
    const w = clock.elapsedTime;
    for (let k = 0; k < KAWANAN_BURUNG.length; k++) {
      const [cx, cz] = KAWANAN_BURUNG[k];
      const s = st[k];
      const dx = cx - playerPos.x;
      const dz = cz - playerPos.z;
      const jarak = Math.hypot(dx, dz);
      if (s.t < 0 && jarak < RADIUS_KAGET) {
        // Kaget! terbang menjauhi pemain
        s.t = 0;
        sfxMerpati(); // kepakan sayap
        s.ax = jarak > 0.01 ? dx / jarak : 1;
        s.az = jarak > 0.01 ? dz / jarak : 0;
      } else if (s.t >= 0) {
        s.t += dt;
        if (s.t > LAMA_TERBANG + LAMA_PERGI && jarak > RADIUS_KAGET + 3) s.t = -1; // kembali mendarat
      }
      for (let i = 0; i < PER_KAWANAN; i++) {
        const idx = k * PER_KAWANAN + i;
        const b = badan.current[idx];
        const h = kepala.current[idx];
        if (!b || !h) continue;
        const [ox, oz] = OFS_BURUNG[i];
        if (s.t < 0) {
          // Di tanah: melompat kecil & mematuk bergantian
          const fase = w * 1.3 + idx * 2.1;
          const lompat = Math.max(0, Math.sin(fase * 2)) * 0.05;
          b.position.set(cx + ox, 0.14 + lompat, cz + oz);
          b.rotation.set(0, fase * 0.3, 0);
          b.scale.set(SK_BADAN[0], SK_BADAN[1], SK_BADAN[2]);
          const patuk = Math.max(0, Math.sin(fase * 3.1)) * 0.12;
          h.position.set(cx + ox + Math.sin(b.rotation.y) * 0.13, 0.26 - patuk, cz + oz + Math.cos(b.rotation.y) * 0.13);
          h.scale.setScalar(SK_KEPALA);
        } else if (s.t < LAMA_TERBANG) {
          // Terbang naik melengkung menjauh (sementara — bukan "benda melayang" permanen)
          const u = s.t / LAMA_TERBANG;
          const jauh = u * 9 + i * 0.3;
          const y = 0.14 + Math.sin(u * Math.PI * 0.5) * 6 + i * 0.25;
          const bx = cx + ox + s.ax * jauh;
          const bz = cz + oz + s.az * jauh;
          b.position.set(bx, y, bz);
          b.rotation.set(0, Math.atan2(s.ax, s.az), Math.sin(w * 30 + i) * 0.5);
          h.position.set(bx + s.ax * 0.13, y + 0.1, bz + s.az * 0.13);
          const kecil = 1 - Math.max(0, u - 0.75) * 4; // mengecil di akhir = hilang di kejauhan
          b.scale.set(SK_BADAN[0] * kecil, SK_BADAN[1] * kecil, SK_BADAN[2] * kecil);
          h.scale.setScalar(SK_KEPALA * kecil);
        } else {
          b.scale.setScalar(0);
          h.scale.setScalar(0);
        }
      }
    }
  });

  const n = KAWANAN_BURUNG.length * PER_KAWANAN;
  return (
    <group>
      <Instances limit={n} frustumCulled={false}>
        <primitive object={GEO_BOLA} attach="geometry" />
        <meshToonMaterial color="#b9b4c8" />
        {Array.from({ length: n }, (_, i) => (
          <Instance key={i} ref={(o: unknown) => {
            badan.current[i] = o as Object3D | null;
          }} scale={[0.13, 0.11, 0.17]} />
        ))}
      </Instances>
      <Instances limit={n} frustumCulled={false}>
        <primitive object={GEO_BOLA} attach="geometry" />
        <meshToonMaterial color="#8f8aa3" />
        {Array.from({ length: n }, (_, i) => (
          <Instance key={i} ref={(o: unknown) => {
            kepala.current[i] = o as Object3D | null;
          }} scale={0.07} />
        ))}
      </Instances>
    </group>
  );
}

// ===== Bebek berenang di sungai =====
const PER_ROMBONGAN = 3;
const KAWASAN_KALI = { minX: -200, maxX: 200, minZ: SUNGAI.z - 4, maxZ: SUNGAI.z + 4 };
export function Bebek() {
  const grup = useRef<Group>(null);
  useTampilDekat(grup, KAWASAN_KALI);
  const badan = useRef<(Object3D | null)[]>([]);
  const kepala = useRef<(Object3D | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let k = 0; k < BEBEK.length; k++) {
      const [cx, jang] = BEBEK[k];
      const u = t * (0.9 / jang) + k * 2.3;
      const arah = Math.cos(u) >= 0 ? 1 : -1; // turunan sin(u)
      for (let i = 0; i < PER_ROMBONGAN; i++) {
        const idx = k * PER_ROMBONGAN + i;
        const b = badan.current[idx];
        const h = kepala.current[idx];
        if (!b || !h) continue;
        // Induk di depan, anak-anak berbaris di belakang
        const x = cx + Math.sin(u) * jang - arah * i * 0.7;
        const z = SUNGAI.z + 0.8 - i * 0.15 + Math.sin(t * 0.7 + k) * 0.4;
        const ayun = Math.sin(t * 3 + idx) * 0.02;
        const sk = i === 0 ? 1 : 0.7;
        b.position.set(x, 0.05 + ayun, z);
        b.rotation.set(0, arah > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
        b.scale.set(0.22 * sk, 0.15 * sk, 0.3 * sk);
        h.position.set(x + arah * 0.22 * sk, 0.28 * sk + ayun, z);
        h.scale.setScalar(0.12 * sk);
      }
    }
  });
  const n = BEBEK.length * PER_ROMBONGAN;
  return (
    <group ref={grup}>
      <Instances limit={n} frustumCulled={false}>
        <primitive object={GEO_BOLA} attach="geometry" />
        <meshToonMaterial color="#fffaf2" />
        {Array.from({ length: n }, (_, i) => (
          <Instance key={i} ref={(o: unknown) => {
            badan.current[i] = o as Object3D | null;
          }} />
        ))}
      </Instances>
      <Instances limit={n} frustumCulled={false}>
        <primitive object={GEO_BOLA} attach="geometry" />
        <meshToonMaterial color="#ffe08a" />
        {Array.from({ length: n }, (_, i) => (
          <Instance key={i} ref={(o: unknown) => {
            kepala.current[i] = o as Object3D | null;
          }} />
        ))}
      </Instances>
    </group>
  );
}
