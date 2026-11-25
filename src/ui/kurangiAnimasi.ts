// Saklar "Kurangi animasi" (Pengaturan). Disimpan di localStorage (dibungkus try/catch, default: mati).
// Saat nyala, kelas `kurangi-animasi` dipasang di <html> → CSS mematikan geser/goyang/membal (lihat index.css).
const KUNCI = 'mhs-kurangi-animasi';

export function bacaKurangiAnimasi(): boolean {
  try {
    return localStorage.getItem(KUNCI) === '1';
  } catch {
    return false;
  }
}

export function terapkanKurangiAnimasi(nyala: boolean) {
  document.documentElement.classList.toggle('kurangi-animasi', nyala);
  try {
    localStorage.setItem(KUNCI, nyala ? '1' : '0');
  } catch {
    /* penyimpanan penuh / diblokir → cukup berlaku sampai game ditutup */
  }
}
