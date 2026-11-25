# Mahasiswa Simulator 3D

Game simulasi kehidupan mahasiswa rantau di Indonesia, bergaya 3D kartun. Pemain mengatur **Uang Saku, IPK, Energi, dan Stres**, kerja sambilan di warteg/warkop, mengobrol dengan warga, pindah kos, menabung, ikut lomba, sampai lulus kuliah — sambil bertahan dari "tanggal tua".

## Isi repo

| Folder | Isi |
|---|---|
| `unity/MahasiswaSim3D/` | Versi utama (Unity 6, URP, Input System). Target Android landscape. |
| `unity/native/msnative/` | Contoh plugin C++ kecil (dengan cadangan C#). |
| `blender/skrip/` | Skrip Python Blender yang membuat semua model 3D (FBX) secara prosedural. |
| `src/`, `server/` | Versi web lama (React + Three.js + Capacitor) sebagai referensi. |

## Menjalankan versi Unity

1. Buka `unity/MahasiswaSim3D` dengan Unity **6000.3.29f1**.
2. Menu **Mahasiswa Sim → Bangun APK Android** untuk membuat APK, atau buka scene `Assets/_Game/Scenes/KamarKos.unity` lalu tekan Play.
3. Tes otomatis: Window → General → Test Runner → EditMode.

## Lisensi aset

- Tekstur, HDRI, dan sebagian model dari [Poly Haven](https://polyhaven.com) dan [ambientCG](https://ambientcg.com) (CC0). Daftar lengkap ada di [CREDITS.md](CREDITS.md).
- Karakter dan animasi dari [Mixamo](https://www.mixamo.com) (Adobe). File mentahnya tidak disertakan di repo ini sesuai lisensi Adobe. Unduh sendiri ke `unity/MahasiswaSim3D/Assets/_Game/Pihak3/Mixamo/` (daftar file ada di CREDITS.md).
- Model lainnya dibuat dengan skrip Blender di `blender/skrip/`. Semua efek suara disintesis lewat kode.
