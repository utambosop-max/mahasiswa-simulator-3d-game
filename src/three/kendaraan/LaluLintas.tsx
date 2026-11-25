import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { KENDARAAN, langkahLaluLintas } from '../../game/lalulintas';
import { playerPos } from '../../game/playerPos';
import { useGame } from '../../game/store';
import { isMalam } from '../../game/sim';
import { aturKendaraanLewat, sfxKlakson } from '../../audio/sfx';
import { doppler } from '../../game/fisika';
import type { JenisKendaraan } from '../../game/lalulintas';

// Suara kendaraan lewat: hanya kendaraan terdekat (1 suara saja, hemat & tidak berisik)
const JANGKAUAN_SUARA = 22; // meter
const LEBIH_DOPPLER = 6; // pengali agar geseran nada terdengar jelas
const NADA_MESIN: Record<JenisKendaraan, number> = { motor: 75, mobil: 48, angkot: 42 };
import { Chibi } from '../characters/Chibi';
import { AngkotModel, MobilModel, MotorModel } from './Model';

const DIAM = { current: false };
const JAUH_TAMPIL = 32; // meter
const WARNA_PENGENDARA = ['#ff9aa2', '#a0c4ff', '#caffbf', '#ffd6a5', '#bdb2ff'];

/** Semua kendaraan NPC. Satu useFrame menggerakkan semuanya (hemat). */
export function LaluLintas() {
  const malam = useGame((s) => isMalam(s.fase));
  const refs = useRef<(Group | null)[]>([]);
  // Keluar dari dunia (masuk kamar/gedung) → suara kendaraan berhenti
  useEffect(() => () => aturKendaraanLewat(false, 0, 0), []);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    if (useGame.getState().transisi) return; // jangan bergerak saat layar transisi
    const klakson = langkahLaluLintas(dt, playerPos.x, playerPos.z);
    if (klakson) sfxKlakson();
    let terdekat = -1;
    let jarakMin = JANGKAUAN_SUARA;
    for (let i = 0; i < KENDARAAN.length; i++) {
      const k = KENDARAAN[i];
      const d = Math.hypot(k.x - playerPos.x, k.z - playerPos.z);
      if (d < jarakMin && k.v > 0.5) {
        jarakMin = d;
        terdekat = i;
      }
      const g = refs.current[i];
      if (!g) continue;
      // Culling jarak: kendaraan > 32 m dari pemain di luar pandangan kamera → tidak digambar sama sekali
      const tampil = d < JAUH_TAMPIL;
      if (g.visible !== tampil) g.visible = tampil;
      if (!tampil) continue;
      g.position.set(k.x, 0, k.z);
      g.rotation.y = k.rotY;
    }
    // Efek Doppler: f' = f·c / (c − v_radial). v_radial > 0 = kendaraan mendekati pemain.
    if (terdekat >= 0) {
      const k = KENDARAAN[terdekat];
      const lajur = k.def.lajur;
      const vx = lajur.sumbu === 'x' ? lajur.arah * k.v : 0;
      const vz = lajur.sumbu === 'z' ? lajur.arah * k.v : 0;
      const rx = playerPos.x - k.x;
      const rz = playerPos.z - k.z;
      const vRadial = (vx * rx + vz * rz) / Math.max(0.5, jarakMin);
      // Kecepatan di game kecil (± 8 m/s → geser cuma ± 2%), jadi dilebih-lebihkan agar terdengar
      const frek = doppler(NADA_MESIN[k.def.jenis], vRadial * LEBIH_DOPPLER);
      // Kekerasan suara turun dengan jarak (≈ 1/jarak, dibatasi 0..1)
      const vol = Math.min(1, 2.5 / Math.max(2.5, jarakMin)) * (1 - jarakMin / JANGKAUAN_SUARA);
      aturKendaraanLewat(true, frek, vol);
    } else aturKendaraanLewat(false, 0, 0);
  });

  return (
    <group>
      {KENDARAAN.map((k, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[k.x, 0, k.z]}
          rotation={[0, k.rotY, 0]}
        >
          {k.def.jenis === 'mobil' && <MobilModel warna={k.def.warna} malam={malam} />}
          {k.def.jenis === 'angkot' && <AngkotModel warna={k.def.warna} malam={malam} />}
          {k.def.jenis === 'motor' && (
            <>
              <MotorModel warna={k.def.warna} malam={malam} />
              <group position={[0, 0.42, -0.12]} scale={0.85}>
                <Chibi bergerak={DIAM} baju={WARNA_PENGENDARA[i % WARNA_PENGENDARA.length]} tanpaBayangan />
              </group>
            </>
          )}
        </group>
      ))}
    </group>
  );
}
