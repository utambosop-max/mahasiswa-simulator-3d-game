using MS.Kontrak;
using UnityEngine;

namespace MS.Inti
{
    /// <summary>
    /// Titik masuk logika: baca data, muat save, buat Stat/Jam/Aksi, daftarkan ke Layanan.
    /// Assign 4 TextAsset dari Assets/_Game/Data di Inspector (file JSON tidak dipindah).
    /// </summary>
    [DefaultExecutionOrder(-100)] // jalan sebelum UI agar Layanan sudah terisi
    public class GameInti : MonoBehaviour
    {
        [SerializeField] TextAsset aksiJson;
        [SerializeField] TextAsset balanceJson;
        [SerializeField] TextAsset menuJson;
        [SerializeField] TextAsset upgradesJson;
        [SerializeField] TextAsset eventsJson;
        [SerializeField] TextAsset kerjaJson;
        [SerializeField] TextAsset fiturJson;
        [SerializeField] TextAsset fitur2Json;
        [SerializeField] TextAsset fitur3Json;
        [SerializeField] TextAsset fitur4Json;
        [SerializeField] TextAsset ceritaJson;

        public static GameInti Instans { get; private set; }
        public DataGame Data { get; private set; }
        public DataSimpan Simpanan { get; private set; }
        public StatPemain Stat { get; private set; }
        public JamGame Jam { get; private set; }
        public PenerimaAksi Aksi { get; private set; }
        public AturanHarian Aturan { get; private set; }
        public EventAcak Event { get; private set; }
        public KerjaSambilan Kerja { get; private set; }
        public UpgradeKamar Upgrade { get; private set; }
        public Kehidupan Hidup { get; private set; }
        public Sosial Sosial { get; private set; }
        /// <summary>Kos sekarang (warna dinding dll.), sistemnya bagian dari Sosial.</summary>
        public Sosial Kos => Sosial;
        public Cerita Cerita { get; private set; }
        float timerCerita;
        HariPindahan pindahan;
        KebutuhanHarian kebutuhan;
        bool ukurFps;
        bool sesiBerakhir;

        void Awake()
        {
            if (Instans != null && Instans != this) { Destroy(gameObject); return; }
            Instans = this;
            DontDestroyOnLoad(gameObject);
#if UNITY_STANDALONE_WIN && !UNITY_EDITOR
            ukurFps = System.Array.IndexOf(System.Environment.GetCommandLineArgs(), "-ukur-fps") >= 0;
            if (ukurFps)
            {
                Application.runInBackground = true;
                StartCoroutine(UkurKinerja());
            }
#endif
#if UNITY_ANDROID && !UNITY_EDITOR
            Application.targetFrameRate = 60;
#endif

            Data = DataGame.Muat(aksiJson, balanceJson, menuJson, upgradesJson);
            Data.Akademik = DataAkademik.Muat(fiturJson != null ? fiturJson.text : null, fitur2Json != null ? fitur2Json.text : null);
            Data.Fitur = DataFitur.Muat(fiturJson != null ? fiturJson.text : null, fitur2Json != null ? fitur2Json.text : null);
            Data.Fitur3 = DataFitur3.Muat(fitur2Json != null ? fitur2Json.text : null, fitur3Json != null ? fitur3Json.text : null, fitur4Json != null ? fitur4Json.text : null);
            Data.Cerita = DataCerita.Muat(ceritaJson != null ? ceritaJson.text : null);
            Simpanan = SimpanMuat.Muat(Data.Bal);
            Stat = new StatPemain(Simpanan, Data.Bal);
            Jam = new JamGame(Simpanan, Data.Bal, Stat);
            kebutuhan = new KebutuhanHarian(Simpanan, Data.Bal.vital, Stat);
            Jam.Berubah += kebutuhan.Periksa;
            Aksi = new PenerimaAksi(Data, Simpanan, Stat, Jam) { Kebutuhan = kebutuhan };
            kebutuhan.MeteranRendah = () =>
            {
                Layanan.Audio?.Mainkan("notif");
                Aksi.Umumkan("Meteran berbunyi. Sisa daya di bawah 1 kWh.");
            };
            Aksi.MenuDibeli += SimpanSetelahPembelian;
            Hidup = new Kehidupan(Data, Simpanan, Stat, Jam);
            Hidup.Pesan += Aksi.Umumkan;
            Aksi.Hidup = Hidup;
            Aturan = new AturanHarian(Data, Simpanan, Stat, Jam) { Hidup = Hidup };
            Aturan.Pesan += Aksi.Umumkan;
            Jam.FaseBerganti += SaatFaseBerganti;
            Event = new EventAcak(Data, Simpanan, Stat, Jam, eventsJson != null ? eventsJson.text : null);
            Aksi.Ponsel = new LayananPonsel(Simpanan, Stat, Jam, Event);
            pindahan = new HariPindahan(Simpanan, Event);
            Aksi.Pindahan = pindahan;
            Hidup.ProfilDidaftarkan += pindahan.Mulai;
            Aksi.AksiMulai += pindahan.Aksi;
            Aksi.MenuDibeli += pindahan.Makan;
            Kerja = new KerjaSambilan(Data, Simpanan, Stat, Aksi, kerjaJson != null ? kerjaJson.text : null, menuJson != null ? menuJson.text : null);
            Aksi.Kerja = Kerja;
            Kerja.pengaliGaji = () => Hidup.PengaliJurusan("gajiKerja");
            Upgrade = new UpgradeKamar(Data, Simpanan, Stat, Aksi);
            Aksi.Upgrade = Upgrade;
            Event.pengaliIpk = Aksi.PengaliIpkAtas;
            Event.Pesan += Aksi.Umumkan;
            Sosial = new Sosial(Data, Simpanan, Stat, Jam) { PengaliJurusan = (k, b) => Hidup.PengaliJurusan(k, b) };
            Sosial.Pesan += Aksi.Umumkan;
            Aksi.Sosial = Sosial; Aturan.Sosial = Sosial; Event.Sosial = Sosial;
            Hidup.pengaliKotor = () => Sosial.PengaliKotor;
            Kerja.bonusGaji = Sosial.BonusGaji;
            Kerja.SetelahShift = t => Sosial.Catat("kerja_" + t);
            Sosial.NaikMotor = () => Hidup.NaikMotor;
            Hidup.pengaliMotor = () => Sosial.PengaliMotor;
            Hidup.pengaliHemat = () => Sosial.PengaliHemat;
            Cerita = new Cerita(Data, Simpanan, Stat)
            {
                Fase = () => PenerimaAksi.NamaFase[(int)Jam.Fase],
                OngkosPulang = () => Hidup.OngkosPulang,
                PunyaPacar = () => Sosial.PunyaPacar,
                PemilikKos = () => Sosial.KosSekarang != null ? Sosial.KosSekarang.pemilik : "Bu Kos",
            };
            Cerita.Pesan += Aksi.Umumkan;
            Cerita.BukaBukuSaktiAksi = () => Sosial.BukaMenu("bukuSakti", null);
            Sosial.Cerita = Cerita;
            Event.AdaCerita = () => Cerita.AdaDialog;

            Layanan.Stat = Stat;
            Layanan.Jam = Jam;
            Layanan.Aksi = Aksi;
            Layanan.Event = Event;
            Layanan.Kerja = Kerja;
            Layanan.Upgrade = Upgrade;
            Layanan.Akademik = new InfoAkademik(Data, Simpanan, Stat);
            Layanan.Kondisi = Hidup; Layanan.Profil = Hidup; Layanan.Toko = Hidup; Layanan.Kendaraan = Hidup;
            Layanan.Menu = Sosial; Layanan.Hidup = Sosial; Layanan.Cerita = Cerita;
        }

#if UNITY_STANDALONE_WIN && !UNITY_EDITOR
        System.Collections.IEnumerator UkurKinerja()
        {
            // Lewati pemuatan awal sebelum menghitung gambar yang benar-benar dirender.
            yield return new WaitForSecondsRealtime(5f);
            while (true)
            {
                double mulai = Time.realtimeSinceStartupAsDouble;
                int awal = Time.renderedFrameCount;
                yield return new WaitForSecondsRealtime(10f);
                double fps = (Time.renderedFrameCount - awal) / (Time.realtimeSinceStartupAsDouble - mulai);
                string scene = UnityEngine.SceneManagement.SceneManager.GetActiveScene().name;
                string profil = QualitySettings.names[QualitySettings.GetQualityLevel()];
                string mode = Layanan.InputDitahan ? "modal" : "dunia";
                Debug.Log($"[Kinerja] {scene} {Screen.width}x{Screen.height} {profil} {mode} {fps:F1} FPS");
            }
        }
#endif

        void Update()
        {
            if (sesiBerakhir) return;
            if (!Layanan.InputDitahan) Jam.Jalan(Time.deltaTime);
            pindahan.Periksa();
            if (!ukurFps) Aksi.Ponsel.Periksa();
            Sosial.Periksa(); // jam malam kos
            // Cerita: cek pemicu tiap 1 detik nyata, tampilkan dialog saat layar kosong
            if (!ukurFps)
            {
                timerCerita -= Time.deltaTime;
                if (!pindahan.Aktif && timerCerita <= 0f) { timerCerita = 1f; Cerita.Periksa(); }
                if (Cerita.AdaDialog && Event.Aktif == null && Kerja.Aktif == null && !Jam.Sibuk && !Upgrade.Terbuka && !Hidup.Terbuka && !Hidup.PerluDibuat && !Sosial.Terbuka)
                    Cerita.TampilkanBerikut(Event); // jam berhenti selama event tampil
            }
            if (Aturan.PerluPulang) Aturan.PulangKampung(); // stres 100 -> pulang kampung
        }

        // Auto-save tiap ganti fase & saat aplikasi ditinggal (Android)
        void SaatFaseBerganti(Fase f) => SimpanMuat.Simpan(Simpanan);
        void SimpanSetelahPembelian() => SimpanMuat.Simpan(Simpanan);
        void OnApplicationPause(bool jeda) { if (jeda && !sesiBerakhir && Simpanan != null) SimpanMuat.Simpan(Simpanan); }
        void OnApplicationQuit() { if (!sesiBerakhir && Simpanan != null) SimpanMuat.Simpan(Simpanan); }

        internal bool WarisanSenior()
        {
            if (sesiBerakhir || string.IsNullOrEmpty(Simpanan?.cerita?.ending) ||
                !Application.CanStreamedLevelBeLoaded("KamarKos")) return false;
            var baru = DataSimpan.Baru(Data.Bal);
            baru.perabot = new System.Collections.Generic.Dictionary<string, int>(Simpanan.perabot);
            baru.warisanSenior = Simpanan.warisanSenior + 1;
            if (!SimpanMuat.Simpan(baru)) return false;
            sesiBerakhir = true;
            LepasLayanan();
            Destroy(gameObject);
            UnityEngine.SceneManagement.SceneManager.LoadScene("KamarKos");
            return true;
        }

        void OnDestroy() => LepasLayanan();

        void LepasLayanan()
        {
            if (Instans != this) return;
            Instans = null;
            if (kebutuhan != null) Jam.Berubah -= kebutuhan.Periksa;
            if (pindahan != null)
            {
                Hidup.ProfilDidaftarkan -= pindahan.Mulai;
                Aksi.AksiMulai -= pindahan.Aksi;
                Aksi.MenuDibeli -= pindahan.Makan;
            }
            if (Aksi != null) Aksi.MenuDibeli -= SimpanSetelahPembelian;
            if (Jam != null) Jam.FaseBerganti -= SaatFaseBerganti;
            if (Aturan != null) { Aturan.Pesan -= Aksi.Umumkan; Aturan.Lepas(); }
            if (ReferenceEquals(Layanan.Stat, Stat)) Layanan.Stat = null;
            if (ReferenceEquals(Layanan.Jam, Jam)) Layanan.Jam = null;
            if (ReferenceEquals(Layanan.Aksi, Aksi)) Layanan.Aksi = null;
            if (ReferenceEquals(Layanan.Kerja, Kerja)) Layanan.Kerja = null;
            if (ReferenceEquals(Layanan.Upgrade, Upgrade)) Layanan.Upgrade = null;
            Layanan.Akademik = null;
            if (Hidup != null) { Hidup.Pesan -= Aksi.Umumkan; Hidup.Lepas(); }
            if (ReferenceEquals(Layanan.Kondisi, Hidup)) { Layanan.Kondisi = null; Layanan.Profil = null; Layanan.Toko = null; Layanan.Kendaraan = null; }
            if (Cerita != null) { Cerita.Pesan -= Aksi.Umumkan; if (ReferenceEquals(Layanan.Cerita, Cerita)) Layanan.Cerita = null; }
            if (Sosial != null) { Sosial.Pesan -= Aksi.Umumkan; Sosial.Lepas(); if (ReferenceEquals(Layanan.Menu, Sosial)) { Layanan.Menu = null; Layanan.Hidup = null; } }
            if (Event != null) { Event.Pesan -= Aksi.Umumkan; Event.Lepas(); if (ReferenceEquals(Layanan.Event, Event)) Layanan.Event = null; }
        }
    }
}
