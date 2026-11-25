import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

const DURASI = 0.55; // detik

/** easeOutBack: naik melewati 1 sedikit (± 1.1) lalu kembali → kesan "membal" (squash & stretch). */
function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

type Props = { kunci: number; position?: [number, number, number]; children: ReactNode };

/**
 * Pembungkus perabot: saat `kunci` (level) berubah, isi "pop" dari kecil → sedikit kebesaran → normal.
 * Tidak beranimasi saat kamar pertama kali dimuat.
 */
export function PopUpgrade({ kunci, position, children }: Props) {
  const ref = useRef<Group>(null);
  const kunciLama = useRef(kunci);
  const waktu = useRef(-1); // -1 = tidak sedang animasi

  // useLayoutEffect → skala diset 0 sebelum frame pertama digambar (tanpa "kedip" ukuran penuh)
  useLayoutEffect(() => {
    if (kunci === kunciLama.current) return;
    kunciLama.current = kunci;
    waktu.current = 0;
    ref.current?.scale.setScalar(0.001);
  }, [kunci]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g || waktu.current < 0) return;
    waktu.current += dt;
    const p = Math.min(1, waktu.current / DURASI);
    g.scale.setScalar(Math.max(0.001, easeOutBack(p)));
    if (p >= 1) waktu.current = -1;
  });

  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}
