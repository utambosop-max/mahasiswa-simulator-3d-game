import { useMemo, useRef } from 'react';
import { RoundedBox, Instances, Instance } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import type { Group } from 'three';
import { useGame } from '../../game/store';
import { isMalam } from '../../game/sim';
import { perbesar, useTembusPandang } from '../useTembusPandang';
import {
  BANGUNAN,
  BENDERA,
  DUNIA,
  KURSI_WARKOP,
  LAMPU,
  MOTOR,
  NPC_JALUR,
  PITA_JALAN,
  POHON,
  TAMAN,
  kotakBangunan,
  rotasiHadap,
  ukuranLokal,
  type Bangunan,
} from '../../game/duniaLayout';
import { PALETTE, OUTLINE } from '../palette';
import { NPC } from '../NPC';
import { WARGA } from '../../game/m11';
import { Kos } from './bangunan/Kos';
import { Kampus } from './bangunan/Kampus';
import { Warteg } from './bangunan/Warteg';
import { Warkop } from './bangunan/Warkop';
import { Rumah } from './bangunan/Rumah';
import { Toko } from './bangunan/Toko';
import { Fasilitas } from './Fasilitas';
import { LaluLintas } from '../kendaraan/LaluLintas';
import { LampuLalin } from './LampuLalin';
import { GerobakCilok } from './GerobakCilok';
import { MotorModel } from '../kendaraan/Model';
import { Sungai } from './Sungai';
import { GangKos } from './GangKos';
import { SawahKebun } from './SawahKebun';
import { PasarKaget } from './PasarKaget';
import { DetailKampung } from './DetailKampung';
import { Bebek, KawananBurung, KucingKampung } from './Satwa';
import { WargaFiguran } from './WargaFiguran';

const { halfW, halfD, jalan, trotoar, jalanH, jalanV } = DUNIA;

function Tanah() {
  return (
    <group>
      {/* Rumput luas (melewati batas peta agar tidak terlihat "ujung dunia") */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[halfW * 2 + 120, halfD * 2 + 120]} />
        <meshToonMaterial color={PALETTE.rumput} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[(TAMAN.minX + TAMAN.maxX) / 2, -0.01, (TAMAN.minZ + TAMAN.maxZ) / 2]}
        receiveShadow
      >
        <planeGeometry args={[TAMAN.maxX - TAMAN.minX, TAMAN.maxZ - TAMAN.minZ]} />
        <meshToonMaterial color={PALETTE.rumputTua} />
      </mesh>
    </group>
  );
}

/** Potong garis [awal, akhir] menjadi ruas yang tidak melewati persimpangan. */
function ruas(awal: number, akhir: number, potong: readonly number[], celah: number): [number, number][] {
  const titik = [awal, ...potong.flatMap((p) => [p - celah, p + celah]), akhir].sort((a, b) => a - b);
  const hasil: [number, number][] = [];
  for (let i = 0; i < titik.length; i += 2) if (titik[i + 1] - titik[i] > 0.5) hasil.push([titik[i], titik[i + 1]]);
  return hasil;
}

/** Jaringan jalan 3 x 3 lengkap dengan trotoar, marka putus-putus & zebra cross. */
function Jalan() {
  const data = useMemo(() => {
    const trotoarSeg: [number, number, number, number][] = []; // [x, z, w, d]
    const marka: [number, number, number][] = [];
    const tengahTrotoar = jalan + trotoar / 2;
    for (const jz of jalanH) {
      for (const [a, b] of ruas(-halfW, halfW, jalanV, PITA_JALAN)) {
        for (const s of [-1, 1]) trotoarSeg.push([(a + b) / 2, jz + s * tengahTrotoar, b - a, trotoar]);
        for (let x = a + 1; x < b - 1; x += 3) marka.push([x, jz, 0]);
      }
    }
    for (const jx of jalanV) {
      for (const [a, b] of ruas(-halfD, halfD, jalanH, PITA_JALAN)) {
        for (const s of [-1, 1]) trotoarSeg.push([jx + s * tengahTrotoar, (a + b) / 2, trotoar, b - a]);
        for (let z = a + 1; z < b - 1; z += 3) marka.push([jx, z, Math.PI / 2]);
      }
    }
    // Zebra cross di depan kampus & kos (garis memanjang searah orang menyeberang)
    const zebra: [number, number][] = [];
    for (const zx of [16, -12]) for (let i = -1.6; i <= 1.61; i += 0.8) zebra.push([zx + i, 0]);
    return { trotoarSeg, marka, zebra };
  }, []);

  return (
    <group>
      {jalanH.map((jz) => (
        <mesh key={`h${jz}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, jz]} receiveShadow>
          <planeGeometry args={[halfW * 2 + 40, jalan * 2]} />
          <meshToonMaterial color={PALETTE.aspal} />
        </mesh>
      ))}
      {jalanV.map((jx) => (
        <mesh key={`v${jx}`} rotation={[-Math.PI / 2, 0, 0]} position={[jx, 0.006, 0]} receiveShadow>
          <planeGeometry args={[jalan * 2, halfD * 2 + 40]} />
          <meshToonMaterial color={PALETTE.aspal} />
        </mesh>
      ))}
      <Instances limit={data.marka.length}>
        <planeGeometry args={[1.4, 0.18]} />
        <meshBasicMaterial color="#f6f1e6" />
        {data.marka.map(([x, z, r], i) => (
          <Instance key={i} position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, r]} />
        ))}
      </Instances>
      <Instances limit={data.zebra.length}>
        <planeGeometry args={[0.45, jalan * 2 - 0.4]} />
        <meshBasicMaterial color="#fdfaf2" />
        {data.zebra.map(([x, z], i) => (
          <Instance key={i} position={[x, 0.014, z]} rotation={[-Math.PI / 2, 0, 0]} />
        ))}
      </Instances>
      <Instances limit={data.trotoarSeg.length} receiveShadow>
        <boxGeometry args={[1, 0.12, 1]} />
        <meshToonMaterial color={PALETTE.trotoar} />
        {data.trotoarSeg.map(([x, z, w, d], i) => (
          <Instance key={i} position={[x, 0.06, z]} scale={[w, 1, d]} />
        ))}
      </Instances>
    </group>
  );
}

/** Bangunan yang otomatis tembus pandang jika menghalangi kamera. */
function BangunanDunia({ b }: { b: Bangunan }) {
  const ref = useRef<Group>(null);
  const lokal = useMemo(() => ({ ...b, ...ukuranLokal(b) }), [b]);
  // Kotak hampir pas: garis pemain→kamera tetap mengenai dinding saat pemain menempel di belakang gedung,
  // tapi gedung TIDAK memudar saat pemain berdiri di depannya.
  const kotak = useMemo(() => perbesar(kotakBangunan(b), 0.05), [b]);
  useTembusPandang(ref, kotak, b.tinggi);

  return (
    <group ref={ref} position={[b.x, 0, b.z]} rotation={[0, rotasiHadap(b.hadap), 0]}>
      {b.jenis === 'kos' && <Kos b={lokal} />}
      {b.jenis === 'kampus' && <Kampus b={lokal} />}
      {b.jenis === 'warteg' && <Warteg b={lokal} />}
      {b.jenis === 'warkop' && <Warkop b={lokal} />}
      {b.jenis === 'rumah' && <Rumah b={lokal} />}
      {b.jenis === 'toko' && <Toko b={lokal} />}
    </group>
  );
}

// M13: variasi pohon — tiap pohon ke-4 jadi cemara (kerucut bertingkat), warna daun bervariasi per instance.
const POHON_BULAT = POHON.filter((_, i) => i % 4 !== 3);
const POHON_CEMARA = POHON.filter((_, i) => i % 4 === 3);
const WARNA_DAUN = ['#7cc67a', '#8fd18a', '#6bb86e', '#9ad67a', '#74bf86'];

/** Semua pohon digambar dengan Instances (6 draw call untuk ratusan pohon). */
function Pohon() {
  return (
    <group>
      <Instances limit={POHON.length} castShadow>
        <cylinderGeometry args={[0.18, 0.24, 1.4, 8]} />
        <meshToonMaterial color={PALETTE.batang} />
        {POHON.map(([x, z, s], i) => (
          <Instance key={i} position={[x, 0.7 * s, z]} scale={s} />
        ))}
      </Instances>
      <Instances limit={POHON_BULAT.length} castShadow>
        <sphereGeometry args={[1, 12, 10]} />
        <meshToonMaterial />
        {POHON_BULAT.map(([x, z, s], i) => (
          <Instance key={i} position={[x, 2.0 * s, z]} scale={[1.15 * s, 1.0 * s, 1.15 * s]} color={WARNA_DAUN[i % WARNA_DAUN.length]} />
        ))}
      </Instances>
      <Instances limit={POHON_BULAT.length} castShadow>
        <sphereGeometry args={[1, 12, 10]} />
        <meshToonMaterial />
        {POHON_BULAT.map(([x, z, s], i) => (
          <Instance key={i} position={[x + 0.3 * s, 2.75 * s, z + 0.15 * s]} scale={0.7 * s} color={WARNA_DAUN[(i + 2) % WARNA_DAUN.length]} />
        ))}
      </Instances>
      {/* Cemara: dua kerucut bertumpuk */}
      {[
        [1.2, 1.15, 1.9],
        [2.3, 0.8, 1.5],
      ].map(([y, r, h], k) => (
        <Instances key={k} limit={POHON_CEMARA.length} castShadow>
          <coneGeometry args={[r, h, 8]} />
          <meshToonMaterial color={k === 0 ? '#5fae6a' : '#6bb86e'} />
          {POHON_CEMARA.map(([x, z, s], i) => (
            <Instance key={i} position={[x, (y + h / 2) * s, z]} scale={s} />
          ))}
        </Instances>
      ))}
    </group>
  );
}

/** Lampu jalan: bohlam menyala kuning saat malam. */
function LampuJalan() {
  const malam = useGame((s) => isMalam(s.fase));
  return (
    <group>
      <Instances limit={LAMPU.length} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 3.2, 8]} />
        <meshToonMaterial color="#5f6672" />
        {LAMPU.map(([x, z], i) => (
          <Instance key={i} position={[x, 1.6, z]} />
        ))}
      </Instances>
      <Instances limit={LAMPU.length}>
        <sphereGeometry args={[0.26, 12, 10]} />
        <meshBasicMaterial color={malam ? '#ffe08a' : '#fffaf0'} />
        {LAMPU.map(([x, z], i) => (
          <Instance key={i} position={[x, 3.35, z]} />
        ))}
      </Instances>
      {/* Lingkaran cahaya di tanah saat malam (murah, tanpa lampu sungguhan) */}
      {malam && (
        <Instances limit={LAMPU.length}>
          <circleGeometry args={[1.8, 20]} />
          <meshBasicMaterial color="#ffe08a" transparent opacity={0.22} depthWrite={false} />
          {LAMPU.map(([x, z], i) => (
            <Instance key={i} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} />
          ))}
        </Instances>
      )}
    </group>
  );
}

const BUNGA: [number, number, string][] = [
  [19, 11.5, '#ff9aa2'], [19.6, 12.1, '#ffe08a'], [20.2, 11.4, '#bdb2ff'],
  [25, 10.5, '#ff9aa2'], [25.7, 11.1, '#ffd6a5'], [26.2, 10.4, '#ffe08a'],
  [21.5, 17.5, '#bdb2ff'], [22.2, 18.1, '#ff9aa2'], [23, 17.4, '#ffe08a'],
];

function Taman() {
  const { kolam, bangku } = TAMAN;
  return (
    <group>
      <mesh position={[kolam.x, 0.08, kolam.z]} receiveShadow>
        <cylinderGeometry args={[kolam.r + 0.25, kolam.r + 0.35, 0.18, 24]} />
        <meshToonMaterial color={PALETTE.abu} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      <mesh position={[kolam.x, 0.18, kolam.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[kolam.r, 24]} />
        <meshBasicMaterial color="#8fd3ff" />
      </mesh>
      <group position={[bangku.x, 0, bangku.z]} rotation={[0, Math.PI, 0]}>
        <RoundedBox args={[2.2, 0.12, 0.6]} radius={0.04} smoothness={2} position={[0, 0.48, 0]} castShadow>
          <meshToonMaterial color={PALETTE.kayuGelap} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </RoundedBox>
        <RoundedBox args={[2.2, 0.5, 0.1]} radius={0.04} smoothness={2} position={[0, 0.85, -0.28]} castShadow>
          <meshToonMaterial color={PALETTE.kayuGelap} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </RoundedBox>
        {[-0.9, 0.9].map((x) => (
          <mesh key={x} position={[x, 0.22, 0]}>
            <boxGeometry args={[0.12, 0.44, 0.5]} />
            <meshToonMaterial color="#5f6672" />
          </mesh>
        ))}
      </group>
      <Instances limit={BUNGA.length}>
        <sphereGeometry args={[0.18, 8, 6]} />
        <meshToonMaterial />
        {BUNGA.map(([x, z, warna], i) => (
          <Instance key={i} position={[x, 0.2, z]} color={warna} />
        ))}
      </Instances>
    </group>
  );
}

function KursiWarkop() {
  return (
    <group position={[KURSI_WARKOP.x, 0, KURSI_WARKOP.z]}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.08, 16]} />
        <meshToonMaterial color={PALETTE.putih} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.06, 0.12, 0.7, 8]} />
        <meshToonMaterial color={PALETTE.putih} />
      </mesh>
      {[-0.85, 0.85].map((z) => (
        <RoundedBox key={z} args={[0.5, 0.45, 0.5]} radius={0.08} smoothness={2} position={[0, 0.23, z]} castShadow>
          <meshToonMaterial color={z < 0 ? '#e9605a' : '#5a8fe9'} />
        </RoundedBox>
      ))}
    </group>
  );
}

function Bendera() {
  return (
    <group position={[BENDERA.x, 0, BENDERA.z]}>
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 5, 8]} />
        <meshToonMaterial color={PALETTE.putih} />
      </mesh>
      <mesh position={[0.45, 4.6, 0]}>
        <planeGeometry args={[0.9, 0.3]} />
        <meshBasicMaterial color="#e94b4b" side={2} />
      </mesh>
      <mesh position={[0.45, 4.3, 0]}>
        <planeGeometry args={[0.9, 0.3]} />
        <meshBasicMaterial color="#ffffff" side={2} />
      </mesh>
    </group>
  );
}

/** Motor milik pemain saat diparkir (disembunyikan saat sedang dinaiki). */
function MotorKu() {
  const naik = useGame((s) => s.naikMotor);
  const parkir = useGame((s) => s.motorParkir);
  if (naik) return null;
  return (
    <group position={[parkir.x, 0, parkir.z]} rotation={[0, parkir.rotY, 0]}>
      <MotorModel warna="#ffb36b" />
    </group>
  );
}

const WARNA_MOTOR = ['#e9605a', '#5a8fe9', '#7cc6a4', '#bdb2ff'];
/** Dunia luar: Kampung Mahasiswa. */
export function Dunia() {
  return (
    <group>
      <Tanah />
      <Jalan />
      {BANGUNAN.map((b) => (
        <BangunanDunia key={b.id} b={b} />
      ))}
      <Fasilitas />
      <Pohon />
      <LampuJalan />
      <Taman />
      <KursiWarkop />
      {MOTOR.map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
          <MotorModel warna={WARNA_MOTOR[i % WARNA_MOTOR.length]} />
        </group>
      ))}
      <MotorKu />
      <Bendera />
      <LaluLintas />
      <LampuLalin />
      <GerobakCilok />
      {NPC_JALUR.map((n, i) => (
        <NPC key={i} jalur={n.jalur} kecepatan={n.kecepatan} baju={n.baju} kulit={n.kulit} rambut={n.rambut} wargaId={WARGA[i]?.id} />
      ))}
      {/* ===== M13: rombak dunia — area baru & detail kehidupan ===== */}
      <Sungai />
      <GangKos />
      <SawahKebun />
      <PasarKaget />
      <DetailKampung />
      <KucingKampung />
      <KawananBurung />
      <Bebek />
      <WargaFiguran />
    </group>
  );
}
