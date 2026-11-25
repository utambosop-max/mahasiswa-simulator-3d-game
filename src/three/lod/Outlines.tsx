// Pengganti <Outlines> drei (API sama: thickness, color, opacity, transparent, angle, renderOrder).
// Alasan (BUG-01 QA M13): drei Outlines membuat geometri "creased normals" baru tiap mount, tetapi saat unmount
// ref-nya sudah null (React 19) sehingga geometri itu TIDAK PERNAH di-dispose → renderer.info.memory.geometries
// naik terus setiap keluar/masuk kos & tiap LOD berganti.
// Versi ini:
// - geometri garis disimpan di cache per geometri sumber + hitungan pemakai; di-dispose saat pemakai terakhir lepas
//   (chibi yang memakai geometri bersama cukup 1 geometri garis untuk semua);
// - material garis dipakai bersama per kombinasi warna/tebal (jumlahnya kecil & tetap);
// - grup ditangkap di closure efek, jadi pembersihan tetap jalan walau ref sudah null.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { BackSide, BufferGeometry, Color, Group, InstancedMesh, Mesh, ShaderMaterial, Vector2 } from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Shader sama persis dengan drei core/Outlines.js (three ≥ 154)
const BahanGaris = shaderMaterial(
  { screenspace: false, color: new Color('black'), opacity: 1, thickness: 0.05, size: new Vector2() },
  `#include <common>
   #include <morphtarget_pars_vertex>
   #include <skinning_pars_vertex>
   #include <clipping_planes_pars_vertex>
   uniform float thickness;
   uniform bool screenspace;
   uniform vec2 size;
   void main() {
     #include <begin_vertex>
     #include <morphtarget_vertex>
     #include <skinning_vertex>
     #include <project_vertex>
     #include <clipping_planes_vertex>
     vec4 tNormal = vec4(normal, 0.0);
     vec4 tPosition = vec4(transformed, 1.0);
     #ifdef USE_INSTANCING
       tNormal = instanceMatrix * tNormal;
       tPosition = instanceMatrix * tPosition;
     #endif
     if (screenspace) {
       vec3 newPosition = tPosition.xyz + tNormal.xyz * thickness;
       gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
     } else {
       vec4 clipPosition = projectionMatrix * modelViewMatrix * tPosition;
       vec4 clipNormal = projectionMatrix * modelViewMatrix * tNormal;
       vec2 offset = normalize(clipNormal.xy) * thickness / size * clipPosition.w * 2.0;
       clipPosition.xy += offset;
       gl_Position = clipPosition;
     }
   }`,
  `uniform vec3 color;
   uniform float opacity;
   #include <clipping_planes_pars_fragment>
   void main(){
     #include <clipping_planes_fragment>
     gl_FragColor = vec4(color, opacity);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
   }`,
);

type Seragam = { color: { value: Color }; opacity: { value: number }; thickness: { value: number }; size: { value: Vector2 } };

// ===== Cache material per tampilan =====
const ukuranLayar = new Vector2();
const cacheBahan = new Map<string, ShaderMaterial>();
function bahan(color: string, thickness: number, opacity: number, transparent: boolean): ShaderMaterial {
  const k = `${color}|${thickness}|${opacity}|${transparent}`;
  let m = cacheBahan.get(k);
  if (!m) {
    m = new BahanGaris({ side: BackSide }) as unknown as ShaderMaterial;
    const u = m.uniforms as unknown as Seragam;
    u.color.value.set(color);
    u.opacity.value = opacity;
    u.thickness.value = thickness;
    u.size.value = ukuranLayar; // satu Vector2 bersama, diperbarui saat mount
    m.transparent = transparent;
    cacheBahan.set(k, m);
  }
  return m;
}

// ===== Cache geometri garis (creased normals) per geometri sumber, dengan hitungan pemakai =====
const cacheGeo = new WeakMap<BufferGeometry, Map<number, { geo: BufferGeometry; n: number }>>();
function ambilGeo(sumber: BufferGeometry, angle: number): BufferGeometry {
  if (!angle) return sumber;
  let peta = cacheGeo.get(sumber);
  if (!peta) {
    peta = new Map();
    cacheGeo.set(sumber, peta);
    // Sumber di-dispose (mis. geometri inline saat unmount) → buang semua geometri garisnya juga
    const p = peta;
    sumber.addEventListener('dispose', () => {
      p.forEach((e) => e.geo.dispose());
      p.clear();
      cacheGeo.delete(sumber);
    });
  }
  let e = peta.get(angle);
  if (!e) {
    // toCreasedNormals mengubah geometri non-indeks DI TEMPAT & mengembalikan objek yang sama → klon dulu
    e = { geo: toCreasedNormals(sumber.index ? sumber : sumber.clone(), angle), n: 0 };
    peta.set(angle, e);
  }
  e.n++;
  return e.geo;
}
function lepasGeo(sumber: BufferGeometry, angle: number) {
  if (!angle) return;
  const peta = cacheGeo.get(sumber);
  const e = peta?.get(angle);
  if (!peta || !e) return;
  if (--e.n <= 0) {
    e.geo.dispose();
    peta.delete(angle);
  }
}

type Props = {
  color?: string;
  opacity?: number;
  transparent?: boolean;
  thickness?: number;
  angle?: number;
  renderOrder?: number;
};

export function Outlines({ color = 'black', opacity = 1, transparent = false, thickness = 0.05, angle = Math.PI, renderOrder = 0 }: Props) {
  const ref = useRef<Group>(null);
  const gl = useThree((s) => s.gl);
  // Data mesh garis yang sedang terpasang (disimpan agar bisa dibersihkan tanpa bergantung pada ref)
  const pasang = useRef<{ grup: Group; mesh: Mesh; sumber: BufferGeometry; angle: number } | null>(null);

  const lepas = () => {
    const p = pasang.current;
    if (!p) return;
    p.grup.remove(p.mesh);
    lepasGeo(p.sumber, p.angle);
    pasang.current = null;
  };

  useLayoutEffect(() => {
    const grup = ref.current;
    const induk = grup?.parent as Mesh | null | undefined;
    if (!grup || !induk || !induk.geometry) return;
    const p = pasang.current;
    if (p && p.sumber === induk.geometry && p.angle === angle && p.grup === grup) {
      p.mesh.renderOrder = renderOrder;
      p.mesh.material = bahan(color, thickness, opacity, transparent);
      return;
    }
    lepas();
    gl.getDrawingBufferSize(ukuranLayar);
    const m = bahan(color, thickness, opacity, transparent);
    let mesh: Mesh;
    if ((induk as InstancedMesh).isInstancedMesh) {
      const im = induk as InstancedMesh;
      const ii = new InstancedMesh(induk.geometry, m, im.count);
      ii.instanceMatrix = im.instanceMatrix;
      mesh = ii;
      pasang.current = { grup, mesh, sumber: induk.geometry, angle: 0 };
    } else {
      mesh = new Mesh(ambilGeo(induk.geometry, angle), m);
      pasang.current = { grup, mesh, sumber: induk.geometry, angle };
    }
    mesh.renderOrder = renderOrder;
    grup.add(mesh);
  });

  // Unmount: lepas mesh garis & kurangi hitungan pemakai geometri (pakai data di pasang.current, bukan ref)
  useEffect(() => lepas, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <group ref={ref} />;
}
