// M13: detail kehidupan kampung — tiang listrik + kabel (+ layangan nyangkut & burung), jemuran, pot, tong sampah,
// semak, bunga, bangku, motor parkir, spanduk, mural, warung kecil, pohon kelapa. Objek berulang = Instances.
import { useEffect, useMemo } from 'react';
import { Instance, Instances } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import { CanvasTexture, SRGBColorSpace, type BufferGeometry, type EulerOrder } from 'three';
import { useGame } from '../../game/store';
import { isMalam } from '../../game/sim';
import {
  BANGKU,
  BUNGA_LIAR,
  JEMURAN,
  KABEL,
  LAYANGAN,
  MOTOR_TAMBAHAN,
  MURAL,
  POHON_KELAPA,
  POT,
  SEMAK,
  SPANDUK,
  TIANG_LISTRIK,
  TONG,
  WARUNG,
  WARUNG_UKURAN,
  lokalKeDunia,
  rotasiHadap,
  tiangSpanduk,
  type Warung,
} from '../../game/duniaLayout';
import { PALETTE, OUTLINE } from '../palette';
import { usePapan } from '../usePapan';
import { MotorModel } from '../kendaraan/Model';
import { GEO_BATANG, GEO_BIDANG, GEO_BOLA, GEO_DAUN, GEO_KOTAK, GEO_KOTAK_BULAT, GEO_SILINDER } from './geoBersama';

const TINGGI_TIANG = 6.2;
const Y_KABEL = 5.75;
const WARNA_BAJU = ['#ff9aa2', '#a0c4ff', '#fffaf2', '#ffe08a', '#caffbf', '#bdb2ff', '#e9605a'];
const WARNA_BUNGA = ['#ff9aa2', '#ffe08a', '#bdb2ff', '#fffaf2'];
const WARNA_MOTOR = ['#e9605a', '#5a8fe9', '#7cc6a4', '#bdb2ff', '#ffb36b', '#3b2a20'];

/** Rotasi Euler (urutan YZX) agar silinder tegak menjadi mendatar searah (dx, dz). */
const arahDatar = (dx: number, dz: number): [number, number, number, 'YZX'] => [0, Math.atan2(-dz, dx), Math.PI / 2, 'YZX'];

type Rot = [number, number, number, EulerOrder];
type Item = { p: [number, number, number]; r: Rot; s: [number, number, number]; c: string };
const R0: Rot = [0, 0, 0, 'XYZ'];
const ry = (y: number): Rot => [0, y, 0, 'XYZ'];

/**
 * Semua dekor kecil di seluruh kota DIGABUNG per bentuk geometri (silinder, kotak, kotak bulat, bola, kabel):
 * warna dibedakan per instance. Hasilnya ± 7 draw call untuk ratusan benda (dulu ± 21).
 */
function useDekorGabung() {
  return useMemo(() => {
    const silinder: Item[] = [];
    const kotakB: Item[] = [];
    const kotakBulat: Item[] = [];
    const bola: Item[] = [];
    const kabel: Item[] = [];
    const bidang: Item[] = [];

    // --- Tiang listrik, palang, trafo, kabel, burung hinggap, layangan nyangkut ---
    TIANG_LISTRIK.forEach(([x, z, r], i) => {
      silinder.push({ p: [x, 0, z], r: R0, s: [0.17, TINGGI_TIANG, 0.17], c: '#9aa3ad' });
      kotakB.push({ p: [x, Y_KABEL + 0.05, z], r: ry(r), s: [0.08, 0.08, 1.0], c: '#5f6672' });
      if (i % 4 === 1) kotakBulat.push({ p: [x, 4.6, z], r: R0, s: [0.45, 0.6, 0.45], c: '#b8c2cc' });
    });
    KABEL.forEach(([x1, z1, x2, z2], i) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const L = Math.hypot(dx, dz);
      const px = (-dz / L) * 0.4;
      const pz = (dx / L) * 0.4;
      for (const s of [-1, 1]) kabel.push({ p: [(x1 + x2) / 2 + s * px, Y_KABEL - (s > 0 ? 0.05 : 0), (z1 + z2) / 2 + s * pz], r: arahDatar(dx, dz), s: [0.035, L, 0.035], c: '#3b2a20' });
      // Burung hinggap di kabel (duduk di atas kabel, bukan melayang)
      if (i % 3 === 0) for (const t of [0.34, 0.41, 0.63]) bola.push({ p: [x1 + dx * t + px, Y_KABEL + 0.1, z1 + dz * t + pz], r: R0, s: [0.09, 0.1, 0.12], c: '#6b6f7d' });
    });
    LAYANGAN.forEach((idx, k) => {
      const kb = KABEL[idx];
      if (!kb) return;
      const x = kb[0] + (kb[2] - kb[0]) * 0.55;
      const z = kb[1] + (kb[3] - kb[1]) * 0.55;
      bidang.push({ p: [x, Y_KABEL - 0.45, z], r: [0, Math.PI / 4, Math.PI / 4 + 0.25, 'YXZ'], s: [0.55, 0.55, 1], c: ['#e9605a', '#ffe08a', '#7fb3e0'][k % 3] });
      bidang.push({ p: [x, Y_KABEL - 1.1, z], r: [0, Math.PI / 4, 0.25, 'YXZ'], s: [0.06, 0.75, 1], c: '#fffaf2' });
    });

    // --- Jemuran: tiang, tali, baju warna-warni ---
    JEMURAN.forEach(([x, z, r], i) => {
      for (const lx of [-1.1, 1.1]) {
        const [tx, tz] = lokalKeDunia(x, z, r, lx, 0);
        silinder.push({ p: [tx, 0, tz], r: R0, s: [0.06, 1.8, 0.06], c: PALETTE.kayuGelap });
      }
      kabel.push({ p: [x, 1.72, z], r: [0, r, Math.PI / 2, 'YZX'], s: [0.02, 2.2, 0.02], c: '#5f6672' });
      [-0.65, 0, 0.6].forEach((lx, k) => {
        const [bx, bz] = lokalKeDunia(x, z, r, lx, 0);
        const t = k === 1 ? 0.7 : 0.5;
        kotakB.push({ p: [bx, 1.68 - t / 2, bz], r: ry(r), s: [0.48, t, 0.03], c: WARNA_BAJU[(i * 3 + k) % WARNA_BAJU.length] });
      });
    });

    // --- Pot, tong sampah, semak, bunga liar ---
    POT.forEach(([x, z, v], i) => {
      silinder.push({ p: [x, 0, z], r: R0, s: [0.4, 0.36, 0.4], c: '#d0794f' });
      bola.push({ p: [x, 0.55, z], r: R0, s: [0.3, 0.32, 0.3], c: ['#7cc67a', '#6bb86e', '#8fd18a'][v % 3] });
      bola.push({ p: [x + 0.1, 0.78, z + 0.08], r: R0, s: [0.09, 0.09, 0.09], c: WARNA_BUNGA[(i + v) % WARNA_BUNGA.length] });
    });
    TONG.forEach(([x, z, v]) => {
      silinder.push({ p: [x, 0, z], r: R0, s: [0.42, 0.72, 0.42], c: v ? '#7cc6a4' : '#ffb36b' });
      silinder.push({ p: [x, 0.72, z], r: R0, s: [0.47, 0.07, 0.47], c: '#5f6672' });
    });
    SEMAK.forEach(([x, z, s], i) => {
      bola.push({ p: [x, 0.35 * s, z], r: R0, s: [0.55 * s, 0.45 * s, 0.55 * s], c: PALETTE.daun[i % 3] });
      bola.push({ p: [x + 0.3 * s, 0.25 * s, z + 0.2 * s], r: R0, s: [0.35 * s, 0.35 * s, 0.35 * s], c: PALETTE.daun[(i + 1) % 3] });
    });
    BUNGA_LIAR.forEach(([x, z, v]) => bola.push({ p: [x, 0.16, z], r: R0, s: [0.14, 0.14, 0.14], c: WARNA_BUNGA[v % WARNA_BUNGA.length] }));

    // --- Bangku kayu: dudukan, sandaran, 2 kaki ---
    BANGKU.forEach(([x, z, r]) => {
      kotakBulat.push({ p: [x, 0.45, z], r: ry(r), s: [2.0, 0.12, 0.55], c: PALETTE.kayuGelap });
      const [bx, bz] = lokalKeDunia(x, z, r, 0, -0.24);
      kotakBulat.push({ p: [bx, 0.8, bz], r: ry(r), s: [2.0, 0.4, 0.08], c: PALETTE.kayuGelap });
      for (const lx of [-0.85, 0.85]) {
        const [kx, kz] = lokalKeDunia(x, z, r, lx, 0);
        kotakBulat.push({ p: [kx, 0.2, kz], r: ry(r), s: [0.1, 0.4, 0.45], c: '#7a4a2a' });
      }
    });
    return { silinder, kotakB, kotakBulat, bola, kabel, bidang };
  }, []);
}

/** Satu Instances dari daftar Item. */
function Kumpulan({ geo, items, basic = false, dua = false }: { geo: BufferGeometry; items: Item[]; basic?: boolean; dua?: boolean }) {
  return (
    <Instances limit={items.length}>
      <primitive object={geo} attach="geometry" />
      {basic ? <meshBasicMaterial side={dua ? 2 : 0} /> : <meshToonMaterial side={dua ? 2 : 0} />}
      {items.map((it, i) => (
        <Instance key={i} position={it.p} rotation={it.r} scale={it.s} color={it.c} />
      ))}
    </Instances>
  );
}

function DekorGabung() {
  const d = useDekorGabung();
  return (
    <group>
      <Kumpulan geo={GEO_SILINDER} items={d.silinder} />
      <Kumpulan geo={GEO_KOTAK} items={d.kotakB} />
      <Kumpulan geo={GEO_KOTAK_BULAT} items={d.kotakBulat} />
      <Kumpulan geo={GEO_BOLA} items={d.bola} />
      <Kumpulan geo={GEO_BATANG} items={d.kabel} basic />
      <Kumpulan geo={GEO_BIDANG} items={d.bidang} dua />
    </group>
  );
}

function PohonKelapa() {
  const data = useMemo(
    () =>
      POHON_KELAPA.map(([x, z, s], i) => {
        const miring = 0.12 + (i % 3) * 0.06;
        const h = 5 * s;
        const arah = (i * 2.4) % (Math.PI * 2); // arah condong batang
        const top: [number, number, number] = [x + Math.sin(arah) * Math.sin(miring) * h, Math.cos(miring) * h, z + Math.cos(arah) * Math.sin(miring) * h];
        return { x, z, s, h, miring, arah, top };
      }),
    [],
  );
  return (
    <group>
      <Instances limit={data.length} castShadow>
        <primitive object={GEO_SILINDER} attach="geometry" />
        <meshToonMaterial color="#b98a5e" />
        {data.map((p, i) => (
          <Instance key={i} position={[p.x, 0, p.z]} rotation={[p.miring, p.arah, 0, 'YXZ']} scale={[0.26 * p.s, p.h, 0.26 * p.s]} />
        ))}
      </Instances>
      <Instances limit={data.length * 6}>
        <primitive object={GEO_DAUN} attach="geometry" />
        <meshToonMaterial color="#6bb86e" />
        {data.flatMap((p, i) =>
          [0, 1, 2, 3, 4, 5].map((k) => <Instance key={`${i}-${k}`} position={p.top} rotation={[0.35, (k / 6) * Math.PI * 2 + i, 0, 'YXZ']} scale={[1.3 * p.s, 1, 2.3 * p.s]} />),
        )}
      </Instances>
      <Instances limit={data.length * 2}>
        <primitive object={GEO_BOLA} attach="geometry" />
        <meshToonMaterial color="#8a6a3a" />
        {data.flatMap((p, i) =>
          [-1, 1].map((s) => <Instance key={`${i}${s}`} position={[p.top[0] + s * 0.18, p.top[1] - 0.2, p.top[2] + 0.1]} scale={0.16 * p.s} />),
        )}
      </Instances>
    </group>
  );
}

function Spanduk({ s }: { s: (typeof SPANDUK)[number] }) {
  const tex = usePapan(s.teks, s.bg, '#ffffff', 768, 128);
  const tiang = tiangSpanduk(s);
  return (
    <group>
      {tiang.map(([x, z], i) => (
        <mesh key={i} position={[x, 0, z]} scale={[0.09, 2.9, 0.09]} castShadow>
          <primitive object={GEO_SILINDER} attach="geometry" />
          <meshToonMaterial color="#c9a46b" />
        </mesh>
      ))}
      <mesh position={[s.x, 2.35, s.z]} rotation={[0, s.rotY, 0]} scale={[s.lebar - 0.1, 0.62, 1]}>
        <primitive object={GEO_BIDANG} attach="geometry" />
        <meshBasicMaterial map={tex} side={2} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Tekstur mural dibuat lewat kode (tanpa file gambar): bentuk pastel + tulisan. */
function useMural(tema: number, lebar: number) {
  const tex = useMemo(() => {
    const W = 768;
    const H = Math.round((768 / lebar) * 2.1);
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    if (g) {
      const latar = tema === 0 ? ['#bfe6ff', '#ffe9dc'] : ['#c9f2e0', '#fff1c4'];
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, latar[0]);
      grad.addColorStop(1, latar[1]);
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      // Matahari & gunung kartun
      g.fillStyle = '#ffd36b';
      g.beginPath();
      g.arc(W * 0.82, H * 0.3, H * 0.18, 0, Math.PI * 2);
      g.fill();
      const gunung = tema === 0 ? ['#7cc6a4', '#a6d785'] : ['#7fb3e0', '#bdb2ff'];
      gunung.forEach((w, i) => {
        g.fillStyle = w;
        g.beginPath();
        g.moveTo(W * (0.05 + i * 0.3), H);
        g.lineTo(W * (0.28 + i * 0.3), H * 0.35);
        g.lineTo(W * (0.55 + i * 0.3), H);
        g.fill();
      });
      // Gelembung warna-warni
      ['#ff9aa2', '#ffb36b', '#e9605a', '#ffe08a'].forEach((w, i) => {
        g.fillStyle = w;
        g.beginPath();
        g.arc(W * (0.1 + i * 0.12), H * (0.22 + (i % 2) * 0.12), H * 0.07, 0, Math.PI * 2);
        g.fill();
      });
      g.font = `900 ${Math.round(H * 0.2)}px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 10;
      g.strokeStyle = '#3b2a20';
      const teks = tema === 0 ? 'KAMPUNG MAHASISWA' : 'SEMANGAT SKRIPSI!';
      g.strokeText(teks, W / 2, H * 0.62);
      g.fillStyle = '#fffaf2';
      g.fillText(teks, W / 2, H * 0.62);
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [tema, lebar]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function Mural({ m }: { m: (typeof MURAL)[number] }) {
  const tex = useMural(m.tema, m.lebar);
  return (
    <group position={[m.x, 0, m.z]} rotation={[0, m.rotY, 0]}>
      <mesh position={[0, 1.15, 0]} scale={[m.lebar, 2.3, 0.25]} castShadow receiveShadow>
        <primitive object={GEO_KOTAK_BULAT} attach="geometry" />
        <meshToonMaterial color="#f4e1c1" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      <mesh position={[0, 1.15, 0.14]} scale={[m.lebar - 0.3, 2.0, 1]}>
        <primitive object={GEO_BIDANG} attach="geometry" />
        <meshToonMaterial map={tex} />
      </mesh>
    </group>
  );
}

function WarungKecil({ w, malam }: { w: Warung; malam: boolean }) {
  const papan = usePapan(w.teks, w.atap);
  const { w: lw, d } = WARUNG_UKURAN;
  return (
    <group position={[w.x, 0, w.z]} rotation={[0, rotasiHadap(w.hadap), 0]}>
      <mesh position={[0, 1.2, -0.2]} scale={[lw, 2.4, d - 0.4]} castShadow receiveShadow>
        <primitive object={GEO_KOTAK_BULAT} attach="geometry" />
        <meshToonMaterial color={w.warna} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      {/* Bukaan etalase (gelap) + rak toples */}
      <mesh position={[0, 1.35, d / 2 - 0.39]} scale={[lw - 0.6, 0.9, 1]}>
        <primitive object={GEO_BIDANG} attach="geometry" />
        <meshBasicMaterial color={malam ? '#ffd877' : '#6b4430'} toneMapped={false} />
      </mesh>
      {[-0.9, -0.45, 0, 0.45, 0.9].map((x, i) => (
        <mesh key={x} position={[x, 0.98, d / 2 - 0.25]} scale={[0.17, 0.2, 0.17]}>
          <primitive object={GEO_SILINDER} attach="geometry" />
          <meshToonMaterial color={['#ffe08a', '#ff9aa2', '#a8e6cf', '#ffb36b', '#bfe6ff'][i]} />
        </mesh>
      ))}
      {/* Kanopi miring */}
      <mesh position={[0, 2.45, d / 2 - 0.05]} rotation={[0.35, 0, 0]} scale={[lw + 0.4, 0.08, 1.1]} castShadow>
        <primitive object={GEO_KOTAK_BULAT} attach="geometry" />
        <meshToonMaterial color={w.atap} />
      </mesh>
      <mesh position={[0, 2.85, d / 2 - 0.45]} scale={[lw - 0.2, 0.5, 1]}>
        <primitive object={GEO_BIDANG} attach="geometry" />
        <meshBasicMaterial map={papan} toneMapped={false} />
      </mesh>
      {/* Bangku panjang depan warung */}
      <mesh position={[0, 0.42, d / 2 + 0.45]} scale={[lw - 0.4, 0.1, 0.4]}>
        <primitive object={GEO_KOTAK_BULAT} attach="geometry" />
        <meshToonMaterial color={PALETTE.kayuGelap} />
      </mesh>
    </group>
  );
}

export function DetailKampung() {
  const malam = useGame((s) => isMalam(s.fase));
  return (
    <group>
      <DekorGabung />
      <PohonKelapa />
      {SPANDUK.map((s) => (
        <Spanduk key={`${s.x},${s.z}`} s={s} />
      ))}
      {MURAL.map((m) => (
        <Mural key={`${m.x},${m.z}`} m={m} />
      ))}
      {WARUNG.map((w) => (
        <WarungKecil key={w.teks} w={w} malam={malam} />
      ))}
      {MOTOR_TAMBAHAN.map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
          <MotorModel warna={WARNA_MOTOR[i % WARNA_MOTOR.length]} />
        </group>
      ))}
    </group>
  );
}
