using System;
using MS.Kontrak;

namespace MS.Inti
{
    /// <summary>
    /// Jam real-time: 1 detik nyata = 1 menit game (balance.jam.menitPerDetik).
    /// Menit 0 = 05.00. Saat sibuk aksi ×15, saat tidur ×40. Kalender 30 hari, kiriman tgl 1.
    /// </summary>
    public class JamGame : IJamGame
    {
        readonly DataSimpan s;
        readonly BalJam j;
        readonly BalBulanan bul;
        readonly StatPemain stat;
        readonly int[] batas = new int[5]; // batas akhir tiap fase (menit)

        public event Action Berubah;           // menit/fase/hari berubah
        public event Action<Fase> FaseBerganti; // dipakai auto-save & aturan kenyang
        public event Action SibukSelesai;       // aksi/tidur berwaktu selesai
        public event Action<Fase> FaseSelesai;  // fase lama berakhir (sebelum reset) → bolos & stres pasif
        public event Action HariDimulai;        // tanggal sudah maju → kiriman, kos, tanggal tua

        /// <summary>True saat pulang kampung: tidak dihitung bolos & tanpa stres pasif.</summary>
        public bool Absen { get; private set; }

        float sisaSibuk;   // menit game tersisa dari aksi berwaktu
        bool sedangTidur;
        int menitTerakhir = -1;

        public JamGame(DataSimpan simpan, DataBalance b, StatPemain stat)
        {
            s = simpan; j = b.jam; bul = b.bulanan; this.stat = stat;
            string[] nama = { "pagi", "siang", "sore", "malam", "begadang" };
            int[] bawaan = { 360, 600, 780, 1080, 1440 };
            for (int i = 0; i < 5; i++)
                batas[i] = j.batasFase != null && j.batasFase.TryGetValue(nama[i], out var v) ? v : bawaan[i];
        }

        public int Hari => s.hari;
        public int Tanggal => s.tanggal;
        public Fase Fase => FaseDariMenit(s.menit);
        public float Menit => s.menit;
        public bool Sibuk => sisaSibuk > 0f;
        public bool SedangTidur => sedangTidur && Sibuk;
        public bool TanggalTua => s.tanggal >= bul.tanggalTuaMulai;
        /// <summary>Jam dinding (0–23) & menit (0–59) tanpa alokasi string.</summary>
        public int JamDinding => (j.mulaiHariJam * 60 + (int)s.menit) % 1440 / 60;
        public int MenitDinding => (int)s.menit % 60;

        public Fase FaseDariMenit(float m)
        {
            for (int i = 0; i < 4; i++) if (m < batas[i]) return (Fase)i;
            return Fase.Begadang;
        }

        /// <summary>Mulai aksi berwaktu: jam dipercepat sampai `menit` habis.</summary>
        public void MulaiSibuk(float menit, bool tidur)
        {
            sisaSibuk = menit; sedangTidur = tidur;
        }

        /// <summary>Dipanggil tiap frame dari GameInti.</summary>
        public void Jalan(float detikNyata)
        {
            if (detikNyata <= 0f) return;
            if (detikNyata > 1f) detikNyata = 1f; // setelah aplikasi di-pause, jangan loncat jauh
            float laju = j.menitPerDetik * (Sibuk ? (sedangTidur ? j.lajuTidur : j.lajuSibuk) : 1f);
            float maju = detikNyata * laju;
            if (Sibuk && maju >= sisaSibuk) maju = sisaSibuk; // berhenti tepat saat aksi selesai
            Maju(maju);
            if (Sibuk)
            {
                sisaSibuk -= maju;
                if (sisaSibuk <= 0.0001f) { sisaSibuk = 0f; sedangTidur = false; SibukSelesai?.Invoke(); }
            }
        }

        /// <summary>Majukan waktu sejumlah menit (dipecah per batas fase agar tidak ada fase terlewat).</summary>
        public void Maju(float menit)
        {
            while (menit > 0f)
            {
                Fase f = Fase;
                float keBatas = batas[(int)f] - s.menit;
                float langkah = Math.Min(menit, keBatas);
                s.menit += langkah; menit -= langkah;
                if (s.menit >= batas[(int)f] - 0.0001f) GantiFase();
            }
            int mInt = (int)s.menit;
            if (mInt != menitTerakhir) { menitTerakhir = mInt; Berubah?.Invoke(); }
        }

        /// <summary>Lompat ke besok pada menit `menitBesok` (pulang kampung). Aturan harian tetap jalan.</summary>
        public void LompatKeBesok(int menitBesok)
        {
            sisaSibuk = 0f; sedangTidur = false;
            Absen = true;
            Maju(1440f - s.menit + menitBesok);
            Absen = false;
        }

        void GantiFase()
        {
            FaseSelesai?.Invoke(FaseDariMenit(s.menit - 0.001f));
            if (s.menit >= 1440f - 0.0001f) HariBaru();
            s.porsiFase = 0; // aturan kenyang: reset tiap fase
            FaseBerganti?.Invoke(Fase);
            Berubah?.Invoke();
        }

        void HariBaru()
        {
            s.menit = 0f;
            s.hari++;
            s.tanggal++;
            if (s.tanggal > bul.hariPerBulan) s.tanggal = 1;
            HariDimulai?.Invoke(); // kiriman ortu, kos, dll. diurus AturanHarian
        }
    }
}
