# Catatan Perubahan — Mahasiswa Simulator 3D

Format versi: MAJOR.MINOR.PATCH (MINOR = milestone). Lihat skill `release-pipeline`.

## v0.13.0 — Buku Sakti Ibu: Rombak Besar (2026-11-23)
⚠️ Main online: protokol v2 — perbarui server di PC (`rilis/server-online`) **dan** semua HP ke APK ini.

### Baru
- **Cerita utama "Buku Sakti Ibu"**: prolog, 8 bab, celengan bantu warung Ibu, 4 ending.
- **Animasi pembuka** 60 detik (berangkat dari kampung halaman), bisa dilewati & ditonton ulang di Pengaturan.
- **Dunia 1,7× lebih luas**: kali + 3 jembatan, Gang Kos Mawar, sawah & kebun, Pasar Kaget malam, Lapangan Kampung; warga figuran, merpati, kucing di atap.
- Aksi baru: mancing, jajan pasar kaget, ngopi tepi kali, es degan, bantu panen (Sabtu–Minggu), main bola. +6 kendaraan.
- **UI tema HP mahasiswa**: home screen 13 aplikasi, notifikasi ala HP, event bergaya chat, saklar "Kurangi animasi". Tombol Kembali Android menutup menu → konfirmasi keluar.
- Karakter chibi dirombak: mata besar, rambut bervolume, animasi lebih hidup.
- Suara suasana area baru (kali, kodok, pasar, angin).

### Diubah
- Gaji shift warteg ± Rp55 rb, warkop ± Rp50 rb (sebelumnya terlalu cepat kaya).

### Diperbaiki
- 20 bug online: server bisa crash/macet karena data aneh, progres hilang saat file rusak, sesi "hantu", traktir mencetak uang, dll. Sambung ulang otomatis.
- Kebocoran memori grafis (game makin berat lama-lama), FPS lebih ringan (beban gambar −18–40%).
- Event acak tidak lagi hilang saat bersamaan dengan cerita; HUD tidak kebesaran di mode Teks besar.

## v0.11.0 — Jam Real-time, Kos, Warga & Pacaran (2026-11-20)
⚠️ Main online: perbarui server di PC (`rilis/server-online`) **dan** semua HP ke APK ini.

### Baru
- Jam berjalan terus (1 detik = 1 menit), aksi memakan jam, jam berhenti saat menu dibuka, tombol ⏳ tunggu 1 jam.
- 6 pilihan kos (biasa, bebas, hemat-galak, angker, 2 kos mewah), pemilik baik/galak, jam malam, pindah kos lewat HP.
- Kamar mandi & toilet di kamar, Wisma Kenanga berhantu 👻.
- Semua gedung & rumah warga bisa dimasuki; Kafe Ruang Kerja (WFH & nugas).
- 13 warga bernama: ngobrol, hadiah, pacaran, kencan, tinggal bareng; pacaran dengan teman online.
- 4 beasiswa, 10 gaya rambut + salon, 8 tas & aksesoris baru.
- Kamera bisa diputar & dicubit-zoom, mode grafik Ultra.

### Diperbaiki
- UI kekecilan / terpotong di layar besar.
- Nyangkut setelah ditabrak kendaraan (+ tombol 🆘).
- Benda melayang di langit (dihapus).

## v0.10 — Maskot Si Utan
- Ikon APK, splash, dan logo animasi dari boneka orangutan.

## v0.9 — Online lewat internet
- Server di PC + Cloudflare Tunnel, kode rahasia, server 24 jam.

## v0.5 – v0.8
- v0.5 versi offline pertama (cadangan: `rilis/MahasiswaSimulator3D-v0.5-offline.apk`), v0.6 co-op WiFi, v0.7 buat karakter + 55 fitur, v0.8 +87 fitur & 20 event.
