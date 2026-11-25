// Layar "Buat Karakter": nama, jurusan, daerah asal, warna kulit/rambut/baju, tanggal ulang tahun.
// Pratinjau chibi 3D berputar di kanvas kecil terpisah.
import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { useGame } from '../game/store';
import { ASAL, FITUR, JURUSAN, formatRupiah, type Profil } from '../game/sim';
import { profilAcak } from '../game/fitur';
import { Chibi } from '../three/characters/Chibi';
import { PALETTE } from '../three/palette';
import { sfxPop } from '../audio/sfx';
import { F3 } from '../game/m11';

const PILIH = 'rounded-2xl border-4 px-3 py-2 text-left font-extrabold active:scale-[0.98] touch-none';

export function BuatKarakter() {
  const tampil = useGame((s) => s.buatKarakter);
  if (!tampil) return null;
  return <Form />;
}

function Form() {
  const simpanProfil = useGame((s) => s.simpanProfil);
  const lama = useGame((s) => s.profil);
  const [p, setP] = useState<Profil>(() => lama ?? profilAcak(''));
  const [galat, setGalat] = useState('');
  const kunci = !!lama; // karakter lama: jurusan & asal tidak bisa diganti (cegah curang kiriman)
  const ubah = (x: Partial<Profil>) => {
    sfxPop();
    setP((v) => ({ ...v, ...x }));
  };
  const selesai = () => {
    const nama = p.nama.replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 12);
    if (!nama) {
      setGalat('Isi nama dulu ya! 😊');
      return;
    }
    simpanProfil({ ...p, nama });
  };
  const jur = JURUSAN.find((j) => j.id === p.jurusan);

  return (
    <div className="safe-x absolute inset-0 z-[55] flex items-center justify-center bg-gradient-to-b from-sky-100 via-amber-50 to-orange-100 text-teks">
      <div className="flex h-[94%] w-[96%] gap-3 rounded-3xl bg-hp-layar p-3 shadow-sm">
        {/* Kiri: pratinjau 3D */}
        <div className="flex w-[28%] flex-col items-center gap-2">
          <h2 className="text-center text-xl font-black text-orange-600">🧑‍🎓 Buat Karakter</h2>
          <div className="relative w-full flex-1 overflow-hidden rounded-2xl bg-gradient-to-b from-sky-200 to-amber-100">
            <Canvas dpr={1} camera={{ position: [0, 1.3, 3.2], fov: 35 }}>
              <ambientLight intensity={0.9} />
              <directionalLight position={[2, 4, 3]} intensity={1.2} />
              <Pratinjau p={p} />
            </Canvas>
            <div className="absolute inset-x-0 bottom-2 text-center text-lg font-black drop-shadow-[0_2px_0_#fff]">{p.nama || '???'}</div>
          </div>
          <button
            onPointerDown={() => {
              const a = profilAcak(p.nama);
              ubah(kunci ? { kulit: a.kulit, rambut: a.rambut, baju: a.baju } : a);
            }}
            className="min-h-14 w-full rounded-2xl bg-stone-200/80 font-extrabold text-teks active:scale-[0.98]"
          >
            🎲 Acak
          </button>
        </div>

        {/* Kanan: pilihan (bisa digulir) */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-sm font-extrabold">👤 Nama</label>
            <input
              className="h-14 min-w-0 flex-1 rounded-2xl bg-white px-4 text-lg font-extrabold shadow-inner outline-none focus:border-orange-300"
              value={p.nama}
              maxLength={12}
              placeholder="Nama panggilanmu"
              onChange={(e) => {
                setGalat('');
                setP((v) => ({ ...v, nama: e.target.value }));
              }}
            />
          </div>

          {kunci && (
            <p className="rounded-xl bg-sky-100 px-3 py-2 text-sm font-bold">
              🔒 Jurusan ({jur?.ikon} {jur?.nama}) & daerah asal sudah tercatat di kampus — yang bisa diubah: nama & penampilan.
            </p>
          )}
          {!kunci && (<>
          <p className="text-sm font-extrabold">🎓 Jurusan</p>
          <div className="grid grid-cols-2 gap-2">
            {JURUSAN.map((j) => (
              <button
                key={j.id}
                onPointerDown={() => ubah({ jurusan: j.id })}
                className={`${PILIH} ${p.jurusan === j.id ? 'border-orange-400 bg-white' : 'border-white bg-white/60'}`}
              >
                <div>
                  {j.ikon} {j.nama}
                </div>
                <div className="text-mini font-bold opacity-70">{j.deskripsi}</div>
              </button>
            ))}
          </div>

          <p className="text-sm font-extrabold">🗺️ Daerah asal (kiriman ortu & ongkos pulang kampung)</p>
          <div className="flex flex-wrap gap-2">
            {ASAL.map((a) => (
              <button
                key={a.id}
                onPointerDown={() => ubah({ asal: a.id })}
                className={`${PILIH} min-h-14 ${p.asal === a.id ? 'border-orange-400 bg-white' : 'border-white bg-white/60'}`}
              >
                <div className="text-sm">
                  {a.ikon} {a.nama}
                </div>
                <div className="text-mini font-bold opacity-70">
                  💌 {formatRupiah(a.kiriman)} · 🚌 {formatRupiah(a.ongkosPulang)}
                </div>
              </button>
            ))}
          </div>
          </>)}

          <div className="grid grid-cols-3 gap-2">
            <Warna judul="🧑 Kulit" daftar={PALETTE.kulit} pilih={PALETTE.kulit[p.kulit]} onPilih={(w) => ubah({ kulit: PALETTE.kulit.indexOf(w as (typeof PALETTE.kulit)[number]) })} />
            <Warna judul="💇 Rambut" daftar={FITUR.rambut} pilih={p.rambut} onPilih={(w) => ubah({ rambut: w })} />
            <Warna judul="👕 Baju" daftar={FITUR.baju} pilih={p.baju} onPilih={(w) => ubah({ baju: w })} />
          </div>
          {/* M11: gaya rambut (gratis saat buat karakter; nanti bisa ganti di salon Toko Serba Ada) */}
          <div>
            <p className="mb-1 text-sm font-extrabold">✂️ Gaya rambut</p>
            <div className="flex flex-wrap gap-1.5">
              {F3.gayaRambut.map((g) => (
                <button
                  key={g.id}
                  onPointerDown={() => ubah({ gaya: g.id })}
                  className={`min-h-14 rounded-xl border-4 px-2 text-ket font-extrabold ${(p.gaya ?? 'pendek') === g.id ? 'border-amber-900 bg-orange-100' : 'border-white bg-white'}`}
                >
                  {g.nama}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-pink-50 px-3 py-2 text-sm font-extrabold">
            🎂 Ulang tahun: tgl {p.ultah.tanggal}, bulan ke-{p.ultah.bulan} tiap semester
            {!kunci && (
              <button
                onPointerDown={() => ubah({ ultah: { tanggal: 1 + Math.floor(Math.random() * 30), bulan: 1 + Math.floor(Math.random() * 4) } })}
                className="ml-auto min-h-14 rounded-tombol bg-netral px-3 text-teks active:scale-[0.98]"
              >
                🎲 Ganti
              </button>
            )}
          </div>

          {galat && <p className="rounded-xl bg-rose-100 px-3 py-1 text-center font-extrabold text-rose-600">{galat}</p>}
          <button
            onPointerDown={selesai}
            className="min-h-16 shrink-0 rounded-tombol bg-aksen text-xl font-extrabold text-teks shadow-tombol active:translate-y-0.5 active:shadow-none"
          >
            ✅ Mulai Hidup Jadi Anak {jur?.ikon} {jur?.nama}!
          </button>
        </div>
      </div>
    </div>
  );
}

function Warna({ judul, daftar, pilih, onPilih }: { judul: string; daftar: readonly string[]; pilih: string; onPilih: (w: string) => void }) {
  return (
    <div>
      <p className="mb-1 text-sm font-extrabold">{judul}</p>
      <div className="flex flex-wrap gap-1.5">
        {daftar.map((w) => (
          <button
            key={w}
            aria-label={w}
            onPointerDown={() => onPilih(w)}
            className={`h-14 w-14 rounded-full border-4 ${pilih === w ? 'scale-110 border-amber-900' : 'border-white'}`}
            style={{ backgroundColor: w }}
          />
        ))}
      </div>
    </div>
  );
}

/** Chibi berputar pelan di pratinjau. */
function Pratinjau({ p }: { p: Profil }) {
  const g = useRef<Group>(null);
  const bergerak = useMemo(() => ({ current: false }), []);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.8;
  });
  return (
    <group ref={g} position={[0, -0.75, 0]}>
      <Chibi kulit={PALETTE.kulit[p.kulit]} rambut={p.rambut} baju={p.baju} gaya={p.gaya} bergerak={bergerak} />
    </group>
  );
}
