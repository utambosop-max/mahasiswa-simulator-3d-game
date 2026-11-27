using System;
using System.Collections.Generic;
using MS.Kontrak;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;

namespace MS.UI
{
    internal sealed class PanelPengaturan
    {
        internal const string JudulGame = "Anak Kos: Survival Semester";
        private static readonly string[] GrafisPc = { "Rendah", "Sedang", "Tinggi", "Ultra" };
        private static readonly string[] GrafisSeluler = { "Mobile", "PC" };
        private static readonly int[] BatasFps = { 30, 60, 120, -1 };
        static string[] Preset => Application.isMobilePlatform ? GrafisSeluler : GrafisPc;
        static string KunciMutu => Application.isMobilePlatform ? "MutuGrafis" : "MutuGrafisHdrp";
        static int Mutu => Mathf.Clamp(PlayerPrefs.GetInt(KunciMutu, Application.isMobilePlatform ? 0 : 2), 0, Preset.Length - 1);
        static bool LayarPenuh => PlayerPrefs.GetInt("LayarPenuh", 1) == 1;
        static bool VSync => PlayerPrefs.GetInt("VSync", 1) == 1;
        static int Fps => Mathf.Clamp(PlayerPrefs.GetInt("BatasFps", 1), 0, BatasFps.Length - 1);
        static bool KameraAtas => PlayerPrefs.GetInt("KameraAtas", 0) == 1;
        readonly DaftarModal modal;
        readonly HudKamar hud;
        readonly Action mulai;
        readonly Dictionary<TMP_Text, (float ukuran, float min, float max)> ukuranAsli = new();
        bool jeda, judul;
        float skalaSebelumJeda;
        static int Volume => PlayerPrefs.GetInt("VolumeUtama", 100);
        static int Sensitivitas => PlayerPrefs.GetInt("SensitivitasKamera", 1);
        static bool TeksBesar => PlayerPrefs.GetInt("TeksBesar", 0) == 1;
        internal bool Terbuka => modal.Terbuka;

        internal PanelPengaturan(HudKamar hud, RectTransform area, Action mulai)
        {
            this.hud = hud;
            this.mulai = mulai;
            modal = new DaftarModal(hud, area, "Pengaturan", Tutup);
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Muat()
        {
            AudioListener.volume = Volume / 100f;
            int kualitas = Array.IndexOf(QualitySettings.names, Preset[Mutu]);
            if (kualitas >= 0 && QualitySettings.GetQualityLevel() != kualitas) QualitySettings.SetQualityLevel(kualitas, true);
            if (Application.isMobilePlatform)
            {
                Application.targetFrameRate = 60;
                return;
            }
            var mode = LayarPenuh ? FullScreenMode.FullScreenWindow : FullScreenMode.Windowed;
            if (Screen.fullScreenMode != mode) Screen.fullScreenMode = mode;
            QualitySettings.vSyncCount = VSync ? 1 : 0;
            Application.targetFrameRate = BatasFps[Fps];
        }

        internal void Buka()
        {
            if (Layanan.InputDitahan) return;
            mulai();
            Layanan.UiModal = true;
            Segarkan();
        }

        internal void BukaJeda(bool tampilJudul = false)
        {
            if (Terbuka || (!tampilJudul && Layanan.InputDitahan)) return;
            mulai();
            Layanan.UiModal = true;
            skalaSebelumJeda = Time.timeScale;
            Time.timeScale = 0f;
            jeda = true;
            judul = tampilJudul;
            TampilMenuJeda();
        }

        internal bool LayarJudul => Terbuka && judul;
        internal void KeDepan() => modal.KeDepan();

        internal void Tutup()
        {
            if (!Terbuka) return;
            modal.Tampil(false);
            Layanan.UiModal = false;
            if (jeda) Time.timeScale = skalaSebelumJeda;
            jeda = judul = false;
            EventSystem.current?.SetSelectedGameObject(null);
        }

        internal void Ukur(float skala) => modal.Ukur(skala);

        void Segarkan()
        {
            modal.Tampil(true, "Pengaturan");
            modal.Tambah($"Volume · {Volume}%", "Ketuk untuk mengubah volume", true,
                () => Simpan("VolumeUtama", Volume == 0 ? 100 : Volume - 25));
            int grafik = Mutu;
            string labelGrafis = Application.isMobilePlatform ? (grafik == 0 ? "Hemat" : "Tinggi") : Preset[grafik];
            modal.Tambah($"Grafis · {labelGrafis}", "Pilih preset kualitas gambar", true,
                () => Simpan(KunciMutu, (grafik + 1) % Preset.Length));
            if (!Application.isMobilePlatform)
            {
                modal.Tambah(LayarPenuh ? "Tampilan · Layar penuh" : "Tampilan · Jendela", "Jendela dapat diubah ukurannya.", true,
                    () => Simpan("LayarPenuh", LayarPenuh ? 0 : 1));
                modal.Tambah(VSync ? "VSync · Aktif" : "VSync · Mati", "Selaraskan gambar dengan refresh rate monitor.", true,
                    () => Simpan("VSync", VSync ? 0 : 1));
                string fps = BatasFps[Fps] < 0 ? "Tanpa batas" : BatasFps[Fps].ToString();
                modal.Tambah($"Batas FPS · {fps}", VSync ? "Matikan VSync untuk memakai batas ini." : "", true,
                    () => Simpan("BatasFps", (Fps + 1) % BatasFps.Length));
                modal.Tambah(KameraAtas ? "Kamera · Kamera Atas" : "Kamera · Orang pertama", "", true,
                    () => Simpan("KameraAtas", KameraAtas ? 0 : 1));
            }
            modal.Tambah(TeksBesar ? "Ukuran teks · Besar" : "Ukuran teks · Normal", "", true,
                () => Simpan("TeksBesar", TeksBesar ? 0 : 1));
            string laju = Sensitivitas == 0 ? "Lambat" : Sensitivitas == 2 ? "Cepat" : "Normal";
            modal.Tambah($"Putaran kamera · {laju}", "", true, () => Simpan("SensitivitasKamera", (Sensitivitas + 1) % 3));
            if (Application.isMobilePlatform)
            {
                bool getar = PlayerPrefs.GetInt("GetarAksi", 1) == 1;
                modal.Tambah(getar ? "Getar aksi · Aktif" : "Getar aksi · Mati", "", true,
                    () => Simpan("GetarAksi", getar ? 0 : 1));
            }
            if (jeda) modal.Tambah("Kembali ke menu", "", true, TampilMenuJeda);
            AturTeks();
        }

        void TampilMenuJeda()
        {
            modal.Tampil(true, JudulGame);
            modal.Tambah(judul ? "Mulai bermain" : "Lanjutkan", "", true, Tutup);
            modal.Tambah("Pengaturan", "Grafis, layar, kamera, dan suara", true, Segarkan);
            modal.Tambah("Keluar", "Tutup game", true, () => Application.Quit());
            AturTeks();
        }

        void Simpan(string key, int nilai)
        {
            PlayerPrefs.SetInt(key, nilai);
            PlayerPrefs.Save();
            Muat();
            Segarkan();
        }

        internal void AturTeks()
        {
            var faktor = TeksBesar ? 1.12f : 1f;
            foreach (var teks in hud.GetComponentsInChildren<TMP_Text>(true))
            {
                if (!ukuranAsli.TryGetValue(teks, out var ukuran))
                {
                    ukuran = (teks.fontSize, teks.fontSizeMin, teks.fontSizeMax);
                    ukuranAsli.Add(teks, ukuran);
                }
                if (!teks.enableAutoSizing) teks.fontSize = ukuran.ukuran * faktor;
                teks.fontSizeMin = ukuran.min * faktor;
                teks.fontSizeMax = ukuran.max * faktor;
            }
        }
    }
}
