// Pengukur khusus mode dev (tidak aktif di build produksi): menaruh renderer, scene & kamera di
// window.__tiga agar skrip tes (scripts/uji/drawcall.mjs) bisa membaca draw call & menghitung mesh.
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export function PengukurDev() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __tiga?: unknown };
    w.__tiga = { gl, scene, camera };
    return () => {
      w.__tiga = undefined;
    };
  }, [gl, scene, camera]);
  return null;
}
