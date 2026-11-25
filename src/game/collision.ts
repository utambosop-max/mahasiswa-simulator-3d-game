// Sistem tabrakan sederhana tanpa library fisika.
// Dunia = kumpulan kotak (AABB) di bidang lantai X-Z. Pemain = lingkaran.

export type AABB = { minX: number; maxX: number; minZ: number; maxZ: number };

/** Buat kotak dari titik tengah + ukuran (lebar di X, dalam di Z). */
export function boxAt(cx: number, cz: number, w: number, d: number): AABB {
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 };
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function circleHitsBox(x: number, z: number, r: number, b: AABB): boolean {
  // Titik terdekat di kotak terhadap pusat lingkaran
  const nx = clamp(x, b.minX, b.maxX);
  const nz = clamp(z, b.minZ, b.maxZ);
  const dx = x - nx;
  const dz = z - nz;
  return dx * dx + dz * dz < r * r;
}

function collides(x: number, z: number, r: number, boxes: readonly AABB[]): boolean {
  for (const b of boxes) if (circleHitsBox(x, z, r, b)) return true;
  return false;
}

/**
 * Gerakkan `pos` sejauh (dx, dz). Sumbu X dan Z dicoba terpisah,
 * jadi saat menabrak dinding pemain tetap bisa "meluncur" di sepanjang dinding.
 */
export function moveWithCollision(
  pos: { x: number; z: number },
  dx: number,
  dz: number,
  r: number,
  boxes: readonly AABB[],
  /** Kotak yang bergerak (kendaraan) — opsional */
  dinamis?: readonly AABB[],
): void {
  // Ditabrak/ditindih kendaraan: pemain sudah ada DI DALAM kotak kendaraan → dorong keluar ke sisi
  // terdekat yang aman, lalu abaikan kendaraan di langkah ini (dulu: pemain terkunci = nyangkut).
  if (dinamis && collides(pos.x, pos.z, r, dinamis)) {
    for (const b of dinamis) if (circleHitsBox(pos.x, pos.z, r, b)) dorongKeluar(pos, r, b, boxes);
    dinamis = undefined;
  }
  const nx = pos.x + dx;
  if (!kenaSemua(nx, pos.z, r, boxes, dinamis)) pos.x = nx;
  const nz = pos.z + dz;
  if (!kenaSemua(pos.x, nz, r, boxes, dinamis)) pos.z = nz;
}

/** Pindahkan lingkaran ke luar kotak lewat sisi terdekat yang tidak menabrak tembok/pohon. */
function dorongKeluar(pos: { x: number; z: number }, r: number, b: AABB, boxes: readonly AABB[]) {
  const j = r + 0.05;
  const calon: [number, number][] = [
    [b.minX - j, pos.z],
    [b.maxX + j, pos.z],
    [pos.x, b.minZ - j],
    [pos.x, b.maxZ + j],
  ];
  calon.sort((a, c) => Math.hypot(a[0] - pos.x, a[1] - pos.z) - Math.hypot(c[0] - pos.x, c[1] - pos.z));
  const aman = calon.find(([x, z]) => !collides(x, z, r, boxes)) ?? calon[0];
  pos.x = aman[0];
  pos.z = aman[1];
}

export function kenaSemua(x: number, z: number, r: number, boxes: readonly AABB[], dinamis?: readonly AABB[]): boolean {
  return collides(x, z, r, boxes) || (dinamis !== undefined && collides(x, z, r, dinamis));
}
