// Interior gedung prosedural: ruangan + perabot sesuai jenis gedung + penjaga/tuan rumah chibi.
// Dinding belakang & kiri tinggi, depan & kanan rendah (seperti kamar kos) agar kamera isometric melihat isi ruangan.
import { useRef } from 'react';
import { RoundedBox, Html } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import { PALETTE, OUTLINE } from '../palette';
import { useGame } from '../../game/store';
import { PENJAGA, RUANG, tataGedung, type PerabotGedung } from '../../game/gedungLayout';
import { WARGA } from '../../game/m11';
import { Chibi } from '../characters/Chibi';
import { usePapan } from '../usePapan';

const KAYU = '#c48d55';
const KAYU_GELAP = '#8a5a35';
const PUTIH = '#fffaf2';

function Kotak({ args, pos, warna, garis = true, r = 0.05 }: { args: [number, number, number]; pos: [number, number, number]; warna: string; garis?: boolean; r?: number }) {
  return (
    <RoundedBox args={args} radius={r} smoothness={2} position={pos} castShadow receiveShadow>
      <meshToonMaterial color={warna} />
      {garis && <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />}
    </RoundedBox>
  );
}

/** Meja sederhana: daun meja + 4 kaki */
function Meja({ w, d, h = 0.75, warna = KAYU }: { w: number; d: number; h?: number; warna?: string }) {
  return (
    <group>
      <Kotak args={[w, 0.08, d]} pos={[0, h, 0]} warna={warna} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.1), h / 2, sz * (d / 2 - 0.1)]}>
          <cylinderGeometry args={[0.04, 0.04, h, 6]} />
          <meshToonMaterial color={KAYU_GELAP} />
        </mesh>
      )))}
    </group>
  );
}

function Perabot({ p, aksen }: { p: PerabotGedung; aksen: string }) {
  const { w, d } = p;
  switch (p.jenis) {
    case 'konter':
    case 'kasir':
    case 'resepsionis':
    case 'mejaPustakawan':
      return (
        <group>
          <Kotak args={[w, 1.0, d]} pos={[0, 0.5, 0]} warna={PUTIH} />
          <Kotak args={[w + 0.1, 0.08, d + 0.1]} pos={[0, 1.04, 0]} warna={aksen} />
          {p.jenis === 'kasir' && <Kotak args={[0.4, 0.25, 0.3]} pos={[w / 2 - 0.4, 1.2, 0]} warna="#3b4673" />}
        </group>
      );
    case 'etalase':
      // Etalase lauk warteg: lemari kaca + piring lauk warna-warni
      return (
        <group>
          <Kotak args={[w, 0.8, d]} pos={[0, 0.4, 0]} warna="#7cc6a4" />
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[w - 0.1, 0.55, d - 0.1]} />
            <meshStandardMaterial color="#dff1ff" transparent opacity={0.4} roughness={0.2} />
          </mesh>
          {['#e9a23b', '#7cc6a4', '#e9605a', '#fff1c4', '#a86b3c', '#5cc8a8'].map((c, i) => (
            <mesh key={c} position={[-w / 2 + 0.35 + i * ((w - 0.7) / 5), 0.9, 0]}>
              <cylinderGeometry args={[0.18, 0.14, 0.08, 12]} />
              <meshToonMaterial color={c} />
            </mesh>
          ))}
        </group>
      );
    case 'konterKopi':
    case 'konterKafe':
      return (
        <group>
          <Kotak args={[w, 1.05, d]} pos={[0, 0.52, 0]} warna={p.jenis === 'konterKafe' ? '#6b4430' : KAYU} />
          <Kotak args={[w + 0.1, 0.07, d + 0.1]} pos={[0, 1.08, 0]} warna={p.jenis === 'konterKafe' ? '#f6e7d4' : KAYU_GELAP} />
          {/* Mesin kopi & toples */}
          <Kotak args={[0.5, 0.45, 0.4]} pos={[-w / 2 + 0.5, 1.35, 0]} warna="#9aa3ad" />
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0.2 + i * 0.35, 1.25, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.28, 10]} />
              <meshStandardMaterial color="#ffe2b8" transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
      );
    case 'mejaDosen':
      return (
        <group>
          <Meja w={w} d={d} warna={KAYU_GELAP} />
          <Kotak args={[0.5, 0.04, 0.35]} pos={[0.3, 0.81, 0]} warna="#3b4673" garis={false} />
        </group>
      );
    case 'mejaPanjang':
      return <Meja w={w} d={d} />;
    case 'bangku':
      return <Kotak args={[w, 0.08, d]} pos={[0, 0.42, 0]} warna={KAYU_GELAP} />;
    case 'mejaBulat':
    case 'mejaKafe':
      return (
        <group>
          <mesh position={[0, 0.74, 0]} castShadow>
            <cylinderGeometry args={[w / 2, w / 2, 0.07, 18]} />
            <meshToonMaterial color={p.jenis === 'mejaKafe' ? PUTIH : KAYU} />
            <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
          </mesh>
          <mesh position={[0, 0.37, 0]}>
            <cylinderGeometry args={[0.05, 0.12, 0.74, 8]} />
            <meshToonMaterial color={KAYU_GELAP} />
          </mesh>
          {/* Kursi bulat di dua sisi */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (w / 2 + 0.3), 0.3, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.08, 12]} />
              <meshToonMaterial color={aksen} />
            </mesh>
          ))}
          {p.jenis === 'mejaKafe' && (
            <>
              <Kotak args={[0.42, 0.03, 0.3]} pos={[-0.1, 0.8, 0]} warna="#3b4673" garis={false} r={0.01} />
              <mesh position={[0.25, 0.83, 0.1]}>
                <cylinderGeometry args={[0.05, 0.04, 0.12, 8]} />
                <meshToonMaterial color={PUTIH} />
              </mesh>
            </>
          )}
        </group>
      );
    case 'mejaKuliah':
      return (
        <group>
          <Meja w={w} d={d} h={0.7} warna="#e6d3b3" />
          <Kotak args={[0.45, 0.06, 0.45]} pos={[-0.35, 0.42, 0.6]} warna="#7fb3e0" />
          <Kotak args={[0.45, 0.06, 0.45]} pos={[0.35, 0.42, 0.6]} warna="#7fb3e0" />
        </group>
      );
    case 'papanTulis':
      return (
        <group position={[0, 1.55, 0]}>
          <Kotak args={[3.6, 1.3, 0.06]} pos={[0, 0, 0]} warna={PUTIH} />
          <mesh position={[0, 0, 0.04]}>
            <planeGeometry args={[3.4, 1.1]} />
            <meshBasicMaterial color="#3f6b55" />
          </mesh>
        </group>
      );
    case 'tv':
      return (
        <group position={[0, 1.6, 0]}>
          <Kotak args={[1.3, 0.75, 0.06]} pos={[0, 0, 0]} warna="#2a1d15" />
          <mesh position={[0, 0, 0.04]}>
            <planeGeometry args={[1.18, 0.63]} />
            <meshBasicMaterial color="#7fd8ff" />
          </mesh>
        </group>
      );
    case 'rak':
      return (
        <group>
          <Kotak args={[w, 1.5, d]} pos={[0, 0.75, 0]} warna={PUTIH} />
          {[0.4, 0.8, 1.2].map((y) =>
            [-0.8, -0.3, 0.2, 0.7].map((x, i) => (
              <Kotak key={`${y}${x}`} args={[0.35, 0.25, d + 0.04]} pos={[x * (w / 2.4), y, 0]} warna={i % 2 ? p.warna ?? aksen : '#ffd877'} garis={false} r={0.03} />
            )),
          )}
        </group>
      );
    case 'rakBuku':
      return (
        <group rotation={[0, p.rot ?? 0, 0]}>
          <Kotak args={[p.rot ? d : w, 2, p.rot ? w : d]} pos={[0, 1, 0]} warna={KAYU_GELAP} />
          {[0.45, 0.95, 1.45].map((y) => (
            <group key={y}>
              {['#e9605a', '#7fb3e0', '#7cc6a4', '#ffd877', '#bdb2ff', '#ffb36b'].map((c, i) => (
                <mesh key={c} position={[-((p.rot ? d : w) / 2) + 0.25 + i * (((p.rot ? d : w) - 0.5) / 5), y, 0.08]}>
                  <boxGeometry args={[0.16, 0.34, (p.rot ? w : d) - 0.1]} />
                  <meshToonMaterial color={c} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      );
    case 'mejaBaca':
      return (
        <group>
          <Meja w={w} d={d} />
          <Kotak args={[0.35, 0.06, 0.25]} pos={[0.3, 0.82, 0]} warna="#e9605a" garis={false} r={0.01} />
          <mesh position={[-0.6, 0.95, 0]}>
            <coneGeometry args={[0.14, 0.18, 10]} />
            <meshBasicMaterial color="#ffe08a" />
          </mesh>
        </group>
      );
    case 'kulkas':
      return (
        <group>
          <Kotak args={[w, 1.9, d]} pos={[0, 0.95, 0]} warna="#dff1ff" />
          <mesh position={[-w / 2 - 0.01, 1.0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[d - 0.2, 1.6]} />
            <meshStandardMaterial color="#a8dcff" transparent opacity={0.55} />
          </mesh>
        </group>
      );
    case 'ranjang':
      return (
        <group>
          <Kotak args={[w, 0.55, d]} pos={[0, 0.3, 0]} warna={PUTIH} />
          <Kotak args={[w - 0.1, 0.12, 0.4]} pos={[0, 0.62, -d / 2 + 0.3]} warna="#dff1ff" />
          <Kotak args={[w - 0.05, 0.08, d * 0.55]} pos={[0, 0.6, 0.35]} warna="#5cc8a8" garis={false} />
        </group>
      );
    case 'kursiTunggu':
      return (
        <group>
          <Kotak args={[w, 0.1, d]} pos={[0, 0.45, 0]} warna={aksen} />
          <Kotak args={[w, 0.5, 0.08]} pos={[0, 0.75, -d / 2]} warna={aksen} />
        </group>
      );
    case 'mejaPC':
      return (
        <group>
          <Meja w={w} d={d} warna="#3b4673" />
          {[-0.55, 0.55].map((x) => (
            <group key={x} position={[x, 0.8, -0.1]}>
              <Kotak args={[0.6, 0.4, 0.05]} pos={[0, 0.28, 0]} warna="#2a1d15" garis={false} r={0.02} />
              <mesh position={[0, 0.28, 0.03]}>
                <planeGeometry args={[0.52, 0.32]} />
                <meshBasicMaterial color={x < 0 ? '#ffb36b' : '#7fd8ff'} />
              </mesh>
            </group>
          ))}
          {[-0.55, 0.55].map((x) => (
            <Kotak key={`k${x}`} args={[0.45, 0.06, 0.45]} pos={[x, 0.45, 0.7]} warna="#e9605a" />
          ))}
        </group>
      );
    case 'mesinFotokopi':
      return (
        <group>
          <Kotak args={[w, 1.0, d]} pos={[0, 0.5, 0]} warna="#e6e8ec" />
          <Kotak args={[w * 0.9, 0.12, d * 0.8]} pos={[0, 1.08, 0]} warna="#9aa3ad" />
          <mesh position={[0, 0.7, d / 2 + 0.01]}>
            <planeGeometry args={[0.3, 0.15]} />
            <meshBasicMaterial color="#7cc6a4" />
          </mesh>
        </group>
      );
    case 'rakKertas':
      return <Kotak args={[w, 1.3, d]} pos={[0, 0.65, 0]} warna={PUTIH} />;
    case 'mesinCuci':
      return (
        <group>
          <Kotak args={[w, 1.0, d]} pos={[0, 0.5, 0]} warna={PUTIH} />
          <mesh position={[0, 0.55, d / 2 + 0.01]}>
            <circleGeometry args={[0.28, 18]} />
            <meshStandardMaterial color="#a8dcff" transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, 0.55, d / 2 + 0.005]}>
            <ringGeometry args={[0.28, 0.34, 18]} />
            <meshToonMaterial color="#9aa3ad" />
          </mesh>
        </group>
      );
    case 'keranjang':
      return (
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.26, 0.6, 12]} />
          <meshToonMaterial color="#e6d3b3" />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </mesh>
      );
    case 'termos':
      return (
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 1.0, 12]} />
          <meshToonMaterial color="#e9605a" />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </mesh>
      );
    case 'tanaman':
      return (
        <group>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.22, 0.17, 0.5, 10]} />
            <meshToonMaterial color="#e98a6b" />
          </mesh>
          <mesh position={[0, 0.85, 0]} castShadow>
            <sphereGeometry args={[0.38, 12, 10]} />
            <meshToonMaterial color="#7cc6a4" />
            <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
          </mesh>
        </group>
      );
    case 'sofa':
      return (
        <group rotation={[0, p.rot ?? 0, 0]}>
          <Kotak args={[w, 0.45, d]} pos={[0, 0.25, 0]} warna={aksen} r={0.12} />
          <Kotak args={[w, 0.55, 0.25]} pos={[0, 0.6, -d / 2 + 0.12]} warna={aksen} r={0.1} />
          {[-1, 1].map((s) => (
            <Kotak key={s} args={[0.25, 0.4, d]} pos={[s * (w / 2 - 0.12), 0.5, 0]} warna={aksen} r={0.1} />
          ))}
        </group>
      );
    case 'mejaTamu':
      return <Meja w={w} d={d} h={0.42} />;
    case 'lemariTv':
      return <Kotak args={[w, 0.6, d]} pos={[0, 0.3, 0]} warna={KAYU} />;
    case 'karpet':
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <circleGeometry args={[1.6, 24]} />
          <meshToonMaterial color="#ffd6a5" />
        </mesh>
      );
    // ===== M12: perabot gedung baru =====
    case 'alatGym':
      // Bangku beban + barbel di atas penyangga
      return (
        <group>
          <Kotak args={[0.5, 0.12, w > d ? w : d]} pos={[0, 0.45, 0]} warna={aksen} />
          <mesh position={[0, 0.22, 0]}>
            <boxGeometry args={[0.1, 0.44, 0.1]} />
            <meshToonMaterial color="#5b6170" />
          </mesh>
          <mesh position={[0, 1.05, -0.45]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 1.5, 6]} />
            <meshToonMaterial color="#9aa3ad" />
          </mesh>
          {[-0.62, 0.62].map((x) => (
            <mesh key={x} position={[x, 1.05, -0.45]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.2, 0.2, 0.08, 14]} />
              <meshToonMaterial color="#2a1d15" />
            </mesh>
          ))}
          {[-0.62, 0.62].map((x) => (
            <mesh key={`t${x}`} position={[x * 0.85, 0.5, -0.45]}>
              <boxGeometry args={[0.06, 1.0, 0.06]} />
              <meshToonMaterial color="#5b6170" />
            </mesh>
          ))}
        </group>
      );
    case 'matras':
      return <Kotak args={[w, 0.06, d]} pos={[0, 0.03, 0]} warna={p.warna ?? '#5cc8a8'} garis={false} r={0.02} />;
    case 'brankas':
      return (
        <group>
          <Kotak args={[w, 1.3, d]} pos={[0, 0.65, 0]} warna="#7d8796" />
          <mesh position={[0, 0.75, d / 2 + 0.01]}>
            <ringGeometry args={[0.12, 0.18, 16]} />
            <meshToonMaterial color="#e9b949" />
          </mesh>
        </group>
      );
    case 'galonRak':
      // Rak isi ulang air: deretan galon biru transparan
      return (
        <group>
          <Kotak args={[w, 0.5, d]} pos={[0, 0.25, 0]} warna={KAYU} />
          {[-1, 0, 1].map((i) => (
            <mesh key={i} position={[i * (w / 3.2), 0.8, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.55, 12]} />
              <meshStandardMaterial color="#7fc4f0" transparent opacity={0.6} roughness={0.2} />
            </mesh>
          ))}
        </group>
      );
    case 'lapak':
      // Lapak pasar: meja + tumpukan sayur/buah warna-warni
      return (
        <group>
          <Meja w={w} d={d} h={0.7} warna={KAYU} />
          {['#7cc6a4', '#e9605a', '#ffd877', '#ffb36b', '#a6d785'].map((c, i) => (
            <mesh key={c} position={[-w / 2 + 0.3 + i * ((w - 0.6) / 4), 0.85, 0]}>
              <sphereGeometry args={[0.16, 8, 6]} />
              <meshToonMaterial color={c} />
            </mesh>
          ))}
        </group>
      );
    case 'kursiCukur':
      return (
        <group>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.08, 0.25, 0.5, 10]} />
            <meshToonMaterial color="#9aa3ad" />
          </mesh>
          <Kotak args={[0.6, 0.14, 0.6]} pos={[0, 0.55, 0]} warna={aksen} r={0.06} />
          <Kotak args={[0.6, 0.7, 0.12]} pos={[0, 0.95, -0.25]} warna={aksen} r={0.06} />
        </group>
      );
    case 'cermin':
      return (
        <group position={[0, 1.4, 0]}>
          <Kotak args={[1.2, 1.0, 0.05]} pos={[0, 0, 0]} warna={PUTIH} />
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[1.05, 0.85]} />
            <meshStandardMaterial color="#cfe8f5" roughness={0.1} metalness={0.3} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

/** Papan nama gedung di dinding belakang (CanvasTexture, tanpa file gambar) */
function PapanDinding({ teks, warna }: { teks: string; warna: string }) {
  const tex = usePapan(teks, warna);
  return (
    <mesh position={[-2.7, 2.2, -RUANG.halfD + 0.06]}>
      <planeGeometry args={[2.6, 0.55]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
}

export function InteriorGedung() {
  const gedung = useGame((s) => s.gedung);
  const t = tataGedung(gedung ?? '');
  const tuanRef = useRef({ current: false }).current;
  if (!t) return null;
  const b = t.bangunan;
  const { halfW, halfD, tinggi: h } = RUANG;
  const aksen = b.aksen ?? b.atap;
  const dinding = b.jenis === 'rumah' ? b.warna : '#fdf3e2';
  const lantai = b.jenis === 'kampus' || b.id === 'klinik' || b.id === 'minimarket' ? '#eef0f3' : b.id === 'warnet' ? '#5a6390' : '#e2b98a';
  const penjaga = PENJAGA[b.id];
  const tuan = t.tuanRumah ? WARGA.find((w) => w.id === t.tuanRumah) : null;
  return (
    <group>
      {/* Tanah luar & lantai */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.21, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshLambertMaterial color="#f2d3a8" />
      </mesh>
      <RoundedBox args={[halfW * 2 + 0.4, 0.2, halfD * 2 + 0.4]} radius={0.06} smoothness={2} position={[0, -0.1, 0]}>
        <meshToonMaterial color={KAYU_GELAP} />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </RoundedBox>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <planeGeometry args={[halfW * 2, halfD * 2]} />
        <meshToonMaterial color={lantai} />
      </mesh>
      {/* Dinding belakang & kiri tinggi; depan & kanan rendah */}
      <Kotak args={[halfW * 2 + 0.4, h, 0.2]} pos={[0, h / 2, -halfD - 0.1]} warna={dinding} r={0.06} />
      <Kotak args={[halfW * 2, 0.7, 0.05]} pos={[0, 0.35, -halfD + 0.02]} warna={aksen} garis={false} r={0.02} />
      <Kotak args={[0.2, h, halfD * 2 + 0.4]} pos={[-halfW - 0.1, h / 2, 0]} warna={dinding} r={0.06} />
      <Kotak args={[halfW * 2 + 0.4, 0.3, 0.2]} pos={[0, 0.15, halfD + 0.1]} warna={aksen} r={0.06} />
      <Kotak args={[0.2, 0.3, halfD * 2 + 0.4]} pos={[halfW + 0.1, 0.15, 0]} warna={aksen} r={0.06} />
      {/* Pintu keluar di dinding kiri */}
      <Kotak args={[0.08, 2.0, 1.0]} pos={[-halfW + 0.03, 1.0, 2.2]} warna={KAYU_GELAP} />
      {b.jenis !== 'rumah' && <PapanDinding teks={b.papan ?? b.nama.toUpperCase()} warna={aksen} />}

      {t.perabot.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <Perabot p={p} aksen={aksen} />
        </group>
      ))}

      {/* Penjaga di balik konter */}
      {penjaga && (
        <group position={[t.penjaga.x, 0, t.penjaga.z]}>
          <Chibi bergerak={tuanRef} baju={penjaga.baju} rambut={penjaga.rambut} />
          <Html position={[0, 1.95, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <div className="rounded-lg border-2 border-white bg-white/90 px-1.5 text-[11px] font-extrabold whitespace-nowrap text-amber-900">{penjaga.nama}</div>
          </Html>
        </group>
      )}
      {/* Tuan rumah (warga) */}
      {tuan && (
        <group position={[t.penjaga.x, 0, t.penjaga.z]}>
          <Chibi bergerak={tuanRef} baju="#ffd6a5" gaya={tuan.gaya} />
        </group>
      )}
    </group>
  );
}
