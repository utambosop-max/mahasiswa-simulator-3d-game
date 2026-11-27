// Kontrak bersama antara logika inti dan UI/Audio/MiniGame.
// Ubah dengan hati-hati: semua modul bergantung pada file ini.
using System;

namespace MS.Kontrak
{
    /// <summary>5 fase waktu, sama dengan game web (src/game/sim.ts).</summary>
    public enum Fase { Pagi, Siang, Sore, Malam, Begadang }

    /// <summary>Stat utama pemain. UI hanya MEMBACA, tidak boleh mengubah.</summary>
    public interface IStatPemain
    {
        int Uang { get; }
        float Ipk { get; }      // 0.00 – 4.00
        float Energi { get; }   // 0 – 100
        float Stres { get; }    // 0 – 100
        event Action Berubah;   // dipanggil setiap ada stat yang berubah
    }

    public interface IVitalPemain
    {
        float Kenyang { get; }
        float Maag { get; }
        float Hidrasi { get; }
        float Kebersihan { get; }
        float MasukAngin { get; }
        float Fokus { get; }
        float Kejenuhan { get; }
    }

    /// <summary>Jam & kalender game.</summary>
    public interface IJamGame
    {
        int Hari { get; }       // hari ke- sejak mulai
        int Tanggal { get; }    // tanggal dalam bulan (tanggal tua = mendekati akhir bulan)
        Fase Fase { get; }
        float Menit { get; }    // menit sejak 05.00 (untuk jam di HUD)
        bool Sibuk { get; }     // sedang melakukan aksi berwaktu → kunci tombol aksi
        bool TanggalTua { get; }
        event Action Berubah;
    }

    /// <summary>Aksi yang diminta UI. Id sama dengan id di Data/aksi.json.</summary>
    public readonly struct PerintahAksi
    {
        public readonly string Id;
        public readonly string Target; // opsional, mis. id makanan / id upgrade
        public PerintahAksi(string id, string target = null) { Id = id; Target = target; }
    }

    /// <summary>Penerima aksi, diimplementasikan logika inti.</summary>
    public interface IPenerimaAksi
    {
        bool BolehDilakukan(PerintahAksi aksi, out string alasan);
        void Lakukan(PerintahAksi aksi);
        string PesanTerakhir { get; }          // teks hasil aksi untuk toast
        int HargaMenu(string idAksi, string idMenu);   // harga resmi saat ini (termasuk tanggal tua); -1 bila tidak dikenal
        event Action<string> PesanMasuk;      // dipanggil untuk SETIAP pesan baru (aksi, bolos, kiriman, kos, dll.)
        event Action<string> AksiMulai;        // id aksi → hook animasi/audio
    }

    /// <summary>Pemutar suara, diimplementasikan di Scripts/Audio.</summary>
    public interface IPenyediaAudio
    {
        void Mainkan(string idSuara);
    }

    /// <summary>Joystick virtual (UI) → gerak pemain. Nilai x,y −1..1.</summary>
    public interface IInputGerak
    {
        void SetJoystick(float x, float y);
    }

    /// <summary>Aksi yang tersedia di dekat pemain (dari titik interaksi). HUD mengisi tombol aksi dari sini.</summary>
    public interface IKonteksInteraksi
    {
        PerintahAksi? Utama { get; }      // null = tidak ada apa-apa di dekat pemain
        string NamaUtama { get; }
        PerintahAksi? Tambahan { get; }   // aksi kedua opsional (mis. kasur: Tidur + Rebahan)
        string NamaTambahan { get; }
        event Action Berubah;
        /// <summary>E/Spasi ditekan. HUD berlangganan agar keyboard lewat jalur yang sama dengan tombol layar
        /// (mis. buka panel menu dulu). Tanpa pelanggan, aksi dijalankan langsung.</summary>
        event Action MintaUtama;
    }

    /// <summary>Event acak yang sedang tampil (data siap tampil, tanpa logika).</summary>
    public sealed class EventTampil
    {
        public string Id, Ikon, Judul, Teks;
        public string[] Pilihan;   // label tombol, urutan = indeks untuk Pilih()
    }

    /// <summary>Event acak (WA Ibu Kos, tugas dadakan, dll.). UI menampilkan Aktif lalu memanggil Pilih(i).
    /// Selama Aktif != null, jam game berhenti.</summary>
    public interface IEventAcak
    {
        EventTampil Aktif { get; }
        bool BolehPilih(int indeks, out string alasan); // false → tombol abu-abu + alasan
        void Pilih(int indeks);                         // hasil dikirim lewat IPenerimaAksi.PesanMasuk
        event Action Berubah;                           // event muncul / selesai
    }

    /// <summary>Hasil satu shift mini-game kerja (dikirim MiniGame).</summary>
    public readonly struct HasilKerja
    {
        public readonly int Benar, Gagal;   // pesanan benar / pelanggan kecewa (pergi atau salah)
        public readonly float Tips;         // jumlah tip (Rp) = Σ tipMaks × sisa sabar / sabar awal
        public HasilKerja(int benar, int gagal, float tips) { Benar = benar; Gagal = gagal; Tips = tips; }
    }

    /// <summary>Rincian gaji untuk layar hasil.</summary>
    public readonly struct RincianGaji
    {
        public readonly int Dasar, Bonus, Tips, Total;
        public readonly float Energi, Stres;
        public readonly bool Lemas;
        public RincianGaji(int dasar, int bonus, int tips, float energi, float stres, bool lemas)
        { Dasar = dasar; Bonus = bonus; Tips = tips; Total = dasar + bonus + tips; Energi = energi; Stres = stres; Lemas = lemas; }
    }

    /// <summary>Mini-game kerja warteg/warkop. Aksi "kerjaWarteg"/"kerjaWarkop" membuka shift (Aktif = "warteg"/"warkop"),
    /// MiniGame memainkannya lalu memanggil Selesai() atau Batal(). Jam berhenti selama Aktif != null.</summary>
    public interface IKerja
    {
        string Aktif { get; }            // null = tidak sedang kerja
        string DataKerjaJson { get; }    // isi Data/kerja.json (bahan, pesanan, kesabaran)
        string DataMenuJson { get; }     // isi Data/menu.json (resep tiap pesanan)
        bool Lemas { get; }              // energi rendah → gaji dasar ×0.5 (tampilkan peringatan)
        RincianGaji Hitung(HasilKerja h);   // pratinjau tanpa mengubah stat
        RincianGaji Selesai(HasilKerja h);  // terapkan gaji & efek, waktu maju 4 jam
        void Batal();                       // keluar di layar pembuka: tanpa efek
        event Action Berubah;
    }

    /// <summary>Satu perabot di panel upgrade.</summary>
    public sealed class InfoPerabot
    {
        public string Id, Nama, Ikon;
        public int Level, LevelMaks;
        public string LabelSekarang, DeskripsiSekarang;
        public string LabelBerikut, DeskripsiBerikut;  // null bila sudah maksimal
        public int HargaBerikut;                        // -1 bila sudah maksimal
    }

    /// <summary>Upgrade kamar lewat lemari (aksi "bukaUpgrade"). UI membuka panel saat Terbuka = true.</summary>
    public interface IUpgradeKamar
    {
        bool Terbuka { get; }
        System.Collections.Generic.IReadOnlyList<InfoPerabot> Daftar { get; }
        bool BolehBeli(string idPerabot, out string alasan);
        void Beli(string idPerabot);    // pesan lewat IPenerimaAksi.PesanMasuk
        void Tutup();
        int Level(string idPerabot);    // dipakai scene untuk menampilkan model sesuai level
        event Action Berubah;
    }

    /// <summary>Info kuliah & kos untuk HUD/HP (hanya baca).</summary>
    public interface IInfoAkademik
    {
        int Semester { get; }
        int Sks { get; }
        int SksLulus { get; }
        int Skripsi { get; }          // 0–100 %
        bool Lulus { get; }
        bool KosLunas { get; }
        string UjianHariIni { get; }  // "UTS"/"UAS" bila minggu ujian & belum ikut, selain itu null
        string Predikat { get; }      // predikat IPK sekarang, mis. "Cum Laude"
    }

    /// <summary>Kondisi harian untuk HUD (baca saja).</summary>
    public interface IKondisi
    {
        string CuacaId { get; }      // "cerah" / "berawan" / "hujan"
        string CuacaNama { get; }
        string CuacaIkon { get; }
        bool Sakit { get; }
        float Kebersihan { get; }    // 0–100
        bool KamarKotor { get; }
        int BajuKotor { get; }       // hari sejak laundry
        bool PunyaPayung { get; }
        int KopiSachet { get; }
        event Action Berubah;
    }

    public sealed class InfoPilihan { public string Id, Nama, Ikon, Deskripsi; }

    /// <summary>Buat karakter di awal game (nama, jurusan, asal). Dikunci setelah Buat().</summary>
    public sealed class OpsiKesulitan
    {
        public string Preset = "normal";
        public int Kiriman = 1500000, Sidak = 1;
        public float Dosen = 1f, Hujan = 1f, Jam = 1f;
    }

    public interface IProfil
    {
        RupaMahasiswa Rupa { get; }
        bool PerluDibuat { get; }    // true → UI tampilkan layar buat karakter (jam berhenti)
        string Nama { get; }
        string JurusanId { get; }
        string AsalId { get; }
        System.Collections.Generic.IReadOnlyList<InfoPilihan> DaftarJurusan { get; }
        System.Collections.Generic.IReadOnlyList<InfoPilihan> DaftarAsal { get; }
        System.Collections.Generic.IReadOnlyList<InfoPilihan> Bakat { get; }
        System.Collections.Generic.IReadOnlyList<InfoPilihan> Kelemahan { get; }
        bool Daftarkan(string nama, string jurusan, string latar, System.Collections.Generic.IReadOnlyCollection<string> bakat,
            System.Collections.Generic.IReadOnlyCollection<string> kelemahan, OpsiKesulitan kesulitan = null, RupaMahasiswa rupa = null);
        event Action Berubah;
    }

    public sealed class InfoBarang { public string Id, Nama, Ikon, Deskripsi; public int Harga, Dimiliki; }

    /// <summary>Toko barang (aksi "belanjaBarang" di Toko Serba Ada). Jam berhenti selama Terbuka.</summary>
    public interface IToko
    {
        bool Terbuka { get; }
        System.Collections.Generic.IReadOnlyList<InfoBarang> Daftar { get; }
        bool BolehBeli(string idBarang, out string alasan);
        void Beli(string idBarang);
        void Tutup();
        event Action Berubah;
    }

    /// <summary>Motor pemain (HUD menampilkan bensin saat naik).</summary>
    public interface IKendaraan
    {
        bool NaikMotor { get; }
        float Bensin { get; }        // 0–100 %
        bool Mogok { get; }
        event Action Berubah;
    }

    /// <summary>Satu baris pilihan di panel menu umum (bank, karier, salon, toko tani, info kos, warga).</summary>
    public sealed class InfoOpsi
    {
        public string Id, Ikon, Nama, Keterangan;
        public int Harga;          // 0 = gratis / tidak relevan (UI boleh menyembunyikan)
        public bool Boleh = true;  // false → tombol abu-abu + Alasan
        public string Alasan;
        public bool Aktif;         // sedang dipakai/dimiliki (mis. gaya rambut sekarang) → beri centang
        public bool Judul;         // baris pemisah/subjudul, bukan tombol
    }

    /// <summary>
    /// Panel menu umum: SATU panel UI untuk semua layanan tempat. Inti mengisi Judul/Info/Daftar;
    /// UI cukup menampilkan daftar & memanggil Pilih(id). Isi bisa berganti setelah Pilih (sub-menu).
    /// Jam berhenti & input ditahan selama Terbuka.
    /// </summary>
    public interface IMenuLayanan
    {
        bool Terbuka { get; }
        string Ikon { get; }
        string Judul { get; }
        string Info { get; }       // baris ringkas di bawah judul (mis. "Dompet Rp… · Tabungan Rp…")
        System.Collections.Generic.IReadOnlyList<InfoOpsi> Daftar { get; }
        void Pilih(string idOpsi);
        void Tutup();
        event Action Berubah;
    }

    /// <summary>Ringkasan hidup sosial & ekonomi untuk HUD/rapor/HP (baca saja).</summary>
    public interface IInfoHidup
    {
        string KosId { get; }
        string KosNama { get; }
        string KosIkon { get; }
        string PacarNama { get; }       // null = jomblo
        bool TinggalBareng { get; }
        int Tabungan { get; }
        int TargetTabungan { get; }     // 0 = tidak ada target
        string BeasiswaNama { get; }    // null = tidak ada
        string UkmNama { get; }
        string Rambut { get; }          // id gaya (fitur3 gayaRambut)
        string WarnaRambut { get; }     // hex
        int LevelSkill(string idSkill); // 0–4 (pemrograman, memasak, musik, olahraga)
        int Relasi(string idOrang);     // 0–100 (id warga atau NPC: buKos, mbakSri, ...)
        int ReputasiCircle(string id);
        int TingkatConfidant(string id);
        int Cemburu { get; }
        string JalurSemester { get; }
        float CabaiTumbuh { get; }      // −1 = pot kosong, 0–1 pertumbuhan
        string KarierNama { get; }      // pekerjaan setelah lulus (null = belum)
        bool PunyaSim { get; }
        int LevelMotor { get; }         // 1–3 (bengkel)
        string WarnaMotor { get; }      // hex, null = warna asli
        event Action Berubah;
    }

    public sealed class InfoTujuan { public string Teks; public int Sekarang, Target; public bool Selesai; }

    /// <summary>Cerita utama "Buku Sakti Ibu" untuk HUD (baca saja). Dialog cerita tampil lewat panel event biasa.</summary>
    public interface ICerita
    {
        string BabIkon { get; }      // bab aktif (null = tidak ada)
        string BabJudul { get; }
        string Halaman { get; }      // pesan Ibu di halaman bab
        int SisaHari { get; }        // tenggat bab (Rencana B tanpa hukuman bila lewat)
        System.Collections.Generic.IReadOnlyList<InfoTujuan> Tujuan { get; }
        string Ending { get; }       // judul ending setelah wisuda (null = belum)
        void BukaBukuSakti();        // buka halaman Buku Sakti + celengan Ibu di panel menu umum
        event Action Berubah;
    }

    /// <summary>Tempat mendaftarkan dan mengambil layanan di atas, agar antar-folder tidak saling bergantung langsung.</summary>
    public static class Layanan
    {
        public static IStatPemain Stat;
        public static IJamGame Jam;
        public static IPenerimaAksi Aksi;
        public static IPenyediaAudio Audio;
        public static IInputGerak Gerak;
        public static IKonteksInteraksi Konteks;
        public static IEventAcak Event;
        public static IKerja Kerja;
        public static IUpgradeKamar Upgrade;
        public static IInfoAkademik Akademik;
        public static IKondisi Kondisi;
        public static IProfil Profil;
        public static IToko Toko;
        public static IKendaraan Kendaraan;
        public static IMenuLayanan Menu;
        public static IInfoHidup Hidup;
        public static ICerita Cerita;

        /// <summary>UI mengisi true saat panel miliknya (mis. menu makan) terbuka → gerak & E/Spasi dikunci.</summary>
        public static bool UiModal;
        public static bool SedangPindahScene;

        /// <summary>Ada panel/layar yang menahan input pemain (event, kerja, upgrade, atau panel UI)?</summary>
        public static bool InputDitahan =>
            UiModal || SedangPindahScene || (Event != null && Event.Aktif != null) || (Kerja != null && Kerja.Aktif != null) || (Upgrade != null && Upgrade.Terbuka)
            || (Toko != null && Toko.Terbuka) || (Profil != null && Profil.PerluDibuat) || (Menu != null && Menu.Terbuka);
    }

    /// <summary>Konvensi model Blender → Unity (lihat docs/UNITY/RENCANA-PORT.md §5).</summary>
    public static class KonvensiModel
    {
        public const float SatuanMeter = 1f;
        public const int MaksSegitigaProp = 1500;
        public const int MaksSegitigaKarakter = 4000;
        public const int MaksSegitigaGedung = 6000;
    }
}
