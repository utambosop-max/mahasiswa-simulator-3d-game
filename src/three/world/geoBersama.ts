// Geometri bersama untuk dekor dunia (dibuat SEKALI saat modul dimuat, dipakai ulang oleh banyak Instances).
// Dipasang lewat <primitive object={...} attach="geometry" /> — R3F tidak membuang (dispose) primitive,
// jadi aman dipakai berkali-kali walau komponennya dilepas-pasang saat pindah scene.
import { BoxGeometry, ConeGeometry, CylinderGeometry, PlaneGeometry, SphereGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Kotak membulat 1×1×1 (diskalakan per instance). */
export const GEO_KOTAK_BULAT = new RoundedBoxGeometry(1, 1, 1, 2, 0.08);
/** Kotak biasa 1×1×1. */
export const GEO_KOTAK = new BoxGeometry(1, 1, 1);
/**
 * Atap limas 1×1 (alas persegi, tinggi 1, alas di y = 0). Sudah diputar 45° di geometri,
 * jadi aman diskalakan tidak seragam per instance (tidak berubah jadi belah ketupat).
 */
export const GEO_ATAP = (() => {
  const g = new ConeGeometry(Math.SQRT1_2 * 1.1, 1, 4);
  g.rotateY(Math.PI / 4);
  g.translate(0, 0.5, 0);
  return g;
})();
/** Silinder tinggi 1 (alas di y = 0). */
export const GEO_SILINDER = (() => {
  const g = new CylinderGeometry(0.5, 0.5, 1, 8);
  g.translate(0, 0.5, 0);
  return g;
})();
/** Silinder tinggi 1 berpusat (untuk kabel/tali yang diputar). */
export const GEO_BATANG = new CylinderGeometry(0.5, 0.5, 1, 6);
/** Bola segmen rendah. */
export const GEO_BOLA = new SphereGeometry(1, 10, 8);
/** Bidang 1×1 tegak (menghadap +z). */
export const GEO_BIDANG = new PlaneGeometry(1, 1);
/** Bidang 1×1 rebah di tanah. */
export const GEO_LANTAI = (() => {
  const g = new PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  return g;
})();
/** Kerucut 1 (alas di y = 0) — pohon cemara, tumpeng padi, dsb. */
export const GEO_KERUCUT = (() => {
  const g = new ConeGeometry(1, 1, 7);
  g.translate(0, 0.5, 0);
  return g;
})();
/** Daun panjang (kelapa/pisang): pangkal di titik asal, menjulur ke +z. */
export const GEO_DAUN = (() => {
  const g = new BoxGeometry(0.42, 0.05, 1);
  g.translate(0, 0, 0.5);
  return g;
})();
