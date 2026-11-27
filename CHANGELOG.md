# Catatan Perubahan — Anak Kos: Survival Semester

Riwayat versi Unity dan web.

## Unity v0.6.0 — Pencahayaan PC HDRP (2026-11-27)

- Windows x64 memakai HDRP dengan preset Rendah, Sedang, Tinggi, dan Ultra. Preset Tinggi menjadi bawaan.
- Volume per scene mengatur eksposur, langit, dan pantulan. Warteg memakai lampu hangat 3200 K dan kamar memakai lampu dingin serta berkas cahaya jendela.
- Profil Android Hemat dan Tinggi memakai URP.

## Unity v0.5.0 — Kegiatan dan lingkungan Anak Kos (2026-11-27)

- Registrasi mahasiswa, alur pindahan, kebutuhan harian, dan 32 menu Warteg Bahari.
- Delapan aplikasi KosanOS, tantangan singkat, sistem relasi, dan Warisan Senior.
- Kamar hemat 2,5 × 3 m, empat penanda Kampung, bus dan angkot, tiga tingkat banjir, serta musik adaptif.

## Unity v0.4.0 - Anak Kos di Windows (2026-11-26)

- Versi PC mendukung Windows x64. Ukuran jendela dapat diubah.
- Paket Android kini memakai `com.studiomahasiswa.anakkos`. Simpanan dari paket lama tidak otomatis terbawa.

## Unity v0.3.1 — Pagi hingga malam di Kampung (2026-11-26)

- Lampu rumah, jalan, dan plang menyala setelah petang. Hujan membawa genangan, pantulan basah, suara, dan payung warga.
- Warga pergi bekerja, berbelanja, dan pulang sesuai fase hari. Oyen dan ayam berkeliaran, sementara angkot dan motor melintas.
- Langkah kaki berbunyi sesuai permukaan. Kipas, ayam pagi, jangkrik malam, dan kendaraan jauh mengisi suasana.
- Upgrade kamar mengganti perabot, dari tikar dan kipas berdiri hingga spring bed, meja dengan lampu, karpet, dan AC.
- Perbaikan UV genteng, warna pagi dan rumput, skala pemain, serta label Pengaturan.

## Unity v0.3.0 — Kampung dan kos yang lebih hidup (2026-11-26)

- Bangunan Kampung mendapat fasad baru, jendela berbingkai, teras, dan papan nama. Tanah dan jalan memakai paving, got, genangan, serta polisi tidur.
- Motor bebek pemain dan warga tampil dengan roda terpisah. Roda pemain berputar sesuai gerak. Ada angkot dan gerobak baru.
- Kamar dan 17 interior mendapat perabot tambahan. Kamera gedung sekarang mulai dari sisi dinding rendah agar isi ruang lebih mudah dilihat.
- Pengaturan punya ikon di kanan atas. Toast mengikuti panjang pesan, dan Buku Sakti menampilkan jumlah tujuan yang selesai.
- Kabut dan warna langit mengikuti waktu. Mode Tinggi memberi bayangan lembut dan partikel udara.

## Unity v0.2.0 — Rombak visual realistis (2026-11-26)

- Kamar, Kampung, dan 17 interior memakai permukaan bertekstur, pencahayaan baru, dan detail lingkungan tambahan.
- Versi uji memuat enam pilihan model humanoid dengan animasi jalan, lari, duduk, tidur, minum, mengobrol, dan melambai.
- Pengaturan menyimpan volume, mutu grafis, ukuran teks, laju putar kamera, dan getar. Energi dan stres bergerak bertahap, dan Buku Sakti menampilkan ringkasan tujuan.
- Tekan Klakson saat naik motor untuk mendapat tanggapan warga terdekat. Minum Air tersedia dekat galon di kamar.
- Kamera kamar mulai menghadap dari sisi dinding rendah agar perabot dan pemain lebih mudah terlihat.

## Unity v0.1.1 — Antarmuka baru (2026-11-25)

- Lihat jam, uang, IPK, energi, stres, dan cuaca di HUD baru. Tombol aksi dan joystick lebih mudah dikenali di layar kecil.
- Dialog mengikuti panjang isi dan bisa disembunyikan sementara. Daftar di Rapor, menu, dan panel lain bisa digulir.
- Kamera bergerak lebih halus di Kampung. Dinding kamar memudar jika menghalangi pandangan.
- Pesan hasil aksi tampil di bagian atas layar. Panel racik menjaga posisi tombol saat memberi umpan balik.
- Kafe memiliki empat pesanan. Pembelian dari menu langsung tersimpan dan game dapat memulihkan save dari file cadangan.

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
