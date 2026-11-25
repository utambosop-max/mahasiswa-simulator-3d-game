import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import { Chibi } from './characters/Chibi';
import { MotorModel } from './kendaraan/Model';
import { readMove } from '../game/input';
import { kenaSemua, moveWithCollision, type AABB } from '../game/collision';
import { KAMAR_COLLIDERS, SPAWN_KAMAR, kamarColliders } from '../game/kamarLayout';
import { DUNIA, DUNIA_COLLIDERS, SPAWN_DUNIA } from '../game/duniaLayout';
import { KOTAK_KENDARAAN, SIMPANG_LALIN, warnaLampu } from '../game/lalulintas';
import { kenaTilang } from '../game/m12';
import { ID_MOTOR, PREFIX_WARGA, daftarInteraksi, idWarga, type InteraksiDef, type InteraksiId } from '../game/interaksi';
import { SPAWN_GEDUNG, tataGedung } from '../game/gedungLayout';
import { POS_WARGA, wargaDiajak } from '../game/posisiWarga';
import { useGame, uiTerbuka } from '../game/store';
import { BAL, F2, cuacaHari, infoMotor, isMalam, type Lokasi, type SaveData } from '../game/sim';
import { F4, frekuensiMesin, langkahKendaraan, muJalan, rpmMotor, type KeadaanKendaraan, type ParamKendaraan } from '../game/fisika';
import { playerPos } from '../game/playerPos';
import { aturMesin, sfxLangkah } from '../audio/sfx';
import { useOnline } from '../online/onlineStore';
import { LabelNama } from './LabelNama';
import { PALETTE } from './palette';

const KECEPATAN_JALAN = 3.2; // meter per detik
// Motor memakai fisika (fisika.ts): kecepatan puncak ± 8 m/s muncul dari gaya dorong vs hambatan
const PARAM_MOTOR: ParamKendaraan = F4.fisika.motor;
const RADIUS_JALAN = 0.35;
const RADIUS_MOTOR = 0.55;
const JARAK_LANGKAH = 0.85; // bunyi langkah tiap ± 0.85 m

type Konfig = {
  colliders: readonly AABB[];
  dinamis?: readonly AABB[];
  spawn: { x: number; z: number; rotY: number };
  /** Posisi kamera relatif terhadap pemain (sudut isometric kanan-depan-atas) */
  cam: [number, number, number];
};

const KONFIG: Record<Lokasi, Konfig> = {
  kamar: { colliders: KAMAR_COLLIDERS, spawn: SPAWN_KAMAR, cam: [6, 7.5, 6] },
  dunia: { colliders: DUNIA_COLLIDERS, dinamis: KOTAK_KENDARAAN, spawn: SPAWN_DUNIA, cam: [8, 10, 8] },
  // Kotak tabrakan gedung diambil dari tataGedung() sesuai gedung yang dimasuki
  gedung: { colliders: [], spawn: SPAWN_GEDUNG, cam: [6.5, 8, 6.5] },
};
/** Jarak maksimal untuk mengajak ngobrol warga yang sedang berjalan */
const RADIUS_WARGA = 1.6;
const CAM_MOTOR: [number, number, number] = [10.5, 13, 10.5];

/** Selisih sudut terpendek (-PI..PI) agar karakter tidak berputar memutar jauh. */
const selisihSudut = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/**
 * Cari objek interaktif terdekat dalam jangkauan.
 * Motor pemain (posisinya dinamis) prioritas terendah: hanya dipilih jika tidak ada tempat lain
 * di dekatnya — supaya setelah parkir di depan halte/warung, tombol E tetap memakai tempat itu.
 */
function cariTerdekat(
  daftar: readonly InteraksiDef[],
  x: number,
  z: number,
  motor: { x: number; z: number } | null,
  save: SaveData,
): InteraksiId | null {
  let hasil: InteraksiId | null = null;
  let terbaik = Infinity;
  let dekatMotor = false;
  for (const it of daftar) {
    if (it.syarat && !it.syarat(save)) continue; // objek belum ada (mis. akuarium belum dibeli)
    if (it.id === ID_MOTOR) {
      if (motor && Math.hypot(x - motor.x, z - motor.z) < it.radius) dekatMotor = true;
      continue;
    }
    const d = Math.hypot(x - it.titik[0], z - it.titik[1]);
    if (d < it.radius && d < terbaik) {
      terbaik = d;
      hasil = it.id;
    }
  }
  return hasil ?? (dekatMotor ? ID_MOTOR : null);
}

/** Pemain: gerak (joystick/WASD), tabrakan, kamera ikut, deteksi objek dekat, suara langkah, naik motor. */
export function Player({ lokasi }: { lokasi: Lokasi }) {
  const k = KONFIG[lokasi];
  const gedung = useGame((s) => s.gedung);
  // Di kamar, kotak tabrakan ikut berubah saat perabot di-upgrade (kipas berdiri, pot tanaman)
  const level = useGame((s) => s.level);
  const colliders = useMemo(
    () => (lokasi === 'kamar' ? kamarColliders(level) : lokasi === 'gedung' ? (tataGedung(gedung ?? '')?.colliders ?? []) : k.colliders),
    [lokasi, level, k, gedung],
  );
  const daftarIt = useMemo(() => daftarInteraksi(lokasi, gedung), [lokasi, gedung]);
  const naikMotor = useGame((s) => s.naikMotor);
  const malam = useGame((s) => isMalam(s.fase));
  // Online: baju sesuai warna pilihan (sama seperti yang dilihat teman)
  const bajuOnline = useOnline((s) => ((s.status === 'main' || s.status === 'putus') && s.warna ? s.warna : undefined));
  // Penampilan dari profil (layar Buat Karakter)
  const profil = useGame((s) => s.profil);
  const baju = bajuOnline ?? profil?.baju;
  const kulit = profil ? PALETTE.kulit[profil.kulit] : undefined;
  const rambut = profil?.rambut;
  const group = useRef<Group>(null);
  const bergerak = useRef(false);
  const diam = useRef({ current: false }).current;
  // Titik muncul: bawaan lokasi, atau titik khusus (mis. di depan pintu gedung yang baru ditinggalkan)
  const spawnAwal = useRef(useGame.getState().spawnBerikut ?? k.spawn).current;
  const pos = useRef({ x: spawnAwal.x, z: spawnAwal.z });
  useEffect(() => {
    if (useGame.getState().spawnBerikut) useGame.setState({ spawnBerikut: null });
  }, []);
  const awal = useRef(true);
  const jarakLangkah = useRef(0);
  const bensinPakai = useRef(0);
  const waktuMacet = useRef(0);
  const tubuh = useRef<Group>(null);
  const motorMiring = useRef<Group>(null);
  /** Indeks perempatan berlampu yang sedang dilewati (−1 = tidak di perempatan) */
  const diSimpang = useRef(-1);
  // Keadaan fisika motor (dipakai ulang tiap frame)
  const kend = useRef<KeadaanKendaraan>({ v: 0, arah: spawnAwal.rotY, miring: 0, dorong: 0 }).current;
  const lambai = useRef(false);
  const emoteId = useRef(0);
  const emoteMulai = useRef(0);
  const pakai = useGame((s) => s.pakai);
  const lulus = useGame((s) => s.lulus);
  const warnaMotor = useGame((s) => s.warnaMotor);
  // Sudah wisuda → topi toga otomatis dipakai 🎓
  const aksesoris = useMemo(() => (lulus ? [...pakai, 'toga'] : pakai), [pakai, lulus]);
  const teleportTerakhir = useRef(useGame.getState().teleport?.id ?? 0);

  // Objek dipakai ulang tiap frame (dilarang membuat objek baru di useFrame)
  const arah = useMemo(() => ({ x: 0, y: 0 }), []);
  const camTarget = useMemo(() => new Vector3(), []);
  const camOffset = useMemo(() => new Vector3(...k.cam), [k]);
  const lookTarget = useMemo(() => new Vector3(), []);
  const camera = useThree((s) => s.camera);

  // Di kamar sudut kamera dibatasi (dinding belakang & kiri tinggi)
  useEffect(() => useGame.getState().putarKamera(0), [lokasi]);
  // Pindah lokasi / komponen hilang → mesin motor dimatikan
  useEffect(() => () => aturMesin(false, 0, 0), [lokasi]);

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05); // batasi agar tidak tembus dinding saat lag
    const g = group.current;
    if (!g) return;
    const st = useGame.getState();

    // Perintah pindah posisi (angkot / naik-turun motor). Pilih posisi pertama yang tidak tertutup.
    if (st.teleport && st.teleport.id !== teleportTerakhir.current) {
      const tp = st.teleport;
      teleportTerakhir.current = tp.id;
      const r = st.naikMotor ? RADIUS_MOTOR : RADIUS_JALAN;
      let tx = tp.x;
      let tz = tp.z;
      if (kenaSemua(tx, tz, r, colliders, k.dinamis) && tp.cadangan) {
        for (const [cx, cz] of tp.cadangan) {
          tx = cx;
          tz = cz;
          if (!kenaSemua(cx, cz, r, colliders, k.dinamis)) break;
        }
      }
      pos.current.x = tx;
      pos.current.z = tz;
      g.rotation.y = tp.rotY;
      kend.arah = tp.rotY;
      kend.v = 0;
      if (Math.hypot(camera.position.x - pos.current.x, camera.position.z - pos.current.z) > 30) awal.current = true;
    }

    readMove(arah);
    const kuat = Math.min(1, Math.hypot(arah.x, arah.y));
    // Tidak bisa jalan saat layar transisi / menu terbuka
    bergerak.current = kuat > 0.05 && !uiTerbuka(st);
    const motor = st.naikMotor && lokasi === 'dunia';

    // Arah layar → arah dunia, mengikuti sudut kamera (yaw). Kamera di arah (sin yaw, cos yaw) dari pemain:
    // kanan layar = (cos yaw, −sin yaw), bawah layar = (sin yaw, cos yaw). Yaw π/4 = isometric awal.
    const c = Math.cos(st.kameraSudut);
    const s = Math.sin(st.kameraSudut);
    const wx = kuat > 0 ? (arah.x * c + arah.y * s) / kuat : 0;
    const wz = kuat > 0 ? (-arah.x * s + arah.y * c) / kuat : 0;

    if (motor) {
      // ===== Motor berbasis fisika: gas, meluncur saat joystick dilepas, rem bila joystick ditarik berlawanan =====
      const gas = bergerak.current ? kuat : 0;
      const arahTujuan = bergerak.current ? Math.atan2(wx, wz) : kend.arah;
      // Upgrade mesin menaikkan kecepatan puncak ×n → gaya dorong ×n² (karena hambatan udara ∝ v²)
      const mogok = st.bensin <= 0 ? F2.bensin.kecepatanMogok : 1;
      const pengali = (infoMotor(st).kecepatan * mogok) ** 2;
      const mu = muJalan(cuacaHari(st.hari).id === 'hujan'); // jalan basah = lebih licin, rem lebih jauh
      langkahKendaraan(kend, PARAM_MOTOR, gas, arahTujuan, dt, mu, pengali);
      const d = kend.v * dt;
      const x0 = pos.current.x;
      const z0 = pos.current.z;
      if (d > 0) moveWithCollision(pos.current, Math.sin(kend.arah) * d, Math.cos(kend.arah) * d, RADIUS_MOTOR, colliders, k.dinamis);
      const pindah = Math.hypot(pos.current.x - x0, pos.current.z - z0);
      // Menabrak/menggesek dinding → kecepatan ikut hilang (memantul pelan, koefisien restitusi)
      if (d > 0.001 && pindah < d * 0.5) kend.v = (pindah / dt) * F4.fisika.restitusiTabrak;
      if (gas > 0.5 && pindah < 0.3 * dt) waktuMacet.current += dt;
      else waktuMacet.current = 0;
      if (waktuMacet.current > 1.5 && !st.nyangkut) st.setNyangkut(true);
      if (st.bensin > 0 && pindah > 0) {
        // Bensin berkurang sesuai jarak; disimpan ke store tiap ≥ 1% agar tidak re-render tiap frame
        bensinPakai.current += pindah * F2.bensin.pakaiPerMeter * infoMotor(st).hemat;
        if (bensinPakai.current >= 1) {
          st.kurangiBensin(bensinPakai.current);
          bensinPakai.current = 0;
        }
      }
      g.rotation.y = kend.arah;
      // Motor miring ke dalam tikungan: tan θ = v·ω / g
      if (motorMiring.current) motorMiring.current.rotation.z = -kend.miring;
      bergerak.current = kend.v > 0.2;
      // Lampu merah: dicek tepat saat motor MASUK kotak perempatan berlampu
      let simpang = -1;
      for (let i = 0; i < SIMPANG_LALIN.length; i++) {
        const [sx, sz] = SIMPANG_LALIN[i];
        if (Math.abs(pos.current.x - sx) < DUNIA.jalan && Math.abs(pos.current.z - sz) < DUNIA.jalan) simpang = i;
      }
      if (simpang >= 0 && diSimpang.current < 0 && kend.v > F4.lalin.kecepatanMinTilang) {
        // Arah gerak lebih condong ke sumbu x atau z?
        const sumbu = Math.abs(Math.sin(kend.arah)) > Math.abs(Math.cos(kend.arah)) ? 'x' : 'z';
        if (warnaLampu(sumbu) === 'merah') {
          if (Math.random() < F4.lalin.peluangTilang) st.fitur(kenaTilang, 'peluit');
          else st.toast('🚦 Waduh, nerobos lampu merah! Untung Pak Polisi lagi nengok ke arah lain... 😅');
        }
      }
      diSimpang.current = simpang;
      // Suara mesin ikut RPM (gigi otomatis) — mogok = mesin mati
      aturMesin(st.bensin > 0, frekuensiMesin(rpmMotor(kend.v).rpm), gas);
    } else {
      aturMesin(false, 0, 0);
      kend.v = 0;
      kend.arah = g.rotation.y;
      if (bergerak.current) {
        // Energi rendah → jalan lebih lambat
        const lemas = st.energi < BAL.ambang.energiLemas ? BAL.pengali.kecepatanSaatLemas : 1;
        const v = KECEPATAN_JALAN * lemas * kuat * dt;
        const x0 = pos.current.x;
        const z0 = pos.current.z;
        moveWithCollision(pos.current, wx * v, wz * v, RADIUS_JALAN, colliders, k.dinamis);
        // Deteksi nyangkut: joystick ditekan kuat tapi hampir tidak bergerak selama 1,5 detik → tampilkan tombol 🆘
        const pindah = Math.hypot(pos.current.x - x0, pos.current.z - z0);
        if (kuat > 0.5 && pindah < v * 0.15) waktuMacet.current += dt;
        else waktuMacet.current = 0;
        if (waktuMacet.current > 1.5 && !st.nyangkut) st.setNyangkut(true);
        jarakLangkah.current += pindah;
        if (jarakLangkah.current > JARAK_LANGKAH) {
          jarakLangkah.current = 0;
          sfxLangkah();
        }
        g.rotation.y += selisihSudut(g.rotation.y, Math.atan2(wx, wz)) * Math.min(1, dt * 12);
      }
    }
    playerPos.kecepatan = motor ? kend.v : bergerak.current ? KECEPATAN_JALAN * kuat : 0;
    playerPos.motor = motor;
    g.position.set(pos.current.x, 0, pos.current.z);
    playerPos.x = pos.current.x;
    playerPos.z = pos.current.z;
    playerPos.rotY = g.rotation.y;
    playerPos.gerak = bergerak.current;

    // Update objek terdekat hanya jika berubah (hindari re-render tiap frame)
    let dekat = cariTerdekat(daftarIt, pos.current.x, pos.current.z, motor ? null : st.motorParkir, st);
    // Warga yang lewat: bisa diajak ngobrol kalau tidak ada objek lain di dekat (dan tidak sedang naik motor)
    if ((!dekat || dekat === ID_MOTOR) && lokasi === 'dunia' && !motor) {
      let terbaik = RADIUS_WARGA;
      let pilih: string | null = null;
      for (let i = 0; i < POS_WARGA.length; i++) {
        const p = POS_WARGA[i];
        if (!p.aktif) continue;
        const jarak = Math.hypot(pos.current.x - p.x, pos.current.z - p.z);
        if (jarak < terbaik) {
          terbaik = jarak;
          pilih = p.id;
        }
      }
      // String baru hanya dibuat saat warga terdekat berubah
      const sama = pilih !== null && st.dekat !== null && st.dekat.length === PREFIX_WARGA.length + pilih.length && st.dekat.endsWith(pilih);
      if (pilih) dekat = sama ? st.dekat : `${PREFIX_WARGA}${pilih}`;
    }
    if (dekat !== st.dekat) wargaDiajak.id = idWarga(dekat);
    if (dekat !== st.dekat) st.setDekat(dekat);

    // Kamera mengikuti dengan halus; saat naik motor kamera mundur agar pandangan lebih luas
    const halus = 1 - Math.exp(-dt * 5);
    const off = motor ? CAM_MOTOR : k.cam;
    const z = st.zoom; // zoom kamera (cubit layar / roda mouse / tombol 🔍)
    // Kamera mengelilingi pemain sesuai sudut putar (jarak datar tetap, tinggi tetap)
    const datar = Math.hypot(off[0], off[2]) * z;
    camOffset.x += (Math.sin(st.kameraSudut) * datar - camOffset.x) * halus * 0.6;
    camOffset.y += (off[1] * z - camOffset.y) * halus * 0.6;
    camOffset.z += (Math.cos(st.kameraSudut) * datar - camOffset.z) * halus * 0.6;

    // Emote: lompat / putar / lambai (dihitung dari waktu mulai emote)
    const em = st.emote;
    const tb = tubuh.current;
    if (em && tb) {
      if (em.id !== emoteId.current) {
        emoteId.current = em.id;
        emoteMulai.current = clock.getElapsedTime();
      }
      const t = clock.getElapsedTime() - emoteMulai.current;
      tb.position.y = em.jenis === 'lompat' && t < 0.6 ? Math.sin((Math.PI * t) / 0.6) * 0.8 : 0;
      tb.rotation.y = em.jenis === 'putar' && t < 0.7 ? (Math.PI * 2 * t) / 0.7 : 0;
      lambai.current = em.jenis === 'lambai' && t < 1.6;
    }
    camTarget.set(pos.current.x + camOffset.x, camOffset.y, pos.current.z + camOffset.z);
    if (awal.current) {
      awal.current = false;
      camera.position.copy(camTarget);
      lookTarget.set(pos.current.x, 0.8, pos.current.z);
    } else {
      camera.position.lerp(camTarget, halus);
      lookTarget.x += (pos.current.x - lookTarget.x) * halus;
      lookTarget.z += (pos.current.z - lookTarget.z) * halus;
    }
    camera.lookAt(lookTarget);
  });

  const diatasMotor = naikMotor && lokasi === 'dunia';
  return (
    <group ref={group} position={[spawnAwal.x, 0, spawnAwal.z]} rotation={[0, spawnAwal.rotY, 0]}>
      {diatasMotor ? (
        <>
          <group ref={motorMiring}>
            <MotorModel warna={warnaMotor} malam={malam} />
            <group position={[0, 0.42, -0.12]} scale={0.85}>
              <Chibi baju={baju} kulit={kulit} rambut={rambut} gaya={profil?.gaya} bergerak={diam} tanpaBayangan aksesoris={aksesoris} />
            </group>
          </group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <circleGeometry args={[0.6, 16]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.18} depthWrite={false} />
          </mesh>
        </>
      ) : (
        <group ref={tubuh}>
          <Chibi baju={baju} kulit={kulit} rambut={rambut} gaya={profil?.gaya} bergerak={bergerak} aksesoris={aksesoris} lambai={lambai} />
        </group>
      )}
      {/* Label nama = sprite kanvas (pengganti <Html> drei yang memicu peringatan unmount root) */}
      {profil && <LabelNama nama={profil.nama} y={diatasMotor ? 2.3 : 1.95} />}
    </group>
  );
}
