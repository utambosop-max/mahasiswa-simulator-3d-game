// Material & geometri BERSAMA (cache per warna/ukuran) untuk objek yang muncul berkali-kali (chibi, rambut).
// Puluhan warga berbaju sama memakai 1 objek material yang sama → renderer tidak perlu ganti state/program
// berulang kali, dan memori GPU tidak membengkak. Jangan mengubah (mutasi) material dari cache ini!
import { BufferAttribute, BufferGeometry, Color, Matrix4, MeshBasicMaterial, MeshToonMaterial, Euler, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const toonCache = new Map<string, MeshToonMaterial>();
const basicCache = new Map<string, MeshBasicMaterial>();

/** Material toon bersama untuk satu warna. */
export function toon(warna: string): MeshToonMaterial {
  let m = toonCache.get(warna);
  if (!m) {
    m = new MeshToonMaterial({ color: warna });
    toonCache.set(warna, m);
  }
  return m;
}

/** Material basic (tidak kena cahaya) bersama; `opasitas` < 1 = transparan tanpa tulis kedalaman. */
export function basic(warna: string, opasitas = 1): MeshBasicMaterial {
  const kunci = `${warna}|${opasitas}`;
  let m = basicCache.get(kunci);
  if (!m) {
    m = new MeshBasicMaterial({ color: warna });
    if (opasitas < 1) {
      m.transparent = true;
      m.opacity = opasitas;
      m.depthWrite = false;
    }
    basicCache.set(kunci, m);
  }
  return m;
}

const geoCache = new Map<string, BufferGeometry>();
/** Geometri bersama berdasarkan kunci (dibuat sekali lewat `buat`). */
export function geoBersama<T extends BufferGeometry>(kunci: string, buat: () => T): T {
  let g = geoCache.get(kunci);
  if (!g) {
    g = buat();
    geoCache.set(kunci, g);
  }
  return g as T;
}

type Bagian = {
  geo: BufferGeometry;
  pos?: [number, number, number];
  rot?: [number, number, number];
  skala?: [number, number, number];
  /** Warna per-verteks (untuk bagian berbeda warna yang digabung; pakai material vertexColors). */
  warna?: string;
};

const toonVC = new MeshToonMaterial({ color: '#ffffff', vertexColors: true });
const basicVC = new MeshBasicMaterial({ color: '#ffffff', vertexColors: true });
/** Material bersama untuk geometri gabungan berwarna per-verteks (lihat `gabung` + `warna`). */
export const toonWarnaVerteks = () => toonVC;
export const basicWarnaVerteks = () => basicVC;
const _c = new Color();
const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();
/**
 * Gabung beberapa potongan (posisi/rotasi/skala masing-masing) jadi SATU geometri → 1 draw call.
 * Dipakai untuk bagian bermaterial sama yang tidak bergerak sendiri-sendiri (mis. 2 mata, 4 kilau mata).
 */
export function gabung(bagian: Bagian[]): BufferGeometry {
  const pakaiWarna = bagian.some((b) => b.warna);
  const daftar = bagian.map(({ geo, pos = [0, 0, 0], rot = [0, 0, 0], skala = [1, 1, 1], warna }) => {
    _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]));
    _m.compose(_p.set(pos[0], pos[1], pos[2]), _q, _s.set(skala[0], skala[1], skala[2]));
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    g.applyMatrix4(_m);
    if (pakaiWarna) {
      // Warna hex → nilai linear (three mengelola ruang warna; atribut warna dianggap linear)
      _c.set(warna ?? '#ffffff');
      const n = g.getAttribute('position').count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = _c.r;
        arr[i * 3 + 1] = _c.g;
        arr[i * 3 + 2] = _c.b;
      }
      g.setAttribute('color', new BufferAttribute(arr, 3));
    }
    return g;
  });
  const hasil = mergeGeometries(daftar, false);
  daftar.forEach((g) => g.dispose());
  bagian.forEach((b) => b.geo.dispose());
  if (!hasil) throw new Error('gabung: atribut geometri tidak cocok');
  return hasil;
}
