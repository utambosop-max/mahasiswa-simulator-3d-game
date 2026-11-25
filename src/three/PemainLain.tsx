// Karakter teman-teman (online): chibi dengan warna baju pilihan, label nama, gelembung chat.
// Posisi dari server (10×/detik) dihaluskan tiap frame agar gerakannya tidak patah-patah.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import { Chibi } from './characters/Chibi';
import { MotorModel } from './kendaraan/Model';
import { useGame } from '../game/store';
import { isMalam, type Lokasi } from '../game/sim';
import { playerPos } from '../game/playerPos';
import { useOnline } from '../online/onlineStore';
import { poseLain } from '../online/net';
import type { InfoPemain } from '../online/protokol';
import { PALETTE } from './palette';

const selisihSudut = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/** Semua teman yang berada di tempat yang sama (dunia luar, atau kamar kos yang sama). */
export function PemainLain({ lokasi }: { lokasi: Lokasi }) {
  const online = useGame((s) => s.online);
  const pemain = useOnline((s) => s.pemain);
  const saya = useOnline((s) => s.saya);
  const kamarSaya = useOnline((s) => s.kamar?.kamarId);
  if (!online) return null;
  const terlihat = pemain.filter(
    (p) => p.id !== saya && p.status !== 'offline' && (lokasi !== 'kamar' || p.kamarId === kamarSaya),
  );
  return (
    <>
      {terlihat.map((p) => (
        <Teman key={p.id} info={p} lokasi={lokasi} />
      ))}
      <GelembungSaya />
    </>
  );
}

function Teman({ info, lokasi }: { info: InfoPemain; lokasi: Lokasi }) {
  const group = useRef<Group>(null);
  const bergerak = useRef(false);
  const diam = useMemo(() => ({ current: false }), []);
  const awal = useRef(true);
  const motor = useRef(false);
  const tampil = useRef(false);
  const malam = useGame((s) => isMalam(s.fase));
  const gelembung = useOnline((s) => s.gelembung[info.id]);
  const motorGrup = useRef<Group>(null);
  const jalanGrup = useRef<Group>(null);

  useFrame((_, rawDt) => {
    const g = group.current;
    if (!g) return;
    const pose = poseLain.get(info.id);
    // Sembunyikan jika teman ada di tempat lain (mis. dia di kamar, kita di luar)
    // Di dalam gedung: hanya teman di gedung yang sama
    const ada = !!pose && pose.lokasi === lokasi && (lokasi !== 'gedung' || pose.gedung === useGame.getState().gedung);
    if (ada !== tampil.current) {
      tampil.current = ada;
      g.visible = ada;
      awal.current = true;
    }
    if (!pose || !ada) return;
    const dt = Math.min(rawDt, 0.05);
    const jauh = Math.hypot(g.position.x - pose.x, g.position.z - pose.z);
    if (awal.current || jauh > 6) {
      // Pertama muncul / pindah jauh (angkot) → langsung lompat
      awal.current = false;
      g.position.set(pose.x, 0, pose.z);
      g.rotation.y = pose.rotY;
    } else {
      const k = 1 - Math.exp(-dt * 12);
      g.position.x += (pose.x - g.position.x) * k;
      g.position.z += (pose.z - g.position.z) * k;
      g.rotation.y += selisihSudut(g.rotation.y, pose.rotY) * k;
    }
    bergerak.current = pose.gerak && !pose.motor;
    if (pose.motor !== motor.current) {
      motor.current = pose.motor;
      if (motorGrup.current) motorGrup.current.visible = pose.motor;
      if (jalanGrup.current) jalanGrup.current.visible = !pose.motor;
    }
  });

  return (
    <group ref={group} visible={false}>
      <group ref={jalanGrup}>
        <Chibi
          baju={info.warna}
          kulit={info.kulit !== undefined ? PALETTE.kulit[info.kulit] : undefined}
          rambut={info.rambut}
          gaya={info.gaya}
          bergerak={bergerak}
          aksesoris={info.aks ?? []}
        />
      </group>
      <group ref={motorGrup} visible={false}>
        <MotorModel warna={info.warna} malam={malam} />
        <group position={[0, 0.42, -0.12]} scale={0.85}>
          <Chibi baju={info.warna} bergerak={diam} tanpaBayangan />
        </group>
      </group>
      <Html position={[0, 2.05, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col items-center gap-1 whitespace-nowrap">
          {gelembung && (
            <div key={gelembung.id} className="anim-datang max-w-44 rounded-2xl border-2 border-white bg-white px-2 py-1 text-center text-sm font-extrabold text-amber-900 shadow">
              {gelembung.teks}
            </div>
          )}
          <div
            className="rounded-lg border-2 border-white px-1.5 text-[11px] font-extrabold text-white shadow"
            style={{ backgroundColor: info.warna, textShadow: '0 1px 0 #3b2a20' }}
          >
            {info.nama}
            {info.status === 'tidur' ? ' 😴' : info.status === 'kerja' ? ' 💼' : ''}
          </div>
        </div>
      </Html>
    </group>
  );
}

/** Gelembung chat di atas kepala saya sendiri (supaya tahu pesan terkirim). */
function GelembungSaya() {
  const group = useRef<Group>(null);
  const saya = useOnline((s) => s.saya);
  const gelembung = useOnline((s) => (saya ? s.gelembung[saya] : undefined));
  useFrame(() => {
    if (group.current) group.current.position.set(playerPos.x, 0, playerPos.z);
  });
  if (!gelembung) return null;
  return (
    <group ref={group}>
      <Html position={[0, 2.05, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div key={gelembung.id} className="anim-datang max-w-44 rounded-2xl border-2 border-white bg-white px-2 py-1 text-center text-sm font-extrabold whitespace-nowrap text-amber-900 shadow">
          {gelembung.teks}
        </div>
      </Html>
    </group>
  );
}
