// Maskot "Si Utan": orangutan boneka berhoodie kuning & celana abu (dari foto pemilik proyek),
// digambar ulang sebagai SVG kartun chibi (kepala besar, outline cokelat tua #3b2a20, palet pastel).
// Dipakai untuk: logo animasi layar judul, ikon APK, splash screen, favicon.
// File ini HANYA berisi teks SVG (tanpa React) agar bisa dipakai juga oleh skrip pembuat ikon (Node).

const GARIS = '#3b2a20';
const W = {
  bulu: '#9a5634',
  buluGelap: '#7a4026',
  wajah: '#ecc9a2',
  moncong: '#dfb68c',
  tangan: '#d9a77c',
  hoodie: '#f2d15c',
  hoodieGelap: '#d9b440',
  celana: '#b9c3d1',
  celanaGelap: '#9aa6b8',
  mataPutih: '#fdf3e3',
  mataCincin: '#c99a6e',
  pupil: '#2a1d15',
  pipi: '#ff9aa2',
};

/** Isi SVG maskot dalam koordinat 0..200 × 0..230 (tanpa tag <svg>). */
export function isiMaskot(): string {
  const g = `stroke="${GARIS}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
  return `
  <g class="m-badan">
    <!-- Kaki & telapak -->
    <path d="M72 196 q-4 18 -16 24 q-10 6 -2 10 q20 2 30 -12 q6 -10 4 -22 z" fill="${W.bulu}" ${g}/>
    <path d="M128 196 q4 18 16 24 q10 6 2 10 q-20 2 -30 -12 q-6 -10 -4 -22 z" fill="${W.bulu}" ${g}/>
    <ellipse cx="58" cy="224" rx="15" ry="7" fill="${W.tangan}" ${g}/>
    <ellipse cx="142" cy="224" rx="15" ry="7" fill="${W.tangan}" ${g}/>
    <!-- Celana pendek abu -->
    <path d="M62 168 h76 l6 34 q-18 6 -34 0 l-10 -14 l-10 14 q-16 6 -34 0 z" fill="${W.celana}" ${g}/>
    <path d="M100 176 v12" stroke="${W.celanaGelap}" stroke-width="3" stroke-linecap="round"/>
    <!-- Lengan kiri (diam) -->
    <path d="M64 132 q-26 14 -34 46 q-2 10 8 10 q10 -2 14 -14 q6 -18 20 -26 z" fill="${W.bulu}" ${g}/>
    <ellipse cx="34" cy="186" rx="12" ry="9" fill="${W.tangan}" ${g}/>
    <!-- Badan: hoodie kuning -->
    <path d="M58 128 q42 -14 84 0 q10 22 2 46 q-44 10 -88 0 q-8 -24 2 -46 z" fill="${W.hoodie}" ${g}/>
    <path d="M78 150 q22 8 44 0" fill="none" stroke="${W.hoodieGelap}" stroke-width="3" stroke-linecap="round"/>
  </g>
  <!-- Lengan kanan (melambai saat animasi) -->
  <g class="m-lengan">
    <path d="M140 134 q22 14 30 44 q2 10 -8 10 q-10 -2 -14 -14 q-5 -16 -14 -24 z" fill="${W.bulu}" ${g}/>
    <ellipse cx="166" cy="186" rx="12" ry="9" fill="${W.tangan}" ${g}/>
  </g>
  <g class="m-kepala">
    <!-- Tudung hoodie di belakang kepala -->
    <circle cx="100" cy="80" r="64" fill="${W.hoodie}" ${g}/>
    <path d="M46 104 q54 40 108 0" fill="none" stroke="${W.hoodieGelap}" stroke-width="3" stroke-linecap="round"/>
    <!-- Telinga -->
    <circle cx="50" cy="86" r="11" fill="${W.wajah}" ${g}/>
    <circle cx="150" cy="86" r="11" fill="${W.wajah}" ${g}/>
    <!-- Kepala berbulu -->
    <ellipse cx="100" cy="84" rx="50" ry="47" fill="${W.bulu}" ${g}/>
    <path d="M78 40 q8 -8 14 0 q8 -9 16 0 q8 -8 14 2" fill="none" stroke="${W.buluGelap}" stroke-width="3" stroke-linecap="round"/>
    <!-- Wajah terang -->
    <path d="M60 86 q0 -30 40 -30 q40 0 40 30 q0 38 -40 40 q-40 -2 -40 -40 z" fill="${W.wajah}" ${g}/>
    <!-- Mata besar bercincin -->
    <g class="m-mata">
      <circle cx="82" cy="82" r="15" fill="${W.mataPutih}" stroke="${W.mataCincin}" stroke-width="4"/>
      <circle cx="118" cy="82" r="15" fill="${W.mataPutih}" stroke="${W.mataCincin}" stroke-width="4"/>
      <circle cx="84" cy="83" r="8" fill="${W.pupil}"/>
      <circle cx="116" cy="83" r="8" fill="${W.pupil}"/>
      <circle cx="87" cy="80" r="3" fill="#fff"/>
      <circle cx="119" cy="80" r="3" fill="#fff"/>
    </g>
    <!-- Pipi merona -->
    <ellipse cx="68" cy="104" rx="7" ry="4.5" fill="${W.pipi}" opacity="0.55"/>
    <ellipse cx="132" cy="104" rx="7" ry="4.5" fill="${W.pipi}" opacity="0.55"/>
    <!-- Moncong, hidung, senyum -->
    <ellipse cx="100" cy="108" rx="24" ry="16" fill="${W.moncong}" ${g}/>
    <path d="M94 100 q6 -6 12 0 q-6 6 -12 0 z" fill="${W.buluGelap}"/>
    <path d="M88 112 q12 9 24 0" fill="none" stroke="${GARIS}" stroke-width="3.5" stroke-linecap="round"/>
  </g>`;
}

/** SVG lengkap maskot (latar transparan). */
export const svgMaskot = (kelas = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 232" class="${kelas}" role="img" aria-label="Maskot Si Utan">${isiMaskot()}</svg>`;

/**
 * SVG ikon aplikasi: latar kotak membulat (atau lingkaran) gradasi oranye-krem + maskot (kepala & badan, diperbesar).
 * `bentuk`: 'kotak' (ikon biasa), 'bulat' (ikon bulat), 'polos' (latar transparan, untuk ikon adaptif Android).
 */
export function svgIkon(bentuk: 'kotak' | 'bulat' | 'polos'): string {
  const latar =
    bentuk === 'polos'
      ? ''
      : bentuk === 'bulat'
        ? '<circle cx="128" cy="128" r="128" fill="url(#lg)"/>'
        : '<rect width="256" height="256" rx="56" fill="url(#lg)"/>';
  // Ikon adaptif: maskot harus di "zona aman" tengah (± 66% dari kanvas) karena tepi dipotong launcher
  const skala = bentuk === 'polos' ? 0.78 : 1.12;
  const geser = bentuk === 'polos' ? `translate(${128 - 100 * skala} ${118 - 110 * skala})` : `translate(${128 - 100 * skala} ${34})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9b8"/><stop offset="1" stop-color="#ffb36b"/></linearGradient></defs>
  ${latar}
  <g transform="${geser} scale(${skala})">${isiMaskot()}</g>
</svg>`;
}
