// Isi file save. Tambah field baru → naikkan VersiSekarang & beri nilai default.
using System.Collections.Generic;

namespace MS.Inti
{
    public class SimpanDeposito { public int jumlah, mulai; }

    public class DataSimpan
    {
        public const int VersiSekarang = 9;
        public int versi = VersiSekarang;
        public int uang;
        public float ipk, energi, stres;
        public int hari = 1, tanggal = 1;
        public float menit;          // menit sejak 05.00 (0–1440)
        public int porsiFase;        // aturan kenyang
        public int streakMi;         // mi instan beruntun
        public int mandiHari;        // hari terakhir mandi (0 = belum)
        // --- versi 2 ---
        public bool hadirPagi, hadirSiang; // sudah kuliah di sesi ini hari ini?
        public bool kosLunas = true;       // bulan pertama sudah dibayar saat pindah
        public Dictionary<string, int> perabot = new Dictionary<string, int> { { "kasur", 1 }, { "meja", 1 } };

        // --- versi 3: event acak ---
        public int eventHari, eventJumlah;           // berapa event sudah muncul di hari eventHari
        public Dictionary<string, int> eventTerakhir = new Dictionary<string, int>(); // id → hari terakhir muncul
        public int hariBelajar;                      // hari terakhir kuliah/belajar (untuk kuis)
        public int liburHari;                        // kuliah hari ini diliburkan dosen
        public int follower;
        // --- versi 4: kerja ---
        public int kerjaHari;    // hari terakhir shift (maks 1 shift/hari)
        public int jumlahShift, shiftSempurna;
        // --- versi 5: akademik & batas aksi ---
        public int bulan = 1, semester = 1, sks, skripsi;  // skripsi 0–100 %
        public bool lulus;
        public List<string> ujianSelesai = new List<string>();
        public List<int> belajarLog = new List<int>();     // hari-hari belajar/kuliah (persiapan ujian)
        // --- versi 6: kehidupan, profil, barang, motor ---
        public float kebersihan = 100, bensin = 80;
        public int bajuKotor, sakit, vitaminHari, kopiSachet;
        public bool payung, profilDibuat;
        public string nama = "Mahasiswa", jurusan, asal;
        public Dictionary<string, int> batasAksi = new Dictionary<string, int>(); // kunci → hari/slot terakhir
        // --- versi 7: sosial, kos, bank, beasiswa, UKM, skill, lomba, kebun, salon ---
        public Dictionary<string, int> relasi = new Dictionary<string, int>();   // id warga/NPC → 0–100
        public string pacarId; public int pacarSejak, pacarTemu; public bool tinggalBareng;
        public string kos = "melati"; public int kosPindahHari, jamMalamHari, hantuLihat;
        public int tabungan, targetTabungan;
        public List<SimpanDeposito> deposito = new List<SimpanDeposito>();
        public string beasiswa; public Dictionary<string, int> beasiswaTolak = new Dictionary<string, int>(); // id → semester ditolak/dicabut
        public string ukm;
        public Dictionary<string, int> latihan = new Dictionary<string, int>();  // id aksi → berapa kali (skill)
        public int lombaBulan, cv; public List<float> lombaSkor = new List<float>(); public bool lombaSelesai = true;
        public float cabai = -1f; public int cabaiSiram, cabaiStok, makananKucing;
        public string rambut = "pendek", warnaRambut = "#2a1d15";
        // --- versi 8: cerita, karier, SIM, bengkel ---
        public CeritaSimpan cerita = new CeritaSimpan();
        public string karier, warnaMotor;
        public bool punyaSim;
        public int motorLevel = 1, seminarMinggu, razia;

        public List<string> traits = new List<string>();
        public bool kipkDicabut;
        public int tahapPindahan, petunjukPindahan;
        public bool tidurPindahan;

        public static DataSimpan Baru(DataBalance b) => new DataSimpan
        {
            uang = b.statAwal.uang, ipk = b.statAwal.ipk, energi = b.statAwal.energi, stres = b.statAwal.stres,
            tanggal = b.statAwal.tanggal, menit = 60, // mulai 06.00
        };

        public int Ambil(Dictionary<string, int> d, string k) => d != null && k != null && d.TryGetValue(k, out var v) ? v : 0;

        public int LevelPerabot(string id) => perabot != null && perabot.TryGetValue(id, out var l) ? l : 1;
    }
}
