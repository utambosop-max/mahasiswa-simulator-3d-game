# HUD kamar kos

Prefab `HUD_Kamar.prefab` membuat uGUI Canvas dan TextMesh Pro saat Play. Tata letaknya menempatkan kalender, uang, IPK, energi, dan stres di atas. Zona joystick menempati 45% kiri area aman, dan tombol interaksi ada di kanan bawah. Canvas Scaler memakai acuan 1920 × 1080 dengan Match 0,5.

## Pemasangan scene

1. Scene `KamarKos` sudah memakai satu instance `HUD_Kamar.prefab`. Tambahkan satu instance prefab jika memakai HUD di scene lain. HUD mengambil `Layanan.Stat` dan `Layanan.Jam`. Joystick mengirim vektor analog ke `Layanan.Gerak.SetJoystick`, lalu pengendali pemain memetakan dead zone.
2. Gunakan satu EventSystem dengan `InputSystemUIInputModule`. HUD membuat EventSystem lokal bila scene belum memiliki EventSystem aktif.
3. HUD membaca dua slot dari `Layanan.Konteks`. `InteraksiPemain` mendaftarkan konteks dan menyediakan aksi dari titik terdekat. Slot kosong disembunyikan. Tombol memeriksa `BolehDilakukan` lalu mengirim `Lakukan`. Alasan penolakan atau hasil aksi tampil sebagai pesan singkat.
4. Untuk uji mandiri tanpa layanan konteks, centang **Tampilkan Aksi Uji** di instance prefab pada scene uji. Pilihan Tidur dan Belajar ditampilkan langsung. Layanan aksi tetap diperlukan untuk menjalankannya.

Font Liberation Sans dan pengaturan TMP berasal dari **TMP Essential Resources** bawaan paket uGUI proyek. Subset ada di `Assets/_Game/UI/TMP/` dan memuat lisensi font. Pakai konfigurasi ini ketika menambahkan label TMP lain.

## Skenario Play Mode

- Verifikasi HUD dan safe area pada 915 × 412, 1280 × 720, dan 2560 × 1440. Periksa jarak antar tombol, panjang saldo, pembesaran teks, dan ruang di bawah HUD.
- Sentuh tepi zona joystick tanpa menggeser jari. Pemain tetap diam. Gerakkan satu jari dan ketuk tombol dengan jari kedua. Lepas jari joystick, pindahkan fokus, atau nonaktifkan HUD untuk memastikan gerak berhenti.
- Dekati kasur atau meja, lalu tekan tombol interaksi sekali. Coba lagi saat sibuk untuk memeriksa alasan penolakan. Jauhi objek untuk memastikan tombol hilang.
