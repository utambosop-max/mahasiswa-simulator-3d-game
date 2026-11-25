using System;
using System.Collections.Generic;
using MS.Kontrak;
using TMPro;
using UnityEngine;

namespace MS.UI
{
    internal sealed class PanelPengaturan
    {
        readonly DaftarModal modal;
        readonly HudKamar hud;
        readonly Action mulai;
        readonly Dictionary<TMP_Text, (float ukuran, float min, float max)> ukuranAsli = new();
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
            int baku = Application.isMobilePlatform ? 0 : QualitySettings.GetQualityLevel();
            QualitySettings.SetQualityLevel(Mathf.Clamp(PlayerPrefs.GetInt("MutuGrafis", baku), 0, QualitySettings.names.Length - 1), true);
            if (Application.isMobilePlatform) Application.targetFrameRate = 60;
        }

        internal void Buka()
        {
            if (Layanan.InputDitahan) return;
            mulai();
            Layanan.UiModal = true;
            Segarkan();
        }

        internal void Tutup()
        {
            if (!Terbuka) return;
            modal.Tampil(false);
            Layanan.UiModal = false;
        }

        internal void Ukur(float skala) => modal.Ukur(skala);

        void Segarkan()
        {
            modal.Tampil(true, "Pengaturan");
            modal.Tambah($"Volume · {Volume}%", "Ketuk untuk mengubah volume", true,
                () => Simpan("VolumeUtama", Volume == 0 ? 100 : Volume - 25));
            bool tinggi = QualitySettings.GetQualityLevel() > 0;
            modal.Tambah(tinggi ? "Grafik · Tinggi" : "Grafik · Hemat", "Hemat mengurangi beban grafis", QualitySettings.names.Length > 1,
                () => Simpan("MutuGrafis", tinggi ? 0 : 1));
            modal.Tambah(TeksBesar ? "Ukuran teks · Besar" : "Ukuran teks · Normal", "", true,
                () => Simpan("TeksBesar", TeksBesar ? 0 : 1));
            string laju = Sensitivitas == 0 ? "Lambat" : Sensitivitas == 2 ? "Cepat" : "Normal";
            modal.Tambah($"Putaran kamera · {laju}", "", true, () => Simpan("SensitivitasKamera", (Sensitivitas + 1) % 3));
            bool getar = PlayerPrefs.GetInt("GetarAksi", 1) == 1;
            modal.Tambah(getar ? "Getar aksi · Aktif" : "Getar aksi · Mati", "", true,
                () => Simpan("GetarAksi", getar ? 0 : 1));
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
