import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { playerPos } from '../game/playerPos';
import { F2 } from '../game/sim';
import { useGame } from '../game/store';
import { pacarNpc, wargaDari } from '../game/m11';
import { slotWarga, wargaDiajak } from '../game/posisiWarga';
import type { Group } from 'three';
import { Chibi } from './characters/Chibi';

type Props = {
  jalur: readonly [number, number][];
  kecepatan: number;
  baju: string;
  kulit: string;
  rambut: string;
  /** Warga bernama (fitur3.json → warga): bisa diajak ngobrol, berteman, pacaran */
  wargaId?: string;
};

const selisihSudut = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/** Warga chibi yang berjalan mengikuti titik-titik jalur (bolak-balik/berputar). */
export function NPC({ jalur, kecepatan, baju, kulit, rambut, wargaId }: Props) {
  const ref = useRef<Group>(null);
  const bergerak = useRef(true);
  const st = useRef({ x: jalur[0][0], z: jalur[0][1], idx: 1, arah: 1, jeda: 0 });
  const [sapa, setSapa] = useState<string | null>(null);
  const jedaSapa = useRef(0);
  const w = wargaId ? wargaDari(wargaId) : null;
  // Posisi dibagikan ke pemain (deteksi warga terdekat); slot dibuat sekali
  const slot = useRef(wargaId ? slotWarga(wargaId) : null).current;
  const pacar = useGame((s) => (wargaId ? pacarNpc(s, wargaId) : false));
  const didekati = useGame((s) => !!wargaId && s.dekat === `warga:${wargaId}`);
  useEffect(() => {
    if (!slot) return;
    slot.aktif = true;
    return () => {
      slot.aktif = false;
    };
  }, [slot]);

  useFrame((_, raw) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(raw, 0.05);
    const s = st.current;
    if (slot) {
      slot.x = s.x;
      slot.z = s.z;
    }

    // Sedang diajak ngobrol pemain → berhenti & menghadap pemain
    if (wargaId && wargaDiajak.id === wargaId) {
      bergerak.current = false;
      const target = Math.atan2(playerPos.x - s.x, playerPos.z - s.z);
      g.rotation.y += selisihSudut(g.rotation.y, target) * Math.min(1, dt * 8);
      return;
    }

    // Sesekali berhenti sejenak di ujung jalur
    if (s.jeda > 0) {
      s.jeda -= dt;
      bergerak.current = false;
      return;
    }
    bergerak.current = true;

    const [tx, tz] = jalur[s.idx];
    const dx = tx - s.x;
    const dz = tz - s.z;
    const jarak = Math.hypot(dx, dz);
    const langkah = kecepatan * dt;
    if (jarak <= langkah) {
      s.x = tx;
      s.z = tz;
      // Jalur 2 titik = bolak-balik; lebih dari 2 = berputar
      if (jalur.length === 2) s.idx = s.idx === 1 ? 0 : 1;
      else s.idx = (s.idx + 1) % jalur.length;
      s.jeda = 0.6 + Math.random() * 1.2;
    } else {
      s.x += (dx / jarak) * langkah;
      s.z += (dz / jarak) * langkah;
      const target = Math.atan2(dx, dz);
      g.rotation.y += selisihSudut(g.rotation.y, target) * Math.min(1, dt * 8);
    }
    g.position.set(s.x, 0, s.z);

    // Menyapa saat pemain lewat dekat (maks 1× per 15 detik per warga)
    const now = performance.now();
    if (!sapa && now > jedaSapa.current && Math.hypot(playerPos.x - s.x, playerPos.z - s.z) < 3) {
      jedaSapa.current = now + 15000;
      setSapa(pacar ? '💕 Hai sayang!' : F2.sapaWarga[Math.floor(Math.random() * F2.sapaWarga.length)]);
      setTimeout(() => setSapa(null), 2800);
    }
  });

  return (
    <group ref={ref} position={[jalur[0][0], 0, jalur[0][1]]}>
      <Chibi bergerak={bergerak} baju={baju} kulit={kulit} rambut={rambut} gaya={w?.gaya} />
      {(sapa || didekati) && (
        <Html position={[0, 2.05, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className="anim-datang rounded-2xl border-2 border-white bg-white/95 px-2 py-0.5 text-xs font-extrabold whitespace-nowrap text-amber-900 shadow">
            {didekati && w ? `${pacar ? '💞' : w.ikon} ${w.nama}` : sapa}
          </div>
        </Html>
      )}
    </group>
  );
}
