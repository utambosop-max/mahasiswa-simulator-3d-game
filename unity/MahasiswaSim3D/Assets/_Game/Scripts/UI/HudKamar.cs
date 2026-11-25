using System.Globalization;
using System.Collections;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using MS.Kontrak;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;

namespace MS.UI
{
    [DisallowMultipleComponent]
    public sealed class HudKamar : MonoBehaviour
    {
        [SerializeField] private AnimationClip[] animasiMahasiswa;
        private readonly System.Collections.Generic.List<Texture2D> ikonStat = new();
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
        private PanelProfil panelProfil;
        private PanelToko panelToko;
        private PanelMenuLayanan panelLayanan;
        private WidgetBukuSakti bukuSakti;
        private MS.MiniGame.PanelRacik panelRacik;
        private readonly Dictionary<string, (string Label, string Ikon)> namaAksi = new Dictionary<string, (string, string)>();

        private Canvas kanvas;
        private Image tiraiTransisi;
        private RectTransform areaAman, kotakPesan;
        private Button tombolUtama, tombolTambahan;
        private TextMeshProUGUI labelUtama, labelTambahan;
        private TextMeshProUGUI uang, ipk, energi, stres, kalender, judulKalender;
        private TextMeshProUGUI statusAkademik;
        private TextMeshProUGUI statusKondisi;
        private Image barBensin;
        private RectTransform wadahBensin;
        private string akademikTerakhir;
        private PerintahAksi? aksiUtama, aksiTambahan;
        private JoystickMelayang joystick;
        private Sprite spriteLengkung;
        private Texture2D teksturLengkung;
        private IStatPemain stat;
        private IJamGame jam;
        private IKonteksInteraksi konteks;
        private IPenerimaAksi penerimaAksi;
        private Rect areaTerakhir;
        private Vector2Int layarTerakhir;
        private (int Uang, float Ipk, int Energi, int Stres)? statTerakhir;
        private (int Tanggal, int Menit, Fase Fase, bool Sibuk, bool TanggalTua)? kalenderTerakhir;
        private float cekAksiBerikut;

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
            BuatTombolRapor();
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
            PerbaruiAreaAman();
        }

        private void Start()
        {
            if (gameObject.scene.name == "Kampung")
                PasangOpsional(() => gameObject.AddComponent<WarnaMotorPemain>(), "warna motor");
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
            StartCoroutine(BukaTirai());
        }

        private void Update()
        {
            PerbaruiAreaAman();
            HubungkanLayanan();
            if (Time.unscaledTime >= cekAksiBerikut)
            {
                PerbaruiTombol();
                PerbaruiAkademik();
                PerbaruiKondisi();
                panelRapor.Perbarui();
                panelMenu.Segarkan();
            }
            toast.Tick();
            if (!panelEvent.Terbuka) panelRacik.Tick(Time.unscaledDeltaTime);
            panelEvent.KeDepan();
            panelProfil.KeDepan();
            // Esc di PC / tombol Back di Android menutup panel menu
            if (!panelEvent.Terbuka && UnityEngine.InputSystem.Keyboard.current?.escapeKey.wasPressedThisFrame == true)
            {
                if (panelRapor.Terbuka) panelRapor.Tutup();
                else if (panelLayanan.Terbuka) panelLayanan.Tutup();
                else if (panelToko.Terbuka) panelToko.Tutup();
                else if (panelUpgrade.Terbuka) panelUpgrade.Tutup();
                else if (panelMenu.Terbuka) panelMenu.Tutup();
            }
        }

        private void OnDisable()
        {
            panelEvent.Hubungkan(null);
            panelUpgrade.Hubungkan(null);
            panelRapor.Tutup();
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
            if (penerimaAksi != null) penerimaAksi.PesanMasuk -= BeriPesan;
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
            foreach (var tekstur in ikonStat) Destroy(tekstur);
            Destroy(spriteLengkung);
            Destroy(teksturLengkung);
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
                if (penerimaAksi != null) penerimaAksi.PesanMasuk -= BeriPesan;
                penerimaAksi = Layanan.Aksi;
                if (penerimaAksi != null) penerimaAksi.PesanMasuk += BeriPesan;
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
            if (sebelumnya?.Energi != nilai.Energi) energi.text = $"{nilai.Energi}%";
            if (sebelumnya?.Stres != nilai.Stres) stres.text = $"{nilai.Stres}%";
            statTerakhir = nilai;
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
            kalender.text = $"Tgl {nilai.Tanggal} · {nilai.Menit / 60:00}:{nilai.Menit % 60:00}";
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
        }

        private void PerbaruiKonteks()
        {
            var pakaiAksiUji = konteks == null && tampilkanAksiUji;
            aksiUtama = pakaiAksiUji ? Tidur : konteks?.Utama;
            aksiTambahan = pakaiAksiUji ? Belajar : konteks?.Tambahan;
            labelUtama.text = LabelAksi(aksiUtama, pakaiAksiUji ? "Tidur" : konteks?.NamaUtama);
            labelTambahan.text = LabelAksi(aksiTambahan, pakaiAksiUji ? "Belajar" : konteks?.NamaTambahan);
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
            if (!string.IsNullOrWhiteSpace(nama) && nama != aksi.Value.Id) return nama;
            if (namaAksi.TryGetValue(aksi.Value.Id, out var teks))
                return DekorasiEmoji.Replace(teks.Ikon + " " + teks.Label, "").Trim();
            return nama ?? aksi.Value.Id;
        }

        private void TerapkanAksiKonteks()
        {
            tombolUtama.gameObject.SetActive(aksiUtama.HasValue);
            tombolTambahan.gameObject.SetActive(aksiTambahan.HasValue);
            PosisiTombol();
            PerbaruiTombol();
        }

        private void MintaAksiUtama() => MintaAksi(aksiUtama, true);

        internal void PanelMenuDibuka()
        {
            Layanan.UiModal = true;
            joystick.ResetPosisi();
        }

        private void MintaAksi(PerintahAksi? aksi, bool utama)
        {
            if (Layanan.InputDitahan || panelRacik.Terbuka) return;
            if (!aksi.HasValue) return;
            Layanan.Audio?.Mainkan("klik");
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

            layanan.Lakukan(perintah);
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
            spriteLengkung = BuatSpriteLengkung();
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
        }

        private void PerbaruiKondisi()
        {
            var data = Layanan.Kondisi;
            if (data != null)
            {
                string ikon = DaftarModal.Ikon(data.CuacaIkon, "☁");
                string nilai = $"{ikon} {data.CuacaNama}" + (data.Sakit ? " · Sakit" : "")
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
            statusKondisi = Teks(areaAman, "", 32, 24, FontStyles.Bold);
            statusKondisi.alignment = TextAlignmentOptions.MidlineLeft;
            Rentangkan(statusKondisi.rectTransform, new Vector2(.02f, 1), new Vector2(.78f, 1));
            statusKondisi.rectTransform.offsetMin = new Vector2(0, -255);
            statusKondisi.rectTransform.offsetMax = new Vector2(0, -202);
            wadahBensin = BuatKotak("Bar bensin", areaAman);
            Rentangkan(wadahBensin, new Vector2(.02f, 1), new Vector2(.30f, 1));
            wadahBensin.offsetMin = new Vector2(0, -310);
            wadahBensin.offsetMax = new Vector2(0, -260);
            Gambar(wadahBensin, Krem);
            var isiBensin = BuatKotak("Isi bensin", wadahBensin);
            Rentangkan(isiBensin, Vector2.zero, Vector2.one);
            barBensin = Gambar(isiBensin, Aksen);
            var teksBensin = Teks(wadahBensin, "Bensin", 30, 24, FontStyles.Bold);
            Rentangkan(teksBensin.rectTransform, Vector2.zero, Vector2.one);
            wadahBensin.gameObject.SetActive(false);
            statusAkademik = Teks(areaAman, "", 34, 26, FontStyles.Bold);
            statusAkademik.name = "Status akademik";
            statusAkademik.alignment = TextAlignmentOptions.MidlineLeft;
            Rentangkan(statusAkademik.rectTransform, new Vector2(.02f, 1), new Vector2(.78f, 1));
            statusAkademik.rectTransform.offsetMin = new Vector2(0, -202);
            statusAkademik.rectTransform.offsetMax = new Vector2(0, -145);
            var bilah = BuatKotak("Stat dan kalender", areaAman);
            Rentangkan(bilah, new Vector2(0, 1), Vector2.one);
            bilah.offsetMin = new Vector2(22, -138);
            bilah.offsetMax = new Vector2(-22, -18);
            Gambar(bilah, Krem);
            (judulKalender, kalender) = BuatStat(bilah, "Kalender", 0.00f, 0.28f);
            (_, uang) = BuatStat(bilah, "Uang", 0.28f, 0.52f);
            (_, ipk) = BuatStat(bilah, "IPK", 0.52f, 0.68f);
            (_, energi) = BuatStat(bilah, "Energi", 0.68f, 0.84f);
            (_, stres) = BuatStat(bilah, "Stres", 0.84f, 1.00f);
        }

        private void BuatTombolRapor()
        {
            var wadah = BuatKotak("Buka rapor", areaAman);
            wadah.anchorMin = wadah.anchorMax = wadah.pivot = Vector2.one;
            wadah.anchoredPosition = new Vector2(-24, -145);
            wadah.sizeDelta = new Vector2(190, 95);
            var latar = Gambar(wadah, Krem, true);
            var tombol = wadah.gameObject.AddComponent<Button>();
            tombol.targetGraphic = latar;
            tombol.onClick.AddListener(() => panelRapor.Buka());
            var teks = Teks(wadah, "Rapor", 36, 27, FontStyles.Bold);
            Rentangkan(teks.rectTransform, Vector2.zero, Vector2.one);
        }

        private (TextMeshProUGUI Judul, TextMeshProUGUI Isi) BuatStat(Transform induk, string nama, float kiri, float kanan)
        {
            var kolom = BuatKotak(nama, induk);
            Rentangkan(kolom, new Vector2(kiri, 0), new Vector2(kanan, 1));
            var judul = Teks(kolom, nama, 34, 30, FontStyles.Normal);
            Rentangkan(judul.rectTransform, new Vector2(0.23f, 0.47f), new Vector2(0.97f, 0.94f));
            var ikon = BuatKotak("Ikon " + nama, kolom);
            ikon.anchorMin = ikon.anchorMax = new Vector2(0.15f, 0.70f);
            ikon.sizeDelta = new Vector2(34, 34);
            var gambar = ikon.gameObject.AddComponent<RawImage>();
            gambar.raycastTarget = false;
            gambar.color = Kopi;
            gambar.texture = BuatIkonStat(nama);
            var isi = Teks(kolom, "-", 48, 32, FontStyles.Bold);
            Rentangkan(isi.rectTransform, new Vector2(0.04f, 0.07f), new Vector2(0.96f, 0.58f));
            return (judul, isi);
        }

        private Texture2D BuatIkonStat(string nama)
        {
            string pola = nama switch
            {
                "Uang" => "0111110/1000001/1011101/1010101/1011101/1000001/0111110",
                "IPK" => "0001000/0011100/0111110/1111111/0101010/0111010/0000010",
                "Energi" => "0001100/0011000/0110000/0111110/0001100/0011000/0010000",
                "Stres" => "0111110/1000001/1010101/1000001/1001001/1010101/0111110",
                _ => "0100010/1111111/1000001/1111111/1010101/1000001/1111111"
            };
            var tekstur = new Texture2D(7, 7, TextureFormat.RGBA32, false);
            tekstur.filterMode = FilterMode.Point;
            tekstur.wrapMode = TextureWrapMode.Clamp;
            var baris = pola.Split('/');
            for (int y = 0; y < 7; y++)
                for (int x = 0; x < 7; x++)
                    tekstur.SetPixel(x, 6 - y, baris[y][x] == '1' ? Color.white : Color.clear);
            tekstur.Apply(false, true);
            ikonStat.Add(tekstur);
            return tekstur;
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
            Gambar(basis, new Color32(255, 250, 242, 200), bulat: true);
            var knob = BuatKotak("Gagang joystick", basis);
            knob.sizeDelta = new Vector2(120, 120);
            Gambar(knob, Aksen, bulat: true);
            joystick = zona.gameObject.AddComponent<JoystickMelayang>();
            joystick.Siapkan(basis, knob, grup);
        }

        private void BuatTombolAksi()
        {
            (tombolUtama, labelUtama) = BuatTombol("Aksi utama", () => MintaAksi(aksiUtama, true));
            (tombolTambahan, labelTambahan) = BuatTombol("Aksi tambahan", () => MintaAksi(aksiTambahan, false));
            kotakPesan = BuatKotak("Alasan aksi", areaAman);
            kotakPesan.anchorMin = kotakPesan.anchorMax = new Vector2(0.5f, 0);
            kotakPesan.pivot = new Vector2(0.5f, 0);
            kotakPesan.sizeDelta = new Vector2(840, 152);
            kotakPesan.anchoredPosition = new Vector2(0, 260);
            var susun = kotakPesan.gameObject.AddComponent<VerticalLayoutGroup>();
            susun.spacing = 8;
            susun.childControlWidth = susun.childControlHeight = true;
            susun.childForceExpandHeight = false;
            kotakPesan.gameObject.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            var label = new TextMeshProUGUI[3];
            for (int i = 0; i < label.Length; i++)
            {
                var kartu = BuatKotak("Toast", kotakPesan);
                kartu.gameObject.AddComponent<LayoutElement>().minHeight = 88;
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
            var nama = Teks(kotak, label, 52, 40, FontStyles.Bold);
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
            areaTerakhir = aman;
            Rentangkan(areaAman, new Vector2(aman.xMin / ukuran.x, aman.yMin / ukuran.y),
                new Vector2(aman.xMax / ukuran.x, aman.yMax / ukuran.y));

            PosisiTombol();
            Canvas.ForceUpdateCanvases();
            joystick.ResetPosisi();
        }

        private void PosisiTombol()
        {
            // Pertahankan 56 px walau layar landscape lebih pendek dari ukuran acuan.
            var skala = Mathf.Sqrt(Screen.width / 1920f * (Screen.height / 1080f));
            if (skala <= 0f) return;
            var tinggi = Mathf.Max(186, 56 / skala);
            var lebar = Mathf.Max(264, tinggi);
            var jarak = Mathf.Max(26, 8 / skala);
            ((RectTransform)tombolUtama.transform).sizeDelta = new Vector2(lebar, tinggi);
            ((RectTransform)tombolUtama.transform).anchoredPosition = new Vector2(-32, 32);
            ((RectTransform)tombolTambahan.transform).sizeDelta = new Vector2(lebar, tinggi);
            ((RectTransform)tombolTambahan.transform).anchoredPosition = new Vector2(aksiUtama.HasValue ? -32 - lebar - jarak : -32, 32);
            // Toast di bawah; saat panel menu terbuka pindah ke atas kartu agar tidak menumpuk
            if (panelMenu != null && panelMenu.Terbuka)
            {
                kotakPesan.anchorMin = kotakPesan.anchorMax = kotakPesan.pivot = new Vector2(0.5f, 1);
                kotakPesan.anchoredPosition = new Vector2(0, -150);
                kotakPesan.SetAsLastSibling();
            }
            else
            {
                kotakPesan.anchorMin = kotakPesan.anchorMax = kotakPesan.pivot = new Vector2(0.5f, 0);
                kotakPesan.anchoredPosition = new Vector2(0, Mathf.Max(260, tinggi + 72));
            }
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
            teks.fontSizeMin = minimum;
            teks.fontSizeMax = ukuran;
            teks.textWrappingMode = TextWrappingModes.NoWrap;
            teks.overflowMode = TextOverflowModes.Truncate;
            teks.gameObject.AddComponent<TitikElipsis>();
            return teks;
        }

        internal Image Gambar(RectTransform kotak, Color warna, bool sentuh = false, bool bulat = false)
        {
            var gambar = kotak.gameObject.AddComponent<Image>();
            gambar.sprite = spriteLengkung;
            gambar.type = bulat ? Image.Type.Simple : Image.Type.Sliced;
            gambar.color = warna;
            gambar.raycastTarget = sentuh;
            return gambar;
        }

        private Sprite BuatSpriteLengkung()
        {
            const int sisi = 64;
            const int pusat = sisi / 2;
            var piksel = new Color32[sisi * sisi];
            for (var y = 0; y < sisi; y++)
            for (var x = 0; x < sisi; x++)
            {
                var jarak = new Vector2(x + 0.5f - pusat, y + 0.5f - pusat).magnitude;
                var alfa = (byte)Mathf.RoundToInt(Mathf.Clamp01(pusat - jarak) * 255);
                piksel[y * sisi + x] = new Color32(255, 255, 255, alfa);
            }
            teksturLengkung = new Texture2D(sisi, sisi, TextureFormat.RGBA32, false);
            teksturLengkung.SetPixels32(piksel);
            teksturLengkung.Apply(false, true);
            return Sprite.Create(teksturLengkung, new Rect(0, 0, sisi, sisi), new Vector2(0.5f, 0.5f),
                100, 0, SpriteMeshType.FullRect, new Vector4(30, 30, 30, 30));
        }

        internal static RectTransform BuatKotak(string nama, Transform induk)
        {
            var kotak = new GameObject(nama, typeof(RectTransform));
            kotak.transform.SetParent(induk, false);
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
