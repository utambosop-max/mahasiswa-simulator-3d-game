import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

/** Tekstur papan nama yang digambar lewat kode (tanpa file gambar). Otomatis di-dispose. */
export function usePapan(teks: string, bg: string, fg = '#ffffff', lebar = 512, tinggi = 128): CanvasTexture {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = lebar;
    c.height = tinggi;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = bg;
      g.beginPath();
      g.roundRect(0, 0, lebar, tinggi, tinggi * 0.2);
      g.fill();
      g.strokeStyle = '#3b2a20';
      g.lineWidth = 8;
      g.stroke();
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      let ukuran = tinggi * 0.55;
      g.font = `900 ${ukuran}px system-ui, sans-serif`;
      while (g.measureText(teks).width > lebar * 0.88 && ukuran > 10) {
        ukuran -= 2;
        g.font = `900 ${ukuran}px system-ui, sans-serif`;
      }
      g.fillText(teks, lebar / 2, tinggi / 2 + ukuran * 0.05);
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [teks, bg, fg, lebar, tinggi]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
