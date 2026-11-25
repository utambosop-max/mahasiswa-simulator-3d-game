# Model Blender Mahasiswa Simulator 3D

Jalankan perintah ini dari folder utama proyek dengan Blender 5.3.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.3\blender.exe' --background --factory-startup --python-exit-code 1 --python blender/skrip/prop_kasur.py
```

Skrip membuat ulang [sumber Blender](sumber/prop_kasur.blend) dan [model FBX](../unity/MahasiswaSim3D/Assets/_Game/Models/prop_kasur.fbx). Ekspor memakai satuan meter, Forward `-Z`, Up `Y`, dan Apply Transform. Titik asal model berada di tengah alas, tepat pada lantai.

Kasur level 1 mengikuti ukuran acuan kamar kos. Alas busa biru berukuran 1,30 × 1,90 m, bantal krem ada di sisi kepala, dan selimut lipat merah muda ada di sisi kaki. Ketiganya digabung menjadi satu mesh 564 segitiga dan satu material. Palet PNG 12 × 4 piksel tertanam di FBX dan file Blender.

Setelah ekspor, skrip mengimpor ulang FBX di Blender untuk memeriksa ukuran, anggaran segitiga, titik asal, posisi bantal dan selimut, serta warna palet. Saat memasang model di scene Unity, cek skala 1 dan tampilan tiga warna di URP. Jika tekstur belum terpasang, gunakan `Extract Textures` di tab Materials model dan pasang `palet_kasur` pada Base Map material kasur.
# Model Fase 2

Jalankan dari akar repo dengan Blender 5.3:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.3\blender.exe' --background --python-exit-code 1 --python blender/skrip/fase2.py
& 'C:\Program Files\Blender Foundation\Blender 5.3\blender.exe' --background --python-exit-code 1 --python blender/skrip/fase2_sisa.py
& 'C:\Program Files\Blender Foundation\Blender 5.3\blender.exe' --background --python-exit-code 1 --python blender/skrip/verifikasi_fase2.py
```

Skrip membaca `Assets/_Game/Data/dunia.json`, membuat sumber `.blend` dan palet PNG di `blender/sumber/`, lalu mengekspor FBX dan salinan PNG palet ke `Assets/_Game/Models/`. FBX merujuk PNG eksternal dengan path relatif sehingga Unity dapat menemukannya. Sisi depan model gedung adalah Blender -Y, yang menjadi Unity +Z. Semua model memakai satu mesh dan satu material. Papan nama gedung berupa bidang warna; teksnya dapat ditambahkan oleh pembuat scene dari data.
