import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Outlines } from './lod/Outlines';
import type { Group } from 'three';
import { useGame } from '../game/store';
import { ID_MOTOR, daftarInteraksi, type InteraksiDef } from '../game/interaksi';
import type { Lokasi } from '../game/sim';
import { playerPos } from '../game/playerPos';
import { PALETTE, OUTLINE } from './palette';

/** Jarak maksimum penanda terlihat di dunia luar (agar tidak ada "benda melayang" jauh di mana-mana). */
const JARAK_TAMPIL = 14;

/**
 * Panah penunjuk di atas objek yang bisa dipakai: batang + mata panah kuning cerah yang menunjuk ke bawah.
 * Tidak terkena kabut (selalu jelas), membal pelan, membesar & oranye saat pemain dekat.
 * Di dunia luar hanya muncul jika pemain dalam radius 14 m.
 */
function PanahMelayang({ def, urutan, skala, luar }: { def: InteraksiDef; urutan: number; skala: number; luar: boolean }) {
  const dekat = useGame((s) => s.dekat === def.id);
  const sembunyi = useGame((s) => def.id === ID_MOTOR && s.naikMotor);
  const ref = useRef<Group>(null);

  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    if (def.dinamis) {
      // Motor pemain: panah mengikuti posisi parkir terbaru
      const p = useGame.getState().motorParkir;
      g.position.x = p.x;
      g.position.z = p.z;
    }
    const jauh = luar && Math.hypot(g.position.x - playerPos.x, g.position.z - playerPos.z) > JARAK_TAMPIL;
    g.visible = !sembunyi && !jauh;
    if (!g.visible) return;
    const t = clock.getElapsedTime();
    g.position.y = def.penanda[1] + 0.15 * skala + Math.abs(Math.sin(t * 3 + urutan)) * 0.12 * skala;
    const target = (dekat ? 1.3 : 0.9) * skala;
    g.scale.setScalar(g.scale.x + (target - g.scale.x) * Math.min(1, dt * 10));
  });

  const warna = dekat ? PALETTE.oranye : PALETTE.mentega;
  return (
    <group ref={ref} position={def.penanda}>
      {/* Mata panah (menunjuk ke bawah) */}
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.16, 0.24, 12]} />
        <meshBasicMaterial color={warna} fog={false} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      {/* Batang panah */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.22, 10]} />
        <meshBasicMaterial color={warna} fog={false} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
    </group>
  );
}

export function Penanda({ lokasi }: { lokasi: Lokasi }) {
  const skala = lokasi === 'dunia' ? 2 : 1; // di luar kamera lebih jauh → panah lebih besar
  // Objek bersyarat (akuarium, pot tanaman) hanya diberi panah jika sudah ada
  // Selector berupa teks → komponen hanya di-render ulang jika daftar objek yang tampil berubah
  const gedung = useGame((s) => s.gedung);
  const daftar = daftarInteraksi(lokasi, gedung);
  const tampil = useGame((s) =>
    daftarInteraksi(lokasi, s.gedung)
      .filter((d) => !d.tanpaPenanda && (!d.syarat || d.syarat(s)))
      .map((d) => d.id)
      .join(','),
  ).split(',');
  return (
    <>
      {daftar.filter((d) => tampil.includes(d.id)).map((def, i) => (
        <PanahMelayang key={def.id} def={def} urutan={i} skala={skala} luar={lokasi === 'dunia'} />
      ))}
    </>
  );
}
