import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Outlines } from '../lod/Outlines';
import { BoxGeometry, CapsuleGeometry, CircleGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type Group } from 'three';
import { PALETTE, OUTLINE } from '../palette';
import { RambutChibi } from './RambutChibi';
import { basic, basicWarnaVerteks, gabung, geoBersama, toon, toonWarnaVerteks } from '../lod/bahan';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useLodJarak, type LevelLod } from '../lod/useLodJarak';

type Props = {
  kulit?: string;
  baju?: string;
  rambut?: string;
  /** Warna celana & sepatu (default dari palet) */
  celana?: string;
  sepatu?: string;
  /** Diisi oleh pengendali (Player/NPC): true saat sedang berjalan */
  bergerak: { current: boolean };
  /** true untuk karakter yang tidak menapak tanah (mis. naik motor) */
  tanpaBayangan?: boolean;
  /** Aksesoris yang dipakai: topi, kacamata, tasPunggung, bandana, toga */
  aksesoris?: readonly string[];
  /** true = tangan kanan melambai (emote) */
  lambai?: { current: boolean };
  /** Gaya rambut (fitur3.json → gayaRambut) */
  gaya?: string;
  /** Paksa level detail (0 = penuh). Kosong = otomatis menurut jarak (lihat lod/useLodJarak). */
  lod?: LevelLod;
};

const SISI = [-1, 1] as const;
const MATA = '#2a1d15';
const SEPATU = '#4a3a33';

// ===== Geometri bersama (dibuat sekali untuk SEMUA chibi) =====
// Bagian wajah kiri+kanan bermaterial sama digabung jadi 1 mesh → 1 draw call (tampilan identik).
const G = {
  badan: () => geoBersama('c-badan', () => new CapsuleGeometry(0.2, 0.22, 4, 10)),
  kerah: () => geoBersama('c-kerah', () => new TorusGeometry(0.13, 0.035, 6, 14)),
  sabuk: () => geoBersama('c-sabuk', () => new CylinderGeometry(0.215, 0.215, 0.06, 14)),
  kepala: () => geoBersama('c-kepala', () => new SphereGeometry(0.42, 22, 18)),
  kepalaJauh: () => geoBersama('c-kepala-j', () => new SphereGeometry(0.42, 14, 10)),
  lengan: () => geoBersama('c-lengan', () => new CapsuleGeometry(0.07, 0.08, 4, 8)),
  telapak: () => geoBersama('c-telapak', () => new SphereGeometry(0.072, 10, 8)),
  paha: () => geoBersama('c-paha', () => new CapsuleGeometry(0.078, 0.1, 4, 8)),
  bayangan: () => geoBersama('c-bayangan', () => new CircleGeometry(0.35, 16)),
  mata: () =>
    geoBersama('c-mata', () =>
      gabung(SISI.map((s) => ({ geo: new SphereGeometry(0.085, 12, 10), pos: [s * 0.16, 0, 0.36], skala: [0.85, 1.15, 0.5] }))),
    ),
  kilau: () =>
    geoBersama('c-kilau', () =>
      gabung(
        SISI.flatMap((s) => [
          { geo: new SphereGeometry(0.027, 6, 6), pos: [s * 0.16 + 0.027, 0.04, 0.402] as [number, number, number] },
          { geo: new SphereGeometry(0.013, 6, 6), pos: [s * 0.16 - 0.024, -0.034, 0.402] as [number, number, number] },
        ]),
      ),
    ),
  alis: () =>
    geoBersama('c-alis', () =>
      gabung(SISI.map((s) => ({ geo: new BoxGeometry(0.11, 0.024, 0.02), pos: [s * 0.16, 0.13, 0.37], rot: [-0.3, 0, s * 0.1] }))),
    ),
  pipi: () =>
    geoBersama('c-pipi', () =>
      gabung(SISI.map((s) => ({ geo: new SphereGeometry(0.055, 8, 6), pos: [s * 0.25, -0.12, 0.32], skala: [1, 0.7, 0.5] }))),
    ),
  mulut: () => geoBersama('c-mulut', () => new TorusGeometry(0.045, 0.012, 5, 12, Math.PI)),
  // ===== Gabungan berwarna per-verteks (bagian beda warna yang bergerak bersama) =====
  /** Badan + sabuk (sabuk menempel di badan) */
  badanSabuk: (baju: string, celana: string) =>
    geoBersama(`c-bs|${baju}|${celana}`, () =>
      gabung([
        { geo: new CapsuleGeometry(0.2, 0.22, 4, 10), pos: [0, 0.56, 0], skala: [1, 1, 0.9], warna: baju },
        { geo: new CylinderGeometry(0.215, 0.215, 0.06, 14), pos: [0, 0.39, 0], skala: [1, 1, 0.9], warna: celana },
      ]),
    ),
  /** Satu tangan: lengan baju + telapak (pivot di bahu) */
  tangan: (baju: string, kulit: string) =>
    geoBersama(`c-tg|${baju}|${kulit}`, () =>
      gabung([
        { geo: new CapsuleGeometry(0.07, 0.08, 4, 8), pos: [0, -0.07, 0], warna: baju },
        { geo: new SphereGeometry(0.072, 10, 8), pos: [0, -0.22, 0], warna: kulit },
      ]),
    ),
  /** Satu kaki: celana + sepatu (pivot di pinggul) */
  kaki: (celana: string, sepatu: string) =>
    geoBersama(`c-kk|${celana}|${sepatu}`, () =>
      gabung([
        { geo: new CapsuleGeometry(0.078, 0.1, 4, 8), pos: [0, -0.12, 0], warna: celana },
        { geo: new RoundedBoxGeometry(0.15, 0.09, 0.22, 2, 0.04), pos: [0, -0.27, 0.03], warna: sepatu },
      ]),
    ),
  /** Mata + kilau (ikut berkedip bersama) */
  mataKilau: () =>
    geoBersama('c-mk', () =>
      gabung([
        ...SISI.map((s) => ({ geo: new SphereGeometry(0.085, 12, 10), pos: [s * 0.16, 0, 0.36] as V3, skala: [0.85, 1.15, 0.5] as V3, warna: MATA })),
        ...SISI.flatMap((s) => [
          { geo: new SphereGeometry(0.027, 6, 6), pos: [s * 0.16 + 0.027, 0.04, 0.402] as V3, warna: '#ffffff' },
          { geo: new SphereGeometry(0.013, 6, 6), pos: [s * 0.16 - 0.024, -0.034, 0.402] as V3, warna: '#ffffff' },
        ]),
      ]),
    ),
  /** Alis (warna rambut) + mulut */
  alisMulut: (rambut: string) =>
    geoBersama(`c-am|${rambut}`, () =>
      gabung([
        ...SISI.map((s) => ({ geo: new BoxGeometry(0.11, 0.024, 0.02), pos: [s * 0.16, 0.13, 0.37] as V3, rot: [-0.3, 0, s * 0.1] as V3, warna: rambut })),
        { geo: new TorusGeometry(0.045, 0.012, 5, 12, Math.PI), pos: [0, -0.16, 0.39], rot: [-0.35, 0, Math.PI], warna: '#7a3b2e' },
      ]),
    ),
};
type V3 = [number, number, number];

/**
 * Karakter chibi prosedural (rombak 2026-11-22, gaya A "chibi lebih detail"):
 * kepala besar (± ½ tinggi), wajah ekspresif (mata berkilau + kedip, alis, mulut, pipi), baju berkerah,
 * sabuk, lengan baju + telapak tangan, sepatu. Animasi: napas, kedip, menoleh saat diam,
 * jalan membal dengan badan condong & kepala mengimbangi.
 * Ukuran kepala tetap 0,42 agar rambut (RambutChibi) & aksesoris lama tetap pas.
 *
 * Optimasi draw call (20 Tech Artist, 2026-11-23):
 * - LOD 0 (≤ 4 m, mis. pemain sendiri): tampilan penuh; bagian wajah kiri+kanan digabung (mata, kilau, alis, pipi)
 *   → hemat 6 draw call; rambut 1 mesh gabungan.
 * - LOD 1 (4–13 m): tampilan sama, tetapi hanya badan & kepala yang ikut pass bayangan (anggota badan kecil tidak).
 * - LOD 2 (> 13 m): tanpa outline, alis, kilau, pipi, mulut, kerah, aksesoris kecil; tidak ikut pass bayangan.
 * - LOD 3 (> 22 m): siluet — badan, kepala, rambut sederhana, mata, kaki.
 * - Material & geometri dipakai bersama semua chibi (lod/bahan.ts).
 */
export function Chibi({
  kulit = PALETTE.kulit[0],
  baju = PALETTE.baju[1],
  rambut = PALETTE.rambut,
  celana = PALETTE.celana,
  sepatu = SEPATU,
  bergerak,
  tanpaBayangan = false,
  aksesoris = [],
  lambai,
  gaya,
  lod,
}: Props) {
  const pakai = (id: string) => aksesoris.includes(id);
  const luar = useRef<Group>(null);
  const root = useRef<Group>(null);
  const kepala = useRef<Group>(null);
  const mata = useRef<Group>(null);
  const kakiKiri = useRef<Group>(null);
  const kakiKanan = useRef<Group>(null);
  const tanganKiri = useRef<Group>(null);
  const tanganKanan = useRef<Group>(null);
  // Fase acak per karakter agar warga tidak berkedip/menoleh serempak
  const fase = useRef(Math.random() * 10).current;
  const level = useLodJarak(luar, lod);
  const dekat = level <= 1; // tampilan penuh
  const bayangPenuh = level === 0; // lengan/tangan/kaki/sepatu ikut pass bayangan hanya bila sangat dekat
  const siluet = level === 3;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const r = root.current;
    const kp = kepala.current;
    const kk = kakiKiri.current;
    const kn = kakiKanan.current;
    const tk = tanganKiri.current;
    const tn = tanganKanan.current;
    if (!r || !kp || !kk || !kn || !tk || !tn) return;

    if (bergerak.current) {
      // Jalan membal: pantulan |sin|, badan condong ke depan, kepala sedikit mengimbangi (follow-through)
      const s = t * 12;
      r.position.y = Math.abs(Math.sin(s)) * 0.11;
      r.rotation.z = Math.sin(s) * 0.05;
      r.rotation.x += (0.08 - r.rotation.x) * 0.2;
      kp.rotation.z = -Math.sin(s - 0.6) * 0.06;
      kp.rotation.y *= 0.85;
      const ayun = Math.sin(s) * 0.75;
      kk.rotation.x = ayun;
      kn.rotation.x = -ayun;
      tk.rotation.x = -ayun * 0.9;
      tn.rotation.x = ayun * 0.9;
      r.scale.set(1, 1, 1);
    } else {
      // Diam: napas (squash kecil), anggota badan kembali lurus, sesekali menoleh pelan
      const n = Math.sin(t * 2.5);
      r.position.y *= 0.8;
      r.rotation.z *= 0.8;
      r.rotation.x *= 0.85;
      r.scale.set(1 - n * 0.015, 1 + n * 0.025, 1 - n * 0.015);
      kp.rotation.z *= 0.85;
      kp.rotation.y += (Math.sin(t * 0.45 + fase) * 0.35 * Math.max(0, Math.sin(t * 0.2 + fase)) - kp.rotation.y) * 0.05;
      kk.rotation.x *= 0.8;
      kn.rotation.x *= 0.8;
      tk.rotation.x *= 0.8;
      tn.rotation.x *= 0.8;
    }
    // Kedip: ± tiap 3,7 detik, mata menyempit 0,12 detik
    const m = mata.current;
    if (m) m.scale.y = (t + fase) % 3.7 < 0.12 ? 0.12 : 1;
    // Emote melambai: tangan kanan diangkat & digoyang
    if (lambai?.current) tn.rotation.z = 2.6 + Math.sin(t * 12) * 0.35;
    else tn.rotation.z *= 0.8;
  });

  const mBaju = toon(baju);
  const mKulit = toon(kulit);
  const mCelana = toon(celana);

  return (
    <group ref={luar} name="chibi">
      <group ref={root}>
        {/* Badan: kapsul sedikit pipih + kerah + sabuk */}
        {/* Badan + sabuk = 1 mesh berwarna per-verteks */}
        <mesh castShadow={dekat} geometry={G.badanSabuk(baju, celana)} material={toonWarnaVerteks()}>
          {dekat && <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />}
        </mesh>
        {dekat && <mesh position={[0, 0.79, 0.02]} rotation={[Math.PI / 2 - 0.25, 0, 0]} geometry={G.kerah()} material={mBaju} />}

        {/* Kepala */}
        <group ref={kepala} position={[0, 1.15, 0]}>
          <mesh castShadow={dekat} geometry={dekat ? G.kepala() : G.kepalaJauh()} material={mKulit}>
            {dekat && <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />}
          </mesh>
          {/* Rambut sesuai gaya (lihat RambutChibi): 1 mesh gabungan */}
          <RambutChibi gaya={gaya} warna={rambut} />
          {!siluet && pakai('kupluk') && !pakai('toga') && (
            <group position={[0, 0.14, -0.02]}>
              <mesh scale={[1.08, 0.85, 1.08]} material={toon('#7fb3e0')}>
                <sphereGeometry args={[0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
              </mesh>
              {dekat && (
                <mesh position={[0, 0.36, 0]} material={toon('#fffaf2')}>
                  <sphereGeometry args={[0.08, 8, 6]} />
                </mesh>
              )}
            </group>
          )}
          {dekat && pakai('headphone') && (
            <group position={[0, 0.05, 0]}>
              <mesh material={toon('#3b2a20')}>
                <torusGeometry args={[0.45, 0.03, 6, 20, Math.PI]} />
              </mesh>
              {SISI.map((s) => (
                <mesh key={`hp${s}`} position={[s * 0.43, -0.05, 0]} rotation={[0, 0, Math.PI / 2]} material={toon('#e9605a')}>
                  <cylinderGeometry args={[0.11, 0.11, 0.08, 12]} />
                </mesh>
              ))}
            </group>
          )}
          {dekat && pakai('pita') && (
            <group position={[0.24, 0.3, 0.12]} rotation={[0, 0, -0.4]}>
              {SISI.map((s) => (
                <mesh key={`pt${s}`} position={[s * 0.07, 0, 0]} rotation={[0, 0, s * 0.6]} material={toon('#ff9aa2')}>
                  <coneGeometry args={[0.06, 0.13, 4]} />
                </mesh>
              ))}
            </group>
          )}

          {/* ===== Wajah ===== */}
          {/* Mata lonjong + 2 kilau (berkedip lewat skala grup). Kiri+kanan = 1 mesh gabungan. */}
          <group ref={mata} position={[0, -0.03, 0]}>
            {dekat ? <mesh geometry={G.mataKilau()} material={basicWarnaVerteks()} /> : <mesh geometry={G.mata()} material={basic(MATA)} />}
          </group>
          {dekat && (
            <>
              {/* Alis (warna rambut) — ujung luar sedikit naik = raut ramah */}
              {/* + mulut senyum kecil (1 mesh berwarna per-verteks) */}
              <mesh geometry={G.alisMulut(rambut)} material={basicWarnaVerteks()} />
              {/* Pipi merona */}
              <mesh geometry={G.pipi()} material={basic('#ff9aa2', 0.55)} />
            </>
          )}

          {/* ===== Aksesoris kepala ===== */}
          {!siluet && pakai('topi') && !pakai('toga') && (
            <group position={[0, 0.12, 0]}>
              <mesh scale={[1.07, 0.75, 1.07]} material={toon('#e9605a')}>
                <sphereGeometry args={[0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
              </mesh>
              <mesh position={[0, 0.0, 0.36]} rotation={[0.15, 0, 0]} material={toon('#c94b45')}>
                <cylinderGeometry args={[0.22, 0.22, 0.03, 16, 1, false, -Math.PI / 2, Math.PI]} />
              </mesh>
            </group>
          )}
          {!siluet && pakai('bandana') && !pakai('toga') && (
            <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2 - 0.15, 0, 0]} material={toon('#e23b3b')}>
              <torusGeometry args={[0.415, 0.045, 6, 20]} />
            </mesh>
          )}
          {!siluet && pakai('toga') && (
            <group position={[0, 0.36, -0.02]}>
              <mesh material={toon('#1f1a24')}>
                <cylinderGeometry args={[0.24, 0.26, 0.14, 12]} />
              </mesh>
              <mesh position={[0, 0.08, 0]} rotation={[0, Math.PI / 4, 0]} material={toon('#1f1a24')}>
                <boxGeometry args={[0.62, 0.03, 0.62]} />
              </mesh>
              {dekat && (
                <mesh position={[0.28, -0.02, 0.1]} material={basic('#f2d15c')}>
                  <cylinderGeometry args={[0.012, 0.012, 0.2, 4]} />
                </mesh>
              )}
            </group>
          )}
          {dekat && pakai('kacamata') && (
            <group position={[0, -0.03, 0.4]}>
              {SISI.map((s) => (
                <mesh key={`kc${s}`} position={[s * 0.15, 0, 0]} material={basic('#3b2a20')}>
                  <torusGeometry args={[0.09, 0.015, 6, 16]} />
                </mesh>
              ))}
              <mesh material={basic('#3b2a20')}>
                <boxGeometry args={[0.07, 0.015, 0.015]} />
              </mesh>
            </group>
          )}
        </group>

        {/* Tas punggung */}
        {!siluet && pakai('tasPunggung') && (
          <mesh position={[0, 0.6, -0.24]} castShadow={dekat} material={toon('#7cc6a4')}>
            <capsuleGeometry args={[0.16, 0.14, 4, 8]} />
            {dekat && <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />}
          </mesh>
        )}
        {/* Tas selempang: tali miring di dada + tas kecil di pinggul kanan */}
        {!siluet && pakai('tasSelempang') && (
          <group>
            {dekat && (
              <mesh position={[0, 0.62, 0.02]} rotation={[0, 0, 0.75]} material={toon('#6b4430')}>
                <torusGeometry args={[0.26, 0.022, 4, 16]} />
              </mesh>
            )}
            <mesh position={[0.24, 0.4, 0.08]} castShadow={dekat} material={toon('#a86b3c')}>
              <boxGeometry args={[0.2, 0.16, 0.08]} />
            </mesh>
          </group>
        )}
        {/* Totebag di bahu kiri */}
        {!siluet && pakai('totebag') && (
          <group position={[-0.32, 0.45, 0]}>
            <mesh material={toon('#f6e7d4')}>
              <boxGeometry args={[0.06, 0.28, 0.24]} />
            </mesh>
            {dekat && (
              <mesh position={[0, 0.2, 0]} rotation={[0, Math.PI / 2, 0]} material={toon('#e6d3b3')}>
                <torusGeometry args={[0.08, 0.012, 4, 10, Math.PI]} />
              </mesh>
            )}
          </group>
        )}
        {/* Tas pinggang */}
        {dekat && pakai('tasPinggang') && (
          <mesh position={[0, 0.38, 0.2]} rotation={[0, 0, Math.PI / 2]} material={toon('#3b4673')}>
            <capsuleGeometry args={[0.07, 0.16, 4, 8]} />
          </mesh>
        )}
        {/* Syal melingkar di leher */}
        {!siluet && pakai('syal') && (
          <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} material={toon('#e9605a')}>
            <torusGeometry args={[0.2, 0.06, 6, 16]} />
          </mesh>
        )}

        {/* Tangan (pivot di bahu): lengan baju + telapak tangan. Siluet: tanpa tangan. */}
        {SISI.map((s) => (
          <group key={`tgn${s}`} ref={s < 0 ? tanganKiri : tanganKanan} position={[s * 0.27, 0.72, 0]}>
            {!siluet && (
              <>
                <mesh castShadow={bayangPenuh} geometry={G.tangan(baju, kulit)} material={toonWarnaVerteks()} />

              </>
            )}
            {dekat && s < 0 && pakai('jamTangan') && (
              <mesh position={[0, -0.16, 0]} material={toon('#3b2a20')}>
                <cylinderGeometry args={[0.075, 0.075, 0.035, 10]} />
              </mesh>
            )}
          </group>
        ))}

        {/* Kaki (pivot di pinggul): celana + sepatu. Siluet: tanpa sepatu. */}
        {SISI.map((s) => (
          <group key={`kaki${s}`} ref={s < 0 ? kakiKiri : kakiKanan} position={[s * 0.1, 0.34, 0]}>
            {siluet ? (
              <mesh position={[0, -0.12, 0]} geometry={G.paha()} material={mCelana} />
            ) : (
              <mesh castShadow={bayangPenuh} geometry={G.kaki(celana, sepatu)} material={toonWarnaVerteks()} />
            )}
          </group>
        ))}
      </group>

      {/* Bayangan bulat palsu (murah, tetap di lantai) */}
      {!tanpaBayangan && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} geometry={G.bayangan()} material={basic('#000000', 0.18)} />
      )}
    </group>
  );
}
