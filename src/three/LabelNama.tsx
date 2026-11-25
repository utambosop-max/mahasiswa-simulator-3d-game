// Label nama di atas kepala pemain sebagai SPRITE 3D bertekstur kanvas (bukan <Html> drei).
// Alasan: <Html> membuat root React terpisah dan melepasnya secara sinkron saat GameCanvas dipasang/dilepas
// → peringatan konsol "Attempted to synchronously unmount a root while React was already rendering".
// Sprite = 1 draw call, tanpa DOM, ikut tersembunyi di mode foto bersama dunia 3D.
import { useEffect, useMemo } from 'react';
import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';

const TINGGI_PX = 64; // resolusi tekstur (tinggi); lebar menyesuaikan panjang nama
const TINGGI_DUNIA = 0.32; // tinggi label di dunia (meter)

export function LabelNama({ nama, y }: { nama: string; y: number }) {
  // Gambar label sekali per nama (bukan per frame)
  const { tekstur, lebar } = useMemo(() => {
    const kanvas = document.createElement('canvas');
    const g = kanvas.getContext('2d');
    const font = `800 ${TINGGI_PX * 0.5}px ui-rounded, "Segoe UI Rounded", system-ui, sans-serif`;
    let w = TINGGI_PX * 3;
    if (g) {
      g.font = font;
      w = Math.ceil(g.measureText(nama).width + TINGGI_PX * 0.6);
    }
    kanvas.width = w;
    kanvas.height = TINGGI_PX;
    if (g) {
      const r = TINGGI_PX * 0.3;
      // Pil cokelat tua transparan + tepi putih (sama seperti label lama)
      g.beginPath();
      g.roundRect(3, 3, w - 6, TINGGI_PX - 6, r);
      g.fillStyle = 'rgba(59, 42, 32, 0.78)';
      g.fill();
      g.lineWidth = 4;
      g.strokeStyle = '#ffffff';
      g.stroke();
      g.font = font;
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(nama, w / 2, TINGGI_PX / 2 + 1);
    }
    const t = new CanvasTexture(kanvas);
    t.colorSpace = SRGBColorSpace;
    t.minFilter = LinearFilter;
    t.generateMipmaps = false;
    return { tekstur: t, lebar: (w / TINGGI_PX) * TINGGI_DUNIA };
  }, [nama]);

  useEffect(() => () => tekstur.dispose(), [tekstur]);

  return (
    <sprite position={[0, y, 0]} scale={[lebar, TINGGI_DUNIA, 1]} renderOrder={10}>
      <spriteMaterial map={tekstur} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </sprite>
  );
}
