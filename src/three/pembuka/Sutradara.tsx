// "Sutradara": satu useFrame yang memajukan jam pembuka, menggerakkan kamera, mewarnai langit,
// mengatur terang lampu, dan memicu cue audio. Tidak ada alokasi objek di dalam useFrame.
import { useEffect, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, Fog, type DirectionalLight, type HemisphereLight, type PerspectiveCamera } from 'three';
import { MULAI, SHOT, TOTAL, WARNA_LANGIT, kurva } from './data';
import { jam, usePembuka } from './waktu';
import { aturMesinBus, aturMusik, cuePembuka } from '../../audio/pembuka';

type Props = {
  matahari: RefObject<DirectionalLight | null>;
  langit: RefObject<HemisphereLight | null>;
  onSelesai: () => void;
};

const tmp = new Color();

/** Posisi tokoh di shot pada pecahan f (dipakai kamera "ikut"). */
function posisiTokoh(shot: number, id: string, f: number, out: [number, number]) {
  const daftar = SHOT[shot].tokoh;
  let a = daftar[0];
  for (let k = 0; k < daftar.length; k++) if (daftar[k].id === id) a = daftar[k];
  if (!a || a.id !== id) return;
  out[0] = a.dari[0];
  out[1] = a.dari[1];
  if (!a.ke) return;
  const w = a.jalan ?? [0, 1];
  const u = Math.min(1, Math.max(0, (f - w[0]) / (w[1] - w[0])));
  out[0] += (a.ke[0] - a.dari[0]) * u;
  out[1] += (a.ke[1] - a.dari[1]) * u;
}

export function Sutradara({ matahari, langit, onSelesai }: Props) {
  const { scene, camera, gl } = useThree();
  const lalu = useRef(performance.now());
  const pos = useRef<[number, number]>([0, 0]);
  const sudahSelesai = useRef(false);

  useEffect(() => {
    scene.background = new Color(SHOT[0].langit[0]);
    scene.fog = new Fog(SHOT[0].langit[0], 30, 90);
    lalu.current = performance.now();
    aturMusik(SHOT[0].musik);
    // Info debug untuk skrip tes (FPS & draw call)
    const w = window as unknown as { __pembuka?: { frame: number; calls: number; t: number } };
    w.__pembuka = { frame: 0, calls: 0, t: 0 };
    return () => {
      scene.background = null;
      scene.fog = null;
    };
  }, [scene]);

  useFrame(() => {
    if (sudahSelesai.current) return;
    const now = performance.now();
    // Jam memakai waktu nyata (maks 0,25 dtk/frame) agar sinkron dengan audio walau FPS turun
    const dt = Math.min(0.25, (now - lalu.current) / 1000);
    lalu.current = now;
    const tLama = jam.t;
    jam.t += dt;
    if (jam.lompat) {
      jam.lompat = false;
      jam.t = jam.shot + 1 < SHOT.length ? MULAI[jam.shot + 1] : TOTAL;
    }
    if (jam.t >= TOTAL) {
      sudahSelesai.current = true;
      jam.selesai = true;
      onSelesai();
      return;
    }
    // Cari shot aktif
    let i = jam.shot;
    while (i + 1 < SHOT.length && jam.t >= MULAI[i + 1]) i++;
    const ganti = i !== jam.shot;
    jam.shot = i;
    const s = SHOT[i];
    const lokalLama = ganti ? -0.001 : tLama - MULAI[i];
    jam.lokal = jam.t - MULAI[i];
    const f = jam.lokal / s.durasi;

    if (ganti) {
      aturMusik(s.musik);
      aturMesinBus(!!s.mesin);
    }
    // Cue audio yang terlewati di frame ini
    for (let k = 0; k < s.audio.length; k++) {
      const c = s.audio[k];
      if (c.t > lokalLama && c.t <= jam.lokal) cuePembuka(c.cue);
    }
    // Baris teks yang sudah tampil → UI hanya di-update bila berubah
    let baris = 0;
    for (let k = 0; k < s.teks.length; k++) if (s.teks[k].t <= jam.lokal) baris = k + 1;
    const ui = usePembuka.getState();
    if (ui.shot !== i || ui.baris !== baris) ui.set(i, baris);

    // Kamera: lerp posisi & target dengan kurva; mode "ikut" = offset dari tokoh
    const kam = s.kamera;
    const e = kurva(kam.kurva, f);
    let ox = 0;
    let oz = 0;
    if (kam.ikut) {
      posisiTokoh(i, kam.ikut, f, pos.current);
      ox = pos.current[0];
      oz = pos.current[1];
    }
    const p0 = kam.pos[0];
    const p1 = kam.pos[1];
    const t0 = kam.target[0];
    const t1 = kam.target[1];
    camera.position.set(ox + p0[0] + (p1[0] - p0[0]) * e, p0[1] + (p1[1] - p0[1]) * e, oz + p0[2] + (p1[2] - p0[2]) * e);
    camera.lookAt(ox + t0[0] + (t1[0] - t0[0]) * e, t0[1] + (t1[1] - t0[1]) * e, oz + t0[2] + (t1[2] - t0[2]) * e);
    (camera as PerspectiveCamera).updateMatrixWorld();

    // Langit & lampu: beberapa titik warna dibagi rata sepanjang shot
    const warna = WARNA_LANGIT[i];
    const seg = Math.min(warna.length - 2, Math.floor(f * (warna.length - 1)));
    const u = f * (warna.length - 1) - seg;
    tmp.copy(warna[seg]).lerp(warna[seg + 1], Math.min(1, u));
    if (scene.background instanceof Color) scene.background.copy(tmp);
    if (scene.fog) scene.fog.color.copy(tmp);
    const cah = s.cahaya;
    const cs = Math.min(cah.length - 2, Math.floor(f * (cah.length - 1)));
    const cv = cah[cs] + (cah[cs + 1] - cah[cs]) * Math.min(1, f * (cah.length - 1) - cs);
    if (matahari.current) matahari.current.intensity = 1.5 * cv;
    if (langit.current) langit.current.intensity = 0.35 + 0.65 * cv;

    const w = window as unknown as { __pembuka?: { frame: number; calls: number; t: number } };
    if (w.__pembuka) {
      w.__pembuka.frame++;
      w.__pembuka.calls = gl.info.render.calls;
      w.__pembuka.t = jam.t;
    }
  });
  return null;
}
