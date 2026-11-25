// Maskot animasi (Si Utan): membal, melambai, berkedip — animasi CSS murni (ringan, tanpa 3D).
import { svgMaskot } from './maskotSvg';

/** `tinggi` dalam kelas Tailwind, mis. "h-40". SVG berasal dari kode kita sendiri (aman, bukan input pengguna). */
export function Maskot({ className = 'h-40' }: { className?: string }) {
  return <div className={`maskot-anim ${className} [&>svg]:h-full [&>svg]:w-auto`} dangerouslySetInnerHTML={{ __html: svgMaskot() }} />;
}
