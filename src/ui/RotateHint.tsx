/** Muncul hanya saat HP dipegang tegak di browser (diatur CSS .rotate-hint). Ikon HP berputar = SVG inline (hormat "kurangi animasi"). */
export function RotateHint() {
  return (
    <div className="rotate-hint fixed inset-0 z-50 flex-col items-center justify-center gap-4 bg-hp-krem px-8 text-center text-teks">
      <svg viewBox="0 0 120 120" className="anim-putar-hp h-28 w-28" aria-hidden>
        {/* HP kartun: casing cokelat tua, layar krem, tombol home */}
        <rect x="38" y="14" width="44" height="92" rx="10" fill="#3b2a20" />
        <rect x="43" y="22" width="34" height="72" rx="5" fill="#fffaf2" />
        <circle cx="60" cy="100" r="2.5" fill="#fff1dc" />
        <path d="M50 64a11 11 0 1 1 10 8" fill="none" stroke="#ff9f4a" strokeWidth="5" strokeLinecap="round" />
        <path d="M44 60l6 6 6-6" fill="none" stroke="#ff9f4a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-judul font-black">Putar HP kamu ke samping ya! 🔄</p>
      <p className="text-isi font-semibold text-teks-2">Game ini dimainkan mendatar (landscape).</p>
    </div>
  );
}
