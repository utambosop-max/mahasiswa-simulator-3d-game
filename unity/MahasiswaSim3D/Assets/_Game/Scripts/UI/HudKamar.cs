using System.Globalization;
using System.Collections;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using MS.Kontrak;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using System.Linq;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;

namespace MS.UI
{
    [DisallowMultipleComponent]
    public sealed class HudKamar : MonoBehaviour
    {
        [SerializeField] private AnimationClip[] animasiMahasiswa;
        private static readonly CultureInfo Indonesia = CultureInfo.GetCultureInfo("id-ID");
        private static readonly Regex DekorasiEmoji = new Regex(@"[\p{So}\p{Cs}\u200D\uFE0E\uFE0F]+\s*");
        private static readonly Color Kopi = new Color32(59, 42, 32, 255);
        private static readonly Color Krem = new Color32(255, 250, 242, 250);
        private static readonly Color Aksen = new Color32(255, 159, 74, 255);
        private static readonly Color Netral = new Color32(239, 230, 220, 255);
        private static readonly Color TidakTersedia = new Color32(207, 198, 188, 255);
        private static readonly PerintahAksi Tidur = new PerintahAksi("tidur");
        private static readonly PerintahAksi Belajar = new PerintahAksi("belajar");

        [SerializeField, Tooltip("Aktifkan hanya di scene uji untuk menampilkan Tidur dan Belajar tanpa titik interaksi.")]
        private bool tampilkanAksiUji;
        [SerializeField] private TextAsset aksiJson;
        [SerializeField, Tooltip("Data/menu.json untuk panel menu makan.")] private TextAsset menuJson;
        [SerializeField, Tooltip("Data/balance.json (pengali harga makan).")] private TextAsset balanceJson;
        private ToastAntrean toast;
        private PanelMenuMakan panelMenu;
        private PanelEvent panelEvent;
        private PanelUpgrade panelUpgrade;
        private PanelRapor panelRapor;
        private PanelPengaturan panelPengaturan;
        private PanelProfil panelProfil;
        private PanelToko panelToko;
        private PanelMenuLayanan panelLayanan;
        private WidgetBukuSakti bukuSakti;
        private MS.MiniGame.PanelRacik panelRacik;
        private readonly Dictionary<string, (string Label, string Ikon)> namaAksi = new Dictionary<string, (string, string)>();

        private Canvas kanvas;
        private Image tiraiTransisi;
        private Coroutine jalannyaTirai;
        private bool mulaiPindah;
        private RectTransform areaAman, kotakPesan;
        private Button tombolUtama, tombolTambahan, tombolKamera, tombolKlakson;
        private TextMeshProUGUI labelUtama, labelTambahan;
        private TextMeshProUGUI uang, ipk, energi, stres, kalender, judulKalender;
        private TextMeshProUGUI statusAkademik;
        private TextMeshProUGUI statusKondisi;
        private Image barBensin, barEnergi, barStres;
        private RectTransform wadahBensin;
        private string akademikTerakhir;
        private PerintahAksi? aksiUtama, aksiTambahan;
        private JoystickMelayang joystick;
        private IStatPemain stat;
        private IJamGame jam;
        private IKonteksInteraksi konteks;
        private IPenerimaAksi penerimaAksi;
        private Rect areaTerakhir;
        private Vector2Int layarTerakhir;
        private (int Uang, float Ipk, int Energi, int Stres)? statTerakhir;
        private (int Tanggal, int Menit, Fase Fase, bool Sibuk, bool TanggalTua)? kalenderTerakhir;
        private float cekAksiBerikut;
        private float statTampilEnergi, statTampilStres;
        private DaftarModal kosanOs;
        private TantanganKosanOs tantanganPc;
        private GameObject ponselPc;
        private bool berandaPc;
        private static readonly string[] AplikasiPc =
        {
            "DompetKu", "ChatApp", "SIAKAD", "Gaskeun", "TokoOren", "DanaKilat", "JagoMasak", "Profil & KTM"
        };
        private TextMeshProUGUI hariPc, labelKenyang;
        private Image barKenyang;
        private static bool judulSudahTampil;
        private static readonly string[] NamaHari =
            { "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu" };

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        private static void ResetJudul() => judulSudahTampil = false;

        private void TampilkanLayarJudul()
        {
            if (judulSudahTampil) return;
            judulSudahTampil = true;
#if UNITY_STANDALONE_WIN && !UNITY_EDITOR
            if (System.Array.IndexOf(System.Environment.GetCommandLineArgs(), "-ukur-fps") >= 0) return;
#endif
            panelPengaturan.BukaJeda(true);
        }

        private void SiapkanMenuPc()
        {
            kosanOs = new DaftarModal(this, areaAman, "KosanOS", TutupKosanOs);
            tantanganPc = new TantanganKosanOs(kosanOs);
        }

        private void BukaKosanOs()
        {
            if (Layanan.InputDitahan) return;
            Layanan.UiModal = true;
            TampilkanPonselPc();
            BerandaKosanOs();
        }

        private void BerandaKosanOs()
        {
            tantanganPc.Batal();
            berandaPc = true;
            string waktu = kalender != null ? kalender.text : "";
            kosanOs.Tampil(true, "KosanOS", $"{waktu}  ·  Wi-Fi  ·  Baterai 86%\nSaldo {uang.text}   ·   IPK {ipk.text}");
            kosanOs.TambahKisi(AplikasiPc, BukaAplikasiPc);
        }

        private void BukaAplikasiPc(int indeks)
        {
            tantanganPc.Batal();
            berandaPc = false;
            kosanOs.Tampil(true, AplikasiPc[indeks]);
            switch (indeks)
            {
                case 0:
                    TambahAksiPc("Bank & tabungan", "bukaBank");
                    TambahAksiPc("Bayar sewa kos", "bayarKos");
                    kosanOs.Tambah("Meteran listrik & kebutuhan kos", "", true, BukaKebutuhanKos);
                    TambahTantanganPc(7);
                    break;
                case 1:
                    kosanOs.Tambah("Grup Angkatan", "Sari: Info tugas dan jadwal kuliah bisa dibuka di SIAKAD.", false, null);
                    TambahAksiPc("Chat Bima", "menuWarga", "bima");
                    TambahAksiPc("Chat Sari", "menuWarga", "sari");
                    TambahTantanganPc(4, "titipAbsen");
                    TambahAksiPc("Telepon darurat", "bantuanDarurat");
                    TambahTantanganPc(1);
                    break;
                case 2:
                    kosanOs.Tambah("Transkrip & jadwal", "Rapor semester, SKS, dan skripsi", true, BukaRaporPc);
                    TambahTantanganPc(0, "krsWar");
                    TambahTantanganPc(8, "sidang");
                    break;
                case 3:
                    TambahAksiPc("Ambil order kurir", "narikOjol");
                    TambahAksiPc("Kerja serabutan", "kerjaDarurat");
                    TambahAksiPc("Papan lowongan", "bukaKarier");
                    TambahAksiPc("Racik kopi & gorengan", "kerjaWarkop");
                    break;
                case 4:
                    TambahAksiPc("Belanja kebutuhan", "belanjaBarang");
                    TambahAksiPc("Perabot kamar", "bukaUpgrade");
                    TambahTantanganPc(6);
                    break;
                case 5:
                    TambahAksiPc("Cairkan pinjaman Rp100.000", "pinjamDana", detail: "Bunga majemuk 8% per hari.");
                    TambahAksiPc("Lunasi tagihan", "lunasiDana");
                    break;
                case 6:
                    TambahTantanganPc(2, "masakMi");
                    TambahTantanganPc(3);
                    kosanOs.Tambah("Saran menu", "Sayur sop membantu memulihkan Maag. Pastikan galon dan listrik tersedia.", false, null);
                    break;
                case 7:
                    var profil = Layanan.Profil;
                    kosanOs.Tambah(profil?.Nama ?? "Mahasiswa",
                        $"Kartu Tanda Mahasiswa · {profil?.DaftarJurusan.FirstOrDefault(j => j.Id == profil.JurusanId)?.Nama}", false, null);
                    kosanOs.Tambah("Rapor & keterampilan", "", true, BukaRaporPc);
                    kosanOs.Tambah("Circle & confidants", "", true, BukaRelasiPc);
                    if (!string.IsNullOrEmpty(Layanan.Cerita?.Ending))
                        kosanOs.Tambah("Warisan Senior", "Mulai sesi baru dengan perabot dari sesi ini.", true, KonfirmasiWarisan);
                    TambahTantanganPc(5, "nugas");
                    kosanOs.Tambah("Pengaturan", "", true, () => { TutupKosanOs(); panelPengaturan.Buka(); });
                    break;
            }
            kosanOs.Tambah("Beranda", "", true, BerandaKosanOs);
        }

        void BukaRelasiPc()
        {
            var hidup = Layanan.Hidup;
            if (hidup == null) return;
            kosanOs.Tampil(true, "Circle & confidants", $"Cemburu {hidup.Cemburu}%");
            foreach (var (id, nama) in new[]
            {
                ("akademisi", "Akademisi & Dosen"), ("warkop", "Tongkrongan Warkop"), ("aktivis", "Aktivis & Organisasi"),
                ("gang", "Warga Gang & Pedagang"), ("sultan", "Anak Sultan & Kafe")
            })
                kosanOs.Tambah(nama, $"Reputasi {hidup.ReputasiCircle(id)}/100", false, null);
            foreach (var (id, nama) in new[]
            {
                ("bima", "Bima"), ("sari", "Sari"), ("dimas", "Dimas"), ("raka_ojol", "Raka"),
                ("nadia_desain", "Nadia"), ("ujang", "Pak Ujang")
            })
                TambahAksiPc(nama, "menuWarga", id, $"Kedekatan Level {hidup.TingkatConfidant(id)}/5");
            kosanOs.Tambah("Beranda", "", true, BerandaKosanOs);
        }

        void KonfirmasiWarisan()
        {
            kosanOs.Tampil(true, "Warisan Senior", "Sesi baru menjadi save aktif. Perabot kamar dibawa.");
            TambahAksiPc("Mulai sesi baru", "warisanSenior");
            kosanOs.Tambah("Batal", "", true, () => BukaAplikasiPc(7));
        }

        private void TambahAksiPc(string nama, string id, string target = null, string detail = null)
        {
            var aksi = new PerintahAksi(id, target);
            string alasan = null;
            bool boleh = penerimaAksi != null && penerimaAksi.BolehDilakukan(aksi, out alasan);
            kosanOs.Tambah(nama, alasan ?? detail, boleh, () =>
            {
                TutupKosanOs();
                MintaAksi(aksi, false);
            });
        }

        private void TambahTantanganPc(int nomor, string idAksi = null)
        {
            string alasan = null;
            bool boleh = idAksi == null || (penerimaAksi != null &&
                penerimaAksi.BolehDilakukan(new PerintahAksi(idAksi), out alasan));
            kosanOs.Tambah(TantanganKosanOs.Nama(nomor), alasan, boleh, () => MulaiTantanganPc(nomor, idAksi));
        }

        private void MulaiTantanganPc(int nomor, string idAksi)
        {
            if (!kosanOs.Terbuka) BukaKosanOs();
            berandaPc = false;
            tantanganPc.Mulai(nomor, skor =>
            {
                if (idAksi != null)
                {
                    TutupKosanOs();
                    MintaAksi(new PerintahAksi(idAksi, skor.ToString(CultureInfo.InvariantCulture)), false);
                    BeriPesan($"{TantanganKosanOs.Nama(nomor)} · skor {skor}/100");
                    return;
                }
                kosanOs.Tampil(true, TantanganKosanOs.Nama(nomor), $"Skor {skor}/100");
                kosanOs.Tambah("Beranda", "", true, BerandaKosanOs);
            }, BerandaKosanOs);
        }

        private void TampilkanPonselPc()
        {
            var kamera = Camera.main;
            if (kamera == null) return;
            if (ponselPc == null)
            {
                ponselPc = GameObject.CreatePrimitive(PrimitiveType.Cube);
                ponselPc.name = "Ponsel KosanOS";
                Destroy(ponselPc.GetComponent<Collider>());
                ponselPc.transform.SetParent(kamera.transform, false);
                ponselPc.transform.localPosition = new Vector3(.47f, -.19f, .98f);
                ponselPc.transform.localRotation = Quaternion.Euler(-9, -15, -8);
                ponselPc.transform.localScale = new Vector3(.23f, .405f, .022f);
                var renderer = ponselPc.GetComponent<Renderer>();
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows = false;
                var warna = new MaterialPropertyBlock();
                warna.SetColor("_BaseColor", new Color(.12f, .18f, .23f));
                renderer.SetPropertyBlock(warna);
            }
            ponselPc.SetActive(true);
        }

        private void BukaKebutuhanKos()
        {
            var vital = stat as IVitalPemain;
            string ringkasan = vital == null ? "" : $"Hidrasi {vital.Hidrasi:0}% · Kebersihan {vital.Kebersihan:0}% · Masuk angin {vital.MasukAngin:0}% · Fokus {vital.Fokus:0}% · Kejenuhan {vital.Kejenuhan:0}%";
            berandaPc = false;
            kosanOs.Tampil(true, "Kebutuhan kos", ringkasan);
            foreach (var (id, nama) in new[]
            {
                ("isiToken", "Isi token Rp10.000"), ("isiGalon", "Isi galon Rp5.000"),
                ("cuciManual", "Cuci pakaian & jemur"), ("angkatJemuran", "Angkat jemuran"),
                ("kerjaDarurat", "Kerja serabutan"), ("gadaiLaptop", "Gadai laptop"),
                ("tebusLaptop", "Tebus laptop"), ("bantuanDarurat", "Telepon darurat")
            })
            {
                var aksi = new PerintahAksi(id);
                string alasan = null;
                bool boleh = penerimaAksi != null && penerimaAksi.BolehDilakukan(aksi, out alasan);
                kosanOs.Tambah(nama, alasan, boleh, () =>
                {
                    penerimaAksi.Lakukan(aksi);
                    BukaKebutuhanKos();
                });
            }
            kosanOs.Tambah("Beranda", "", true, BerandaKosanOs);
        }

        private void BukaRaporPc()
        {
            TutupKosanOs();
            panelRapor.Buka();
        }

        private void TutupKosanOs()
        {
            if (kosanOs?.Terbuka != true) return;
            kosanOs.Tampil(false);
            tantanganPc?.Batal();
            if (ponselPc != null) ponselPc.SetActive(false);
            Layanan.UiModal = false;
            EventSystem.current?.SetSelectedGameObject(null);
        }

        private void PintasanPc()
        {
            var papan = Keyboard.current;
            if (papan == null) return;
            if (papan.tabKey.wasPressedThisFrame)
            {
                if (kosanOs.Terbuka) TutupKosanOs();
                else BukaKosanOs();
            }
            if (!kosanOs.Terbuka) return;
            if (tantanganPc.Aktif) return;
            for (int indeks = 0; indeks < AplikasiPc.Length; indeks++)
            {
                var angka = papan[(Key)((int)Key.Digit1 + indeks)];
                var numpad = papan[(Key)((int)Key.Numpad1 + indeks)];
                if (!angka.wasPressedThisFrame && !numpad.wasPressedThisFrame) continue;
                BukaAplikasiPc(indeks);
                break;
            }
        }

        private void BuatHudPc()
        {
            var waktu = KotakPc("Waktu dan cuaca", Vector2.one, new Vector2(-24, -24), new Vector2(390, 164));
            Gambar(waktu, Krem);
            kalender = BarisStat(waktu, "-", .62f, .98f, 42);
            hariPc = BarisStat(waktu, "", .39f, .65f, 32);
            statusKondisi = BarisStat(waktu, "", .04f, .36f, 30);
            statusKondisi.rectTransform.anchorMin = new Vector2(.16f, .04f);
            IkonHud.Pasang(waktu, IkonHud.Jenis.Cuaca, 30, new Vector2(.09f, .20f));
            judulKalender = BarisStat(waktu, "", .39f, .65f, 28);
            statusAkademik = BarisStat(waktu, "", .04f, .35f, 28);
            uang = BarisStat(waktu, "-", 0, 1, 32);
            ipk = BarisStat(waktu, "-", 0, 1, 32);
            foreach (var label in new[] { judulKalender, statusAkademik, uang, ipk })
                label.gameObject.SetActive(false);

            barKenyang = BuatVital("Kenyang", 24, out _, out labelKenyang);
            barEnergi = BuatVital("Energi", 174, out _, out energi);
            barStres = BuatVital("Stres", 324, out _, out stres);
        }

        private RectTransform KotakPc(string nama, Vector2 jangkar, Vector2 posisi, Vector2 ukuran)
        {
            var kotak = BuatKotak(nama, areaAman);
            kotak.anchorMin = kotak.anchorMax = kotak.pivot = jangkar;
            kotak.anchoredPosition = posisi;
            kotak.sizeDelta = ukuran;
            return kotak;
        }

        private Image BuatVital(string nama, float x, out RectTransform lingkaran, out TextMeshProUGUI nilai)
        {
            lingkaran = KotakPc(nama, Vector2.zero, new Vector2(x, 24), new Vector2(136, 136));
            var dasar = lingkaran.gameObject.AddComponent<Image>();
            dasar.sprite = SpriteVital();
            dasar.color = new Color32(95, 81, 73, 225);
            dasar.raycastTarget = false;
            var isi = BuatKotak("Isi", lingkaran);
            Rentangkan(isi, Vector2.zero, Vector2.one);
            var cincin = isi.gameObject.AddComponent<Image>();
            cincin.sprite = dasar.sprite;
            cincin.type = Image.Type.Filled;
            cincin.fillMethod = Image.FillMethod.Radial360;
            cincin.fillOrigin = (int)Image.Origin360.Top;
            cincin.fillAmount = 0;
            cincin.raycastTarget = false;
            var tengah = BuatKotak("Label", lingkaran);
            Rentangkan(tengah, new Vector2(.09f, .09f), new Vector2(.91f, .91f));
            var bidang = tengah.gameObject.AddComponent<Image>();
            bidang.sprite = dasar.sprite;
            bidang.color = Krem;
            bidang.raycastTarget = false;
            BarisStat(tengah, nama, .49f, .82f, 28);
            nilai = BarisStat(tengah, "-", .19f, .52f, 34);
            return cincin;
        }

        private static Sprite spriteVital;

        private static Sprite SpriteVital()
        {
            if (spriteVital != null) return spriteVital;
            const int sisi = 128;
            var tekstur = new Texture2D(sisi, sisi, TextureFormat.RGBA32, false);
            var piksel = new Color32[sisi * sisi];
            var pusat = new Vector2(sisi / 2f - .5f, sisi / 2f - .5f);
            for (int y = 0; y < sisi; y++)
                for (int x = 0; x < sisi; x++)
                {
                    float jarak = Vector2.Distance(new Vector2(x, y), pusat);
                    piksel[y * sisi + x] = new Color(1, 1, 1, Mathf.Clamp01(sisi / 2f - jarak));
                }
            tekstur.SetPixels32(piksel);
            tekstur.Apply(false, true);
            spriteVital = Sprite.Create(tekstur, new Rect(0, 0, sisi, sisi), Vector2.one * .5f);
            return spriteVital;
        }

        private void PerbaruiVitalPc()
        {
            if (stat == null) return;
            var tenang = TemaAntarmuka.Mint;
            var merah = Color.Lerp(new Color32(173, 45, 44, 255), new Color32(255, 114, 104, 255),
                .5f + .5f * Mathf.Sin(Time.unscaledTime * 6f));
            if (stat is IVitalPemain vital)
            {
                IsiBar(barKenyang, vital.Kenyang);
                barKenyang.color = vital.Kenyang < 25 || vital.Maag >= 75 ? merah : tenang;
                string label = $"{vital.Kenyang:0}% · M {vital.Maag:0}";
                if (labelKenyang.text != label) labelKenyang.text = label;
            }
            barEnergi.color = stat.Energi < 25 ? merah : tenang;
            barStres.color = stat.Stres > 75 ? merah : TemaAntarmuka.Jingga;
        }

        private void Awake()
        {
            if (FindAnyObjectByType<EventSystem>() == null)
                new GameObject("Input UI", typeof(EventSystem), typeof(InputSystemUIInputModule))
                    .transform.SetParent(transform, false);
            MuatNamaAksi();
            BuatKanvas();
            BuatTiraiTransisi();
            BuatHudStat();
            BuatJoystick();
            BuatTombolAksi();
            panelMenu = new PanelMenuMakan(this, areaAman, DataMenuUI.Muat(aksiJson, menuJson, balanceJson));
            panelEvent = new PanelEvent(this, areaAman, () =>
            {
                panelMenu.Tutup();
                joystick.ResetPosisi();
                EventSystem.current?.SetSelectedGameObject(null);
            });
            panelRacik = new MS.MiniGame.PanelRacik(areaAman, () =>
            {
                panelMenu.Tutup();
                joystick.ResetPosisi();
                EventSystem.current?.SetSelectedGameObject(null);
            });
            panelUpgrade = new PanelUpgrade(this, areaAman, () =>
            {
                panelMenu.Tutup();
                joystick.ResetPosisi();
                EventSystem.current?.SetSelectedGameObject(null);
            });
            panelRapor = new PanelRapor(this, areaAman, () =>
            {
                panelMenu.Tutup();
                joystick.ResetPosisi();
                EventSystem.current?.SetSelectedGameObject(null);
            });
            panelPengaturan = new PanelPengaturan(this, areaAman, joystick.ResetPosisi);
            if (Application.isMobilePlatform)
            {
                BuatTombolRapor();
                var (pengaturan, teksPengaturan) = BuatTombol("Pengaturan", panelPengaturan.Buka);
                var kotakPengaturan = (RectTransform)pengaturan.transform;
                kotakPengaturan.anchorMin = kotakPengaturan.anchorMax = kotakPengaturan.pivot = Vector2.one;
                kotakPengaturan.anchoredPosition = new Vector2(-24, -174);
                kotakPengaturan.sizeDelta = new Vector2(360, 140);
                pengaturan.targetGraphic.color = TemaAntarmuka.Kertas;
                teksPengaturan.fontSizeMax = 38;
                IkonHud.Pasang(kotakPengaturan, IkonHud.Jenis.Pengaturan, 38);
            }
            panelProfil = new PanelProfil(this, areaAman, () =>
            {
                panelMenu.Tutup();
                panelRapor.Tutup();
                joystick.ResetPosisi();
                EventSystem.current?.SetSelectedGameObject(null);
            });
            panelToko = new PanelToko(this, areaAman, joystick.ResetPosisi);
            panelLayanan = new PanelMenuLayanan(this, areaAman, joystick.ResetPosisi);
            bukuSakti = new WidgetBukuSakti(this, areaAman);
            if (!Application.isMobilePlatform) SiapkanMenuPc();
            PerbaruiAreaAman();
        }

        private void Start()
        {
            if (!Application.isMobilePlatform) TampilkanLayarJudul();
            if (gameObject.scene.name == "Kampung")
                PasangOpsional(() => gameObject.AddComponent<WarnaMotorPemain>(), "warna motor");
            panelPengaturan.AturTeks();
            var pemain = FindAnyObjectByType<MS.Pemain.GerakPemain>();
            if (pemain != null && animasiMahasiswa?.Length == 4 &&
                System.Array.TrueForAll(animasiMahasiswa, klip => klip != null && klip.length > 0) &&
                pemain.GetComponentInChildren<SkinnedMeshRenderer>() != null &&
                pemain.GetComponent<AnimasiMahasiswa>() == null)
                PasangOpsional(() => pemain.gameObject.AddComponent<AnimasiMahasiswa>().Pasang(pemain, animasiMahasiswa), "animasi");
        }

        internal static void PasangOpsional(System.Action pasang, string nama)
        {
            try { pasang(); }
            catch (System.Exception galat) { Debug.LogWarning($"HUD: {nama} tidak tersedia. {galat.Message}"); }
        }

        private void OnEnable()
        {
            kanvas.gameObject.SetActive(true);
            PerbaruiStat();
            PerbaruiKalender();
            HubungkanLayanan();
            PerbaruiKonteks();
            mulaiPindah = Layanan.SedangPindahScene;
            jalannyaTirai = StartCoroutine(BukaTirai());
        }

        private void Update()
        {
            PerbaruiAreaAman();
            HubungkanLayanan();
            if (mulaiPindah != Layanan.SedangPindahScene)
            {
                mulaiPindah = Layanan.SedangPindahScene;
                if (mulaiPindah)
                {
                    if (jalannyaTirai != null) StopCoroutine(jalannyaTirai);
                    jalannyaTirai = StartCoroutine(TutupTirai());
                }
            }
            if (Application.isMobilePlatform && tombolKlakson.gameObject.activeSelf != (Layanan.Kendaraan?.NaikMotor == true))
                PerbaruiTombol();
            if (Time.unscaledTime >= cekAksiBerikut)
            {
                PerbaruiTombol();
                PerbaruiAkademik();
                PerbaruiKondisi();
                panelRapor.Perbarui();
                panelMenu.Segarkan();
            }
            toast.Tick();
            if (!Layanan.InputDitahan && Layanan.Kendaraan?.NaikMotor == true &&
                UnityEngine.InputSystem.Keyboard.current?.hKey.wasPressedThisFrame == true)
                MintaAksi(new PerintahAksi("klakson"), false);
            AnimasiStat();
            if (!Application.isMobilePlatform) PerbaruiVitalPc();
            if (!panelEvent.Terbuka) panelRacik.Tick(Time.unscaledDeltaTime);
            panelEvent.KeDepan();
            panelProfil.KeDepan();
            if (panelPengaturan.LayarJudul) panelPengaturan.KeDepan();
            if (!Application.isMobilePlatform) PintasanPc();
            tantanganPc?.Tick();
            // Esc di PC / tombol Back di Android menutup panel aktif dahulu.
            if (!panelEvent.Terbuka && UnityEngine.InputSystem.Keyboard.current?.escapeKey.wasPressedThisFrame == true)
            {
                if (panelPengaturan.Terbuka) panelPengaturan.Tutup();
                else if (kosanOs?.Terbuka == true)
                {
                    if (berandaPc) TutupKosanOs();
                    else BerandaKosanOs();
                }
                else if (panelRapor.Terbuka) panelRapor.Tutup();
                else if (panelLayanan.Terbuka) panelLayanan.Tutup();
                else if (panelToko.Terbuka) panelToko.Tutup();
                else if (panelUpgrade.Terbuka) panelUpgrade.Tutup();
                else if (panelMenu.Terbuka) panelMenu.Tutup();
                else if (!Application.isMobilePlatform) panelPengaturan.BukaJeda();
            }
        }

        private void OnDisable()
        {
            TutupKosanOs();
            panelEvent.Hubungkan(null);
            panelUpgrade.Hubungkan(null);
            panelRapor.Tutup();
            panelPengaturan.Tutup();
            panelProfil.Hubungkan(null);
            panelToko.Hubungkan(null);
            panelLayanan.Hubungkan(null);
            bukuSakti.Hubungkan(null);
            panelRacik.Hubungkan(null);
            kanvas.gameObject.SetActive(false);
            if (stat != null) stat.Berubah -= PerbaruiStat;
            if (jam != null) jam.Berubah -= PerbaruiKalender;
            if (konteks != null)
            {
                konteks.Berubah -= PerbaruiKonteks;
                konteks.MintaUtama -= MintaAksiUtama;
            }
            if (penerimaAksi != null)
            {
                penerimaAksi.PesanMasuk -= BeriPesan;
                penerimaAksi.AksiMulai -= SaatAksiVisual;
            }
            if (jalannyaTirai != null) StopCoroutine(jalannyaTirai);
            jalannyaTirai = null;
            panelMenu.Tutup();
            toast.Kosongkan();
            stat = null;
            jam = null;
            konteks = null;
            penerimaAksi = null;
            statTerakhir = null;
            kalenderTerakhir = null;
        }

#if UNITY_EDITOR
        // Isi otomatis JSON yang belum di-assign (tersimpan saat prefab disimpan di Editor).
        private void OnValidate()
        {
            if (menuJson == null) menuJson = UnityEditor.AssetDatabase.LoadAssetAtPath<TextAsset>("Assets/_Game/Data/menu.json");
            if (balanceJson == null) balanceJson = UnityEditor.AssetDatabase.LoadAssetAtPath<TextAsset>("Assets/_Game/Data/balance.json");
        }
#endif

        private void OnDestroy()
        {
        }

        private void HubungkanLayanan()
        {
            panelEvent.Hubungkan(Layanan.Event);
            panelUpgrade.Hubungkan(Layanan.Upgrade);
            panelRacik.Hubungkan(Layanan.Kerja);
            panelProfil.Hubungkan(Layanan.Profil);
            panelToko.Hubungkan(Layanan.Toko);
            panelLayanan.Hubungkan(Layanan.Menu);
            bukuSakti.Hubungkan(Layanan.Cerita);
            // Registrasi layanan boleh terjadi sebelum atau sesudah HUD diaktifkan.
            if (!ReferenceEquals(stat, Layanan.Stat))
            {
                if (stat != null) stat.Berubah -= PerbaruiStat;
                stat = Layanan.Stat;
                if (stat != null) stat.Berubah += PerbaruiStat;
                statTerakhir = null;
                PerbaruiStat();
            }
            if (!ReferenceEquals(jam, Layanan.Jam))
            {
                if (jam != null) jam.Berubah -= PerbaruiKalender;
                jam = Layanan.Jam;
                if (jam != null) jam.Berubah += PerbaruiKalender;
                kalenderTerakhir = null;
                PerbaruiKalender();
            }
            if (!ReferenceEquals(konteks, Layanan.Konteks))
            {
                if (konteks != null)
                {
                    konteks.Berubah -= PerbaruiKonteks;
                    konteks.MintaUtama -= MintaAksiUtama;
                }
                konteks = Layanan.Konteks;
                if (konteks != null)
                {
                    konteks.Berubah += PerbaruiKonteks;
                    konteks.MintaUtama += MintaAksiUtama;
                }
                PerbaruiKonteks();
            }
            if (!ReferenceEquals(penerimaAksi, Layanan.Aksi))
            {
                // Toast berlangganan SETIAP pesan (aksi, bolos, kiriman, kos), bukan hanya PesanTerakhir
                if (penerimaAksi != null)
                {
                    penerimaAksi.PesanMasuk -= BeriPesan;
                    penerimaAksi.AksiMulai -= SaatAksiVisual;
                }
                penerimaAksi = Layanan.Aksi;
                if (penerimaAksi != null)
                {
                    penerimaAksi.PesanMasuk += BeriPesan;
                    penerimaAksi.AksiMulai += SaatAksiVisual;
                }
                PerbaruiTombol();
            }
        }

        private void PerbaruiStat()
        {
            if (stat == null)
            {
                uang.text = ipk.text = energi.text = stres.text = "-";
                return;
            }
            var nilai = (stat.Uang, stat.Ipk, Energi: Mathf.RoundToInt(stat.Energi), Stres: Mathf.RoundToInt(stat.Stres));
            var sebelumnya = statTerakhir;
            if (sebelumnya?.Uang != nilai.Uang) uang.text = "Rp" + nilai.Uang.ToString("N0", Indonesia);
            if (sebelumnya?.Ipk != nilai.Ipk) ipk.text = nilai.Ipk.ToString("0.00", Indonesia);
            if (!sebelumnya.HasValue)
            {
                statTampilEnergi = nilai.Energi;
                statTampilStres = nilai.Stres;
                energi.text = $"{nilai.Energi}%";
                stres.text = $"{nilai.Stres}%";
                IsiBar(barEnergi, nilai.Energi);
                IsiBar(barStres, nilai.Stres);
            }
            statTerakhir = nilai;
        }

        void AnimasiStat()
        {
            if (!statTerakhir.HasValue) return;
            var target = statTerakhir.Value;
            float langkah = Time.unscaledDeltaTime * 180;
            DekatiStat(energi, barEnergi, ref statTampilEnergi, target.Energi, langkah);
            DekatiStat(stres, barStres, ref statTampilStres, target.Stres, langkah);
        }

        static void DekatiStat(TextMeshProUGUI teks, Image bar, ref float nilai, int target, float langkah)
        {
            if (nilai == target) return;
            int lalu = Mathf.RoundToInt(nilai);
            nilai = Mathf.MoveTowards(nilai, target, langkah);
            int kini = Mathf.RoundToInt(nilai);
            if (kini != lalu) teks.text = $"{kini}%";
            IsiBar(bar, nilai);
        }

        private void PerbaruiKalender()
        {
            if (jam == null)
            {
                judulKalender.text = "Kalender";
                kalender.text = "-";
                return;
            }
            var nilai = (jam.Tanggal, Menit: (Mathf.FloorToInt(jam.Menit) + 300) % 1440, jam.Fase, jam.Sibuk, jam.TanggalTua);
            if (kalenderTerakhir == nilai) return;
            kalenderTerakhir = nilai;
            judulKalender.text = nilai.Sibuk ? "Sedang sibuk" : nilai.TanggalTua ? "Tanggal tua" : nilai.Fase.ToString();
            kalender.text = Application.isMobilePlatform
                ? $"Tgl {nilai.Tanggal} · {nilai.Menit / 60:00}:{nilai.Menit % 60:00}"
                : $"{nilai.Menit / 60:00}:{nilai.Menit % 60:00}";
            if (hariPc != null) hariPc.text = $"{NamaHari[Mathf.Max(0, jam.Hari - 1) % 7]}, {jam.Tanggal}";
        }

        private void PerbaruiAkademik()
        {
            var data = Layanan.Akademik;
            string status = data == null ? "" :
                $"Smt {data.Semester} · {data.Sks}/{data.SksLulus} SKS" +
                (string.IsNullOrEmpty(data.UjianHariIni) ? "" : $"  •  {data.UjianHariIni}") +
                (data.KosLunas ? "" : "  •  Kos belum dibayar");
            if (status == akademikTerakhir) return;
            akademikTerakhir = status;
            statusAkademik.text = status;
            statusAkademik.gameObject.SetActive(status.Length > 0);
        }

        private void PerbaruiTombol()
        {
            cekAksiBerikut = Time.unscaledTime + 0.25f;
            var layanan = Layanan.Aksi;
            WarnaiTombol(tombolUtama, aksiUtama.HasValue && layanan != null && layanan.BolehDilakukan(aksiUtama.Value, out _), Aksen);
            WarnaiTombol(tombolTambahan, aksiTambahan.HasValue && layanan != null && layanan.BolehDilakukan(aksiTambahan.Value, out _), Netral);
            if (tombolKlakson != null)
            {
                bool naik = Application.isMobilePlatform && Layanan.Kendaraan?.NaikMotor == true;
                if (tombolKlakson.gameObject.activeSelf != naik) tombolKlakson.gameObject.SetActive(naik);
                if (naik) WarnaiTombol(tombolKlakson, layanan != null && layanan.BolehDilakukan(new PerintahAksi("klakson"), out _), Netral);
            }
        }

        private void PerbaruiKonteks()
        {
            var pakaiAksiUji = konteks == null && tampilkanAksiUji;
            aksiUtama = pakaiAksiUji ? Tidur : konteks?.Utama;
            aksiTambahan = pakaiAksiUji ? Belajar : konteks?.Tambahan;
            labelUtama.text = LabelRingkas(aksiUtama, pakaiAksiUji ? "Tidur" : konteks?.NamaUtama);
            labelTambahan.text = LabelRingkas(aksiTambahan, pakaiAksiUji ? "Belajar" : konteks?.NamaTambahan);
            // Pemain menjauh / konteks berganti -> tutup panel bila aksinya sudah tidak ada
            if (panelMenu != null && panelMenu.Terbuka && aksiUtama?.Id != panelMenu.IdAksi && aksiTambahan?.Id != panelMenu.IdAksi)
                panelMenu.Tutup();
            TerapkanAksiKonteks();
        }

        private void MuatNamaAksi()
        {
            if (aksiJson == null) return;
            // Format aksi.json: id -> { "label": ..., "ikon": ... }. Kedua kolom berada di awal setiap entri.
            const string pola = "\\\"(?<id>[^\\\"]+)\\\"\\s*:\\s*\\{\\s*\\\"label\\\"\\s*:\\s*\\\"(?<label>[^\\\"]*)\\\"\\s*,\\s*\\\"ikon\\\"\\s*:\\s*\\\"(?<ikon>[^\\\"]*)\\\"";
            foreach (Match cocok in Regex.Matches(aksiJson.text, pola))
                namaAksi[cocok.Groups["id"].Value] = (cocok.Groups["label"].Value, cocok.Groups["ikon"].Value);
        }

        private string LabelAksi(PerintahAksi? aksi, string nama)
        {
            if (!aksi.HasValue) return "";
            if (!string.IsNullOrWhiteSpace(nama) && nama != aksi.Value.Id)
            {
                string bersih = BersihkanEmoji(nama);
                if (bersih.Length != 0) return bersih;
            }
            if (namaAksi.TryGetValue(aksi.Value.Id, out var teks))
                return DekorasiEmoji.Replace(teks.Ikon + " " + teks.Label, "").Trim();
            return nama ?? aksi.Value.Id;
        }

        string LabelRingkas(PerintahAksi? aksi, string nama)
        {
            if (!aksi.HasValue) return "";
            string label = LabelAksi(aksi, nama);
            if (aksi.Value.Id == "masukGedung") return "Masuk";
            if (label.Length > 22 && namaAksi.TryGetValue(aksi.Value.Id, out var pendek))
                return BersihkanEmoji(pendek.Label);
            return label;
        }

        private void TerapkanAksiKonteks()
        {
            tombolUtama.gameObject.SetActive(Application.isMobilePlatform && aksiUtama.HasValue);
            tombolTambahan.gameObject.SetActive(Application.isMobilePlatform && aksiTambahan.HasValue);
            PosisiTombol();
            PerbaruiTombol();
        }

        private void MintaAksiUtama()
        {
            if (!Layanan.InputDitahan && aksiUtama.HasValue) Layanan.Audio?.Mainkan("klik");
            MintaAksi(aksiUtama, true);
        }

        internal void PanelMenuDibuka()
        {
            Layanan.UiModal = true;
            joystick.ResetPosisi();
        }

        private void MintaAksi(PerintahAksi? aksi, bool utama)
        {
            if (Layanan.InputDitahan || panelRacik.Terbuka) return;
            if (!aksi.HasValue) return;
            var perintah = aksi.Value;
            // Aksi beli menu tanpa target -> buka daftar menu dulu, bukan langsung beli
            if (panelMenu.AksiBeliMenu(aksi) && Layanan.Aksi != null)
            {
                panelMenu.Buka(perintah.Id, LabelAksi(aksi, utama ? konteks?.NamaUtama : konteks?.NamaTambahan));
                PosisiTombol();
                return;
            }
            var layanan = Layanan.Aksi;
            if (layanan == null)
            {
                Layanan.Audio?.Mainkan("salah");
                BeriPesan("Aksi belum siap.");
                return;
            }
            if (!layanan.BolehDilakukan(perintah, out var alasan))
            {
                Layanan.Audio?.Mainkan("salah");
                BeriPesan(string.IsNullOrWhiteSpace(alasan) ? "Belum bisa dilakukan di sini." : alasan);
                PerbaruiTombol();
                return;
            }

            if (!Application.isMobilePlatform && perintah.Target == null)
            {
                int tantangan = perintah.Id switch { "masakMi" => 2, "nugas" => 5, "sidang" => 8, _ => -1 };
                if (tantangan >= 0)
                {
                    MulaiTantanganPc(tantangan, perintah.Id);
                    return;
                }
            }
            layanan.Lakukan(perintah);
#if UNITY_ANDROID || UNITY_IOS
            if (Application.isMobilePlatform && PlayerPrefs.GetInt("GetarAksi", 1) == 1)
                Handheld.Vibrate();
#endif
            PerbaruiTombol();
        }

        // Semua pesan lewat antrean toast (emoji dibersihkan di sana).
        private void BeriPesan(string isi) => toast?.Tambah(isi);

        /// <summary>Data aksi warisan web memuat emoji dekoratif; HUD memakai font Latin bawaan.</summary>
        internal static string BersihkanEmoji(string teks) =>
            string.IsNullOrEmpty(teks) ? "" : DekorasiEmoji.Replace(teks, "").Trim();

        internal void PanelMenuDitutup()
        {
            joystick.ResetPosisi();
            PosisiTombol();
        }

        private void BuatKanvas()
        {
            var wadah = BuatKotak("Kanvas HUD", transform);
            kanvas = wadah.gameObject.AddComponent<Canvas>();
            kanvas.renderMode = RenderMode.ScreenSpaceOverlay;
            kanvas.sortingOrder = 10;
            var skala = wadah.gameObject.AddComponent<CanvasScaler>();
            skala.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            skala.referenceResolution = new Vector2(1920f, 1080f);
            skala.matchWidthOrHeight = 0.5f;
            wadah.gameObject.AddComponent<GraphicRaycaster>();
            areaAman = BuatKotak("Area aman", wadah);
            Rentangkan(areaAman, Vector2.zero, Vector2.one);
        }

        private void BuatTiraiTransisi()
        {
            var wadah = BuatKotak("Tirai transisi", transform);
            var lapisan = wadah.gameObject.AddComponent<Canvas>();
            lapisan.renderMode = RenderMode.ScreenSpaceOverlay;
            lapisan.overrideSorting = true;
            lapisan.sortingOrder = 1000;
            wadah.gameObject.AddComponent<CanvasScaler>();
            Rentangkan(wadah, Vector2.zero, Vector2.one);
            tiraiTransisi = wadah.gameObject.AddComponent<Image>();
            tiraiTransisi.color = Color.black;
            tiraiTransisi.raycastTarget = false;
        }

        private IEnumerator BukaTirai()
        {
            tiraiTransisi.enabled = true;
            float waktu = 0f;
            while (waktu < 0.3f)
            {
                tiraiTransisi.color = new Color(0, 0, 0, 1f - waktu / 0.3f);
                yield return null;
                waktu += Time.unscaledDeltaTime;
            }
            tiraiTransisi.enabled = false;
            jalannyaTirai = null;
        }

        private void SaatAksiVisual(string id)
        {
            if (id != "mandi") return;
            if (jalannyaTirai != null) StopCoroutine(jalannyaTirai);
            jalannyaTirai = StartCoroutine(TiraiMandi());
        }

        private IEnumerator TutupTirai()
        {
            tiraiTransisi.enabled = true;
            for (float waktu = 0; waktu < .19f; waktu += Time.unscaledDeltaTime)
            {
                tiraiTransisi.color = new Color(0, 0, 0, Mathf.SmoothStep(0, 1, waktu / .19f));
                yield return null;
            }
            tiraiTransisi.color = Color.black;
            jalannyaTirai = null;
        }

        private IEnumerator TiraiMandi()
        {
            const float pudar = .22f;
            const float tahan = .48f;
            tiraiTransisi.enabled = true;
            for (float waktu = 0; waktu < pudar * 2 + tahan; waktu += Time.unscaledDeltaTime)
            {
                float pekat = Mathf.Clamp01(Mathf.Min(waktu, pudar * 2 + tahan - waktu) / pudar);
                tiraiTransisi.color = new Color(0, 0, 0, Mathf.SmoothStep(0, 1, pekat));
                yield return null;
            }
            tiraiTransisi.enabled = false;
            jalannyaTirai = null;
        }

        private void PerbaruiKondisi()
        {
            var data = Layanan.Kondisi;
            if (data != null)
            {
                string nilai = data.CuacaNama + (data.Sakit ? " · Sakit" : "")
                    + (data.KamarKotor ? " · Kamar kotor" : "") + (data.BajuKotor >= 4 ? " · Cucian menumpuk" : "");
                if (statusKondisi.text != nilai) statusKondisi.text = nilai;
            }
            statusKondisi.gameObject.SetActive(data != null);
            var motor = Layanan.Kendaraan;
            wadahBensin.gameObject.SetActive(motor?.NaikMotor == true);
            if (motor?.NaikMotor == true)
                barBensin.rectTransform.anchorMax = new Vector2(Mathf.Clamp01(motor.Bensin / 100f), 1);
        }

        private void BuatHudStat()
        {
            if (!Application.isMobilePlatform)
            {
                BuatHudPc();
                BuatBensin();
                return;
            }
            var bilah = BuatKotak("Stat dan kalender", areaAman);
            Rentangkan(bilah, new Vector2(0, .85f), Vector2.one);
            bilah.offsetMin = new Vector2(18, 4);
            bilah.offsetMax = new Vector2(-18, -6);
            var waktu = Kapsul(bilah, "Kalender", 0, .33f, TemaAntarmuka.Kertas);
            IkonHud.Pasang(waktu, IkonHud.Jenis.Jam, 36, new Vector2(.10f, .78f));
            judulKalender = BarisStat(waktu, "Kalender", .62f, .99f, 32);
            Rentangkan(judulKalender.rectTransform, new Vector2(.17f, .62f), new Vector2(.47f, .99f));
            kalender = BarisStat(waktu, "-", .62f, .99f, 36);
            kalender.rectTransform.anchorMin = new Vector2(.47f, .62f);
            statusAkademik = BarisStat(waktu, "", .30f, .64f, 32);
            statusKondisi = BarisStat(waktu, "", .02f, .34f, 30);
            statusKondisi.rectTransform.anchorMin = new Vector2(.17f, .02f);
            IkonHud.Pasang(waktu, IkonHud.Jenis.Cuaca, 31, new Vector2(.10f, .18f));
            uang = BuatStat(bilah, "Uang", .33f, .555f, TemaAntarmuka.Mentega, IkonHud.Jenis.Uang);
            ipk = BuatStat(bilah, "IPK", .555f, .70f, TemaAntarmuka.Langit, IkonHud.Jenis.Ipk);
            energi = BuatStat(bilah, "Energi", .70f, .85f, TemaAntarmuka.Mint, IkonHud.Jenis.Energi);
            stres = BuatStat(bilah, "Stres", .85f, 1, TemaAntarmuka.Bata, IkonHud.Jenis.Stres);
            barEnergi = BuatBar((RectTransform)energi.transform.parent, new Color32(54, 130, 102, 255));
            barStres = BuatBar((RectTransform)stres.transform.parent, new Color32(168, 72, 59, 255));

            BuatBensin();
        }

        private void BuatBensin()
        {
            wadahBensin = BuatKotak("Bar bensin", areaAman);
            Rentangkan(wadahBensin, new Vector2(.02f, .85f), new Vector2(.30f, .85f));
            wadahBensin.offsetMin = new Vector2(0, -56);
            wadahBensin.offsetMax = new Vector2(0, -8);
            Gambar(wadahBensin, TemaAntarmuka.Kertas);
            var isiBensin = BuatKotak("Isi bensin", wadahBensin);
            Rentangkan(isiBensin, Vector2.zero, Vector2.one);
            barBensin = Gambar(isiBensin, TemaAntarmuka.Jingga);
            var teksBensin = Teks(wadahBensin, "Bensin", 30, 28, FontStyles.Bold);
            Rentangkan(teksBensin.rectTransform, Vector2.zero, Vector2.one);
            wadahBensin.gameObject.SetActive(false);
        }

        RectTransform Kapsul(Transform induk, string nama, float kiri, float kanan, Color warna)
        {
            var kolom = BuatKotak(nama, induk);
            Rentangkan(kolom, new Vector2(kiri, 0), new Vector2(kanan, 1));
            kolom.offsetMin = new Vector2(4, 0);
            kolom.offsetMax = new Vector2(-4, 0);
            Gambar(kolom, warna);
            return kolom;
        }

        TextMeshProUGUI BuatStat(Transform induk, string nama, float kiri, float kanan, Color warna, IkonHud.Jenis ikon)
        {
            var kolom = Kapsul(induk, nama, kiri, kanan, warna);
            IkonHud.Pasang(kolom, ikon, 40, new Vector2(.20f, .68f));
            var judul = BarisStat(kolom, nama, .55f, .93f, 34);
            judul.rectTransform.anchorMin = new Vector2(.32f, .55f);
            return BarisStat(kolom, "-", .19f, .57f, 49);
        }

        static TextMeshProUGUI BarisStat(Transform induk, string nama, float bawah, float atas, float ukuran)
        {
            var teks = Teks(induk, nama, ukuran, 28, FontStyles.Bold);
            Rentangkan(teks.rectTransform, new Vector2(.07f, bawah), new Vector2(.96f, atas));
            return teks;
        }

        Image BuatBar(Transform induk, Color warna)
        {
            var jalur = BuatKotak("Jalur", induk);
            Rentangkan(jalur, new Vector2(.13f, .10f), new Vector2(.87f, .17f));
            Gambar(jalur, TemaAntarmuka.Kertas);
            var isi = BuatKotak("Kemajuan", jalur);
            Rentangkan(isi, Vector2.zero, Vector2.one);
            return Gambar(isi, warna);
        }

        static void IsiBar(Image bar, float persen)
        {
            if (bar.type == Image.Type.Filled) bar.fillAmount = Mathf.Clamp01(persen / 100);
            else bar.rectTransform.anchorMax = new Vector2(Mathf.Clamp01(persen / 100), 1);
        }

        private void BuatTombolRapor()
        {
            var wadah = BuatKotak("Buka rapor", areaAman);
            wadah.anchorMin = wadah.anchorMax = wadah.pivot = Vector2.one;
            wadah.anchoredPosition = new Vector2(-24, -326);
            wadah.sizeDelta = new Vector2(285, 140);
            var latar = Gambar(wadah, TemaAntarmuka.Langit, true);
            var tombol = wadah.gameObject.AddComponent<Button>();
            tombol.targetGraphic = latar;
            tombol.onClick.AddListener(() => panelRapor.Buka());
            var teks = Teks(wadah, "Rapor", 36, 27, FontStyles.Bold);
            Rentangkan(teks.rectTransform, Vector2.zero, Vector2.one);
            IkonHud.Pasang(wadah, IkonHud.Jenis.Ipk, 43);
        }

        private void BuatJoystick()
        {
            var zona = BuatKotak("Zona joystick", areaAman);
            Rentangkan(zona, Vector2.zero, new Vector2(0.45f, 0.84f));
            Gambar(zona, Color.clear, true);
            var basis = BuatKotak("Basis joystick", zona);
            basis.sizeDelta = new Vector2(252, 252);
            var grup = basis.gameObject.AddComponent<CanvasGroup>();
            grup.blocksRaycasts = false;
            Gambar(basis, TemaAntarmuka.Langit, bulat: true);
            var ring = BuatKotak("Ring joystick", basis);
            ring.sizeDelta = new Vector2(212, 212);
            Gambar(ring, TemaAntarmuka.Kertas, bulat: true);
            var knob = BuatKotak("Gagang joystick", basis);
            knob.sizeDelta = new Vector2(120, 120);
            Gambar(knob, TemaAntarmuka.Jingga, bulat: true);
            IkonHud.Pasang(knob, IkonHud.Jenis.Arah, 62, new Vector2(.5f, .5f));
            joystick = zona.gameObject.AddComponent<JoystickMelayang>();
            joystick.Siapkan(basis, knob, grup);
            zona.gameObject.SetActive(Application.isMobilePlatform);
        }

        private void BuatTombolAksi()
        {
            (tombolUtama, labelUtama) = BuatTombol("Aksi utama", () => MintaAksi(aksiUtama, true));
            (tombolTambahan, labelTambahan) = BuatTombol("Aksi tambahan", () => MintaAksi(aksiTambahan, false));
            (tombolKlakson, _) = BuatTombol("Klakson", () => MintaAksi(new PerintahAksi("klakson"), false));
            tombolKlakson.gameObject.SetActive(false);
            IkonHud.Pasang((RectTransform)tombolUtama.transform, IkonHud.Jenis.Aksi, 42);
            IkonHud.Pasang((RectTransform)tombolTambahan.transform, IkonHud.Jenis.Aksi, 38);
            if (Application.isMobilePlatform)
            {
                (tombolKamera, _) = BuatTombol("Putar kamera", () =>
                {
                    if (!Layanan.InputDitahan) Camera.main?.GetComponent<MS.Pemain.KameraIsometric>()?.PutarKanan();
                });
                IkonHud.Pasang((RectTransform)tombolKamera.transform, IkonHud.Jenis.Kamera, 39);
            }
            kotakPesan = BuatKotak("Alasan aksi", areaAman);
            Rentangkan(kotakPesan, new Vector2(.306f, .85f), new Vector2(.694f, .85f));
            kotakPesan.pivot = new Vector2(.5f, 1);
            kotakPesan.anchoredPosition = new Vector2(0, -14);
            var susun = kotakPesan.gameObject.AddComponent<VerticalLayoutGroup>();
            susun.spacing = 8;
            susun.childControlWidth = susun.childControlHeight = true;
            susun.childForceExpandWidth = susun.childForceExpandHeight = false;
            susun.childAlignment = TextAnchor.UpperCenter;
            kotakPesan.gameObject.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            var label = new TextMeshProUGUI[2];
            for (int i = 0; i < label.Length; i++)
            {
                var kartu = BuatKotak("Toast", kotakPesan);
                kartu.gameObject.AddComponent<LayoutElement>().minHeight = 76;
                Gambar(kartu, Krem);
                label[i] = Teks(kartu, "", 36, 26, FontStyles.Bold);
                Rentangkan(label[i].rectTransform, new Vector2(.04f,.04f), new Vector2(.96f,.96f));
                label[i].textWrappingMode = TextWrappingModes.Normal;
            }
            toast = new ToastAntrean(label);
            TerapkanAksiKonteks();
        }

        private (Button, TextMeshProUGUI) BuatTombol(string label, UnityEngine.Events.UnityAction kirim)
        {
            var kotak = BuatKotak(label, areaAman);
            kotak.anchorMin = kotak.anchorMax = new Vector2(1, 0);
            kotak.pivot = new Vector2(1, 0);
            var latar = Gambar(kotak, Color.white, true);
            var tombol = kotak.gameObject.AddComponent<Button>();
            tombol.targetGraphic = latar;
            tombol.onClick.AddListener(kirim);
            var nama = Teks(kotak, label, 48, 30, FontStyles.Bold);
            nama.textWrappingMode = TextWrappingModes.NoWrap;
            Rentangkan(nama.rectTransform, new Vector2(0.08f, 0.08f), new Vector2(0.92f, 0.92f));
            return (tombol, nama);
        }

        private void PerbaruiAreaAman()
        {
            var ukuran = new Vector2Int(Screen.width, Screen.height);
            var aman = Screen.safeArea;
            if (ukuran == layarTerakhir && aman == areaTerakhir)
                return;
            if (ukuran.x <= 0 || ukuran.y <= 0)
                return;
            layarTerakhir = ukuran;
            panelEvent.Ukur(Mathf.Sqrt(ukuran.x / 1920f * (ukuran.y / 1080f)));
            panelToko.Ukur(Mathf.Sqrt(ukuran.x / 1920f * (ukuran.y / 1080f)));
            panelLayanan.Ukur(Mathf.Sqrt(ukuran.x / 1920f * (ukuran.y / 1080f)));
            panelUpgrade.Ukur(Mathf.Sqrt(ukuran.x / 1920f * (ukuran.y / 1080f)));
            panelRacik.Ukur(Mathf.Sqrt(ukuran.x / 1920f * (ukuran.y / 1080f)));
            panelPengaturan.Ukur(Mathf.Sqrt(ukuran.x / 1920f * (ukuran.y / 1080f)));
            kosanOs?.Ukur(Mathf.Sqrt(ukuran.x / 1920f * (ukuran.y / 1080f)));
            areaTerakhir = aman;
            Rentangkan(areaAman, new Vector2(aman.xMin / ukuran.x, aman.yMin / ukuran.y),
                new Vector2(aman.xMax / ukuran.x, aman.yMax / ukuran.y));

            PosisiTombol();
            Canvas.ForceUpdateCanvases();
            toast.Ukur(kotakPesan.rect.width);
            joystick.ResetPosisi();
        }

        private void PosisiTombol()
        {
            // Pertahankan 56 px walau layar landscape lebih pendek dari ukuran acuan.
            var skala = Mathf.Sqrt(Screen.width / 1920f * (Screen.height / 1080f));
            if (skala <= 0f) return;
            var tinggi = Mathf.Max(80, TemaAntarmuka.SentuhMinimum / skala);
            var lebar = Mathf.Max(346, tinggi);
            var jarak = Mathf.Max(26, 8 / skala);
            ((RectTransform)tombolUtama.transform).sizeDelta = new Vector2(lebar, tinggi);
            ((RectTransform)tombolUtama.transform).anchoredPosition = new Vector2(-32, 32);
            ((RectTransform)tombolTambahan.transform).sizeDelta = new Vector2(lebar, tinggi);
            ((RectTransform)tombolTambahan.transform).anchoredPosition = new Vector2(aksiUtama.HasValue ? -32 - lebar - jarak : -32, 32);
            if (tombolKamera != null)
            {
                var kotakKamera = (RectTransform)tombolKamera.transform;
                kotakKamera.sizeDelta = new Vector2(lebar, Mathf.Max(112, 56 / skala));
                kotakKamera.anchoredPosition = new Vector2(-32, 32 + tinggi + jarak);
            }
            var klakson = (RectTransform)tombolKlakson.transform;
            klakson.sizeDelta = new Vector2(lebar, tinggi);
            klakson.anchoredPosition = new Vector2(-32 - lebar - jarak, 32 + tinggi + jarak);
            if (panelMenu != null && panelMenu.Terbuka) kotakPesan.SetAsLastSibling();
        }

        private static void WarnaiTombol(Button tombol, bool tersedia, Color latar)
        {
            var warna = tersedia ? latar : TidakTersedia;
            var transisi = tombol.colors;
            if (transisi.normalColor == warna)
                return;
            transisi.normalColor = warna;
            transisi.highlightedColor = Color.Lerp(warna, Color.white, 0.15f);
            transisi.selectedColor = transisi.highlightedColor;
            transisi.pressedColor = Color.Lerp(warna, Kopi, 0.16f);
            tombol.colors = transisi;
        }

        internal static TextMeshProUGUI Teks(Transform induk, string isi, float ukuran, float minimum, FontStyles gaya)
        {
            var kotak = BuatKotak(isi, induk);
            var teks = kotak.gameObject.AddComponent<TextMeshProUGUI>();
            teks.text = isi;
            teks.color = Kopi;
            teks.richText = false;
            teks.raycastTarget = false;
            teks.alignment = TextAlignmentOptions.Center;
            teks.fontStyle = gaya;
            teks.enableAutoSizing = true;
            teks.fontSizeMin = Mathf.Max(TemaAntarmuka.TeksMinimum, minimum);
            teks.fontSizeMax = Mathf.Max(teks.fontSizeMin, ukuran);
            teks.textWrappingMode = TextWrappingModes.NoWrap;
            teks.overflowMode = TextOverflowModes.Truncate;
            teks.gameObject.AddComponent<TitikElipsis>();
            return teks;
        }

        internal Image Gambar(RectTransform kotak, Color warna, bool sentuh = false, bool bulat = false)
        {
            var gambar = kotak.gameObject.AddComponent<Image>();
            gambar.sprite = TemaAntarmuka.Bentuk(bulat);
            gambar.type = bulat ? Image.Type.Simple : Image.Type.Sliced;
            gambar.color = warna;
            gambar.raycastTarget = sentuh;
            if (sentuh) kotak.gameObject.AddComponent<UmpanBalikUi>();
            return gambar;
        }

        internal static RectTransform BuatKotak(string nama, Transform induk)
        {
            var kotak = new GameObject(nama, typeof(RectTransform));
            kotak.transform.SetParent(induk, false);
            if (nama.StartsWith("Panel ", System.StringComparison.Ordinal) && nama != "Panel event acak")
                kotak.AddComponent<TransisiPanelUi>();
            return (RectTransform)kotak.transform;
        }

        internal static void Rentangkan(RectTransform kotak, Vector2 min, Vector2 maks)
        {
            kotak.anchorMin = min;
            kotak.anchorMax = maks;
            kotak.offsetMin = kotak.offsetMax = Vector2.zero;
        }
    }
}
