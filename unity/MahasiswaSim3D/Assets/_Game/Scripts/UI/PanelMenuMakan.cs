using System.Collections.Generic;
using System.Globalization;
using MS.Kontrak;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace MS.UI
{
    /// <summary>
    /// Panel daftar menu (warteg, warkop, minimarket, pasar, gerobak). Dibangun lewat kode oleh HudKamar.
    /// UI hanya membaca: harga tampilan + BolehDilakukan; beli = Layanan.Aksi.Lakukan(aksi, idMenu).
    /// Baris dipakai ulang (pool), teks hanya ditulis saat nilainya berubah.
    /// </summary>
    internal sealed class PanelMenuMakan
    {
        private static readonly CultureInfo Indonesia = CultureInfo.GetCultureInfo("id-ID");
        private static readonly Color Kartu = TemaAntarmuka.Kertas;
        private static readonly Color Baris = TemaAntarmuka.Mentega;
        private static readonly Color BarisMati = new Color32(222, 214, 205, 255);
        private static readonly Color TeksMati = new Color32(140, 128, 118, 255);
        private static readonly Color Kopi = TemaAntarmuka.Tinta;
        private static readonly Color Alasan = new Color32(190, 90, 70, 255);

        private sealed class BarisUI
        {
            public RectTransform Kotak;
            public Button Tombol;
            public Image Latar;
            public TextMeshProUGUI Nama, Harga, Info;
            public string IdMenu;
            public int HargaTerakhir = -1;
            public bool? BolehTerakhir;
            public string AlasanTerakhir;
            public ItemMenuUI Item;
        }

        private readonly HudKamar hud;
        private readonly DataMenuUI data;
        private readonly RectTransform akar, isiGulir;
        private readonly TextMeshProUGUI judul;
        private readonly List<BarisUI> pool = new List<BarisUI>();
        private int dipakai;
        private string idAksi, tempat;
        private float tinggiBaris = 150f;

        public bool Terbuka => akar.gameObject.activeSelf;
        public string IdAksi => idAksi;

        public PanelMenuMakan(HudKamar hud, RectTransform induk, DataMenuUI data)
        {
            this.hud = hud;
            this.data = data;

            // Latar redup penuh: menahan sentuhan ke joystick & menutup panel bila diketuk
            akar = HudKamar.BuatKotak("Panel menu makan", induk);
            HudKamar.Rentangkan(akar, Vector2.zero, Vector2.one);
            // Latar redup = saudara kartu (bukan induk) agar ketukan di kartu tidak ikut menutup
            var latarRedup = HudKamar.BuatKotak("Latar redup", akar);
            HudKamar.Rentangkan(latarRedup, Vector2.zero, Vector2.one);
            var redup = latarRedup.gameObject.AddComponent<Image>();
            redup.color = new Color(0.12f, 0.08f, 0.05f, 0.45f);
            var tombolRedup = latarRedup.gameObject.AddComponent<Button>();
            tombolRedup.transition = Selectable.Transition.None;
            tombolRedup.onClick.AddListener(Tutup);

            // Kartu di tengah, di bawah bilah stat
            var kartu = HudKamar.BuatKotak("Kartu menu", akar);
            HudKamar.Rentangkan(kartu, new Vector2(0.2f, 0.05f), new Vector2(0.8f, 0.86f));
            hud.Gambar(kartu, Kartu, sentuh: true); // sentuhan di kartu tidak menutup panel

            judul = HudKamar.Teks(kartu, "Menu", 52, 36, FontStyles.Bold);
            HudKamar.Rentangkan(judul.rectTransform, new Vector2(0.05f, 1f), new Vector2(0.7f, 1f));
            judul.rectTransform.offsetMin = new Vector2(0, -150);
            judul.rectTransform.offsetMax = new Vector2(0, -20);
            judul.alignment = TextAlignmentOptions.MidlineLeft;

            var tutup = HudKamar.BuatKotak("Tutup", kartu);
            tutup.anchorMin = tutup.anchorMax = tutup.pivot = Vector2.one;
            tutup.anchoredPosition = new Vector2(-20, -20);
            tutup.sizeDelta = new Vector2(220, 140);
            var latarTutup = hud.Gambar(tutup, TemaAntarmuka.Langit, sentuh: true);
            var tombolTutup = tutup.gameObject.AddComponent<Button>();
            tombolTutup.targetGraphic = latarTutup;
            tombolTutup.onClick.AddListener(Tutup);
            var teksTutup = HudKamar.Teks(tutup, "Tutup", 46, 32, FontStyles.Bold);
            HudKamar.Rentangkan(teksTutup.rectTransform, Vector2.zero, Vector2.one);

            // Area gulir
            var port = HudKamar.BuatKotak("Viewport", kartu);
            HudKamar.Rentangkan(port, Vector2.zero, Vector2.one);
            port.offsetMin = new Vector2(24, 24);
            port.offsetMax = new Vector2(-24, -180);
            port.gameObject.AddComponent<RectMask2D>();
            var tangkap = port.gameObject.AddComponent<Image>();
            tangkap.color = Color.clear; // agar seret di sela baris tetap menggulir

            isiGulir = HudKamar.BuatKotak("Isi", port);
            isiGulir.anchorMin = new Vector2(0, 1);
            isiGulir.anchorMax = Vector2.one;
            isiGulir.pivot = new Vector2(0.5f, 1);
            isiGulir.offsetMin = isiGulir.offsetMax = Vector2.zero;
            var susun = isiGulir.gameObject.AddComponent<VerticalLayoutGroup>();
            susun.spacing = 16;
            susun.childControlHeight = false;
            susun.childControlWidth = true;
            susun.childForceExpandHeight = false;
            var pas = isiGulir.gameObject.AddComponent<ContentSizeFitter>();
            pas.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            var gulir = port.gameObject.AddComponent<ScrollRect>();
            gulir.viewport = port;
            gulir.content = isiGulir;
            gulir.horizontal = false;
            gulir.movementType = ScrollRect.MovementType.Clamped;
            gulir.scrollSensitivity = 40;

            akar.gameObject.SetActive(false);
        }

        public bool AksiBeliMenu(PerintahAksi? aksi) =>
            aksi.HasValue && string.IsNullOrEmpty(aksi.Value.Target) && data.AksiBeliMenu(aksi.Value.Id);

        public void Buka(string aksi, string namaTempat)
        {
            idAksi = aksi;
            var daftar = data.Daftar(aksi, out tempat);
            judul.text = tempat == "warteg" ? "Etalase Warteg Bahari" : string.IsNullOrWhiteSpace(namaTempat) ? "Menu" : namaTempat;

            // Jaga tinggi baris >= 56 px nyata di layar kecil (acuan 1920x1080)
            var skala = Mathf.Sqrt(Screen.width / 1920f * (Screen.height / 1080f));
            tinggiBaris = skala > 0f ? Mathf.Max(150f, 64f / skala) : 150f;

            dipakai = 0;
            for (int i = 0; i < daftar.Count; i++)
            {
                if (dipakai == pool.Count) pool.Add(BuatBaris());
                var b = pool[dipakai++];
                b.Item = daftar[i];
                b.IdMenu = daftar[i].Id;
                b.HargaTerakhir = -1;
                b.BolehTerakhir = null;
                b.AlasanTerakhir = null;
                string nama = HudKamar.BersihkanEmoji(b.Item.Nama ?? b.Item.Id);
                b.Nama.text = string.IsNullOrEmpty(b.Item.Kategori) ? nama : b.Item.Kategori + " · " + nama;
                b.Kotak.sizeDelta = new Vector2(0, tinggiBaris);
                b.Kotak.gameObject.SetActive(true);
            }
            for (int i = dipakai; i < pool.Count; i++) pool[i].Kotak.gameObject.SetActive(false);
            isiGulir.anchoredPosition = Vector2.zero;
            akar.gameObject.SetActive(true);
            hud.PanelMenuDibuka();
            akar.SetAsLastSibling();
            Segarkan();
        }

        public void Tutup()
        {
            if (!Terbuka) return;
            akar.gameObject.SetActive(false);
            Layanan.UiModal = false;
            idAksi = null;
            hud.PanelMenuDitutup();
        }

        /// <summary>Perbarui harga & status boleh beli. Hanya menulis teks yang berubah.</summary>
        public void Segarkan()
        {
            if (!Terbuka) return;
            var layanan = Layanan.Aksi;
            bool tua = Layanan.Jam != null && Layanan.Jam.TanggalTua;
            for (int i = 0; i < dipakai; i++)
            {
                var b = pool[i];
                // Harga resmi dari logika inti (Kontrak); rumus lokal hanya cadangan
                int harga = layanan != null ? layanan.HargaMenu(idAksi, b.Item.Id) : -1;
                if (harga < 0) harga = data.Harga(tempat, b.Item, tua);
                if (harga != b.HargaTerakhir)
                {
                    b.HargaTerakhir = harga;
                    b.Harga.text = "Rp" + harga.ToString("N0", Indonesia);
                }
                string alasan = null;
                bool boleh = layanan != null && layanan.BolehDilakukan(new PerintahAksi(idAksi, b.IdMenu), out alasan);
                if (layanan == null) alasan = "Aksi belum siap.";
                if (b.BolehTerakhir == boleh && b.AlasanTerakhir == alasan) continue;
                b.BolehTerakhir = boleh;
                b.AlasanTerakhir = alasan;
                b.Tombol.interactable = boleh;
                b.Latar.color = boleh ? Baris : BarisMati;
                b.Nama.color = b.Harga.color = boleh ? Kopi : TeksMati;
                b.Info.color = boleh ? Kopi : Alasan;
                b.Info.text = boleh ? TeksEfek(b.Item)
                    : HudKamar.BersihkanEmoji(string.IsNullOrWhiteSpace(alasan) ? "Belum bisa dibeli." : alasan);
            }
        }

        // Font HUD tidak memuat emoji, jadi ⚡/😵 ditulis sebagai kata.
        private static string TeksEfek(ItemMenuUI m) =>
            string.IsNullOrEmpty(m.Kategori)
                ? "Energi " + Tanda(m.Energi) + "   Stres " + Tanda(m.Stres)
                : $"Karbo {m.Karbo:g} · Protein {m.Protein:g} · Serat {m.Serat:g} · Stres {Tanda(m.Stres)} · Maag {Tanda(m.Maag)}";

        private static string Tanda(float n)
        {
            int r = Mathf.RoundToInt(n);
            return r > 0 ? "+" + r : r.ToString();
        }

        private BarisUI BuatBaris()
        {
            var b = new BarisUI();
            b.Kotak = HudKamar.BuatKotak("Baris menu", isiGulir);
            b.Latar = hud.Gambar(b.Kotak, Baris, sentuh: true);
            b.Tombol = b.Kotak.gameObject.AddComponent<Button>();
            b.Tombol.targetGraphic = b.Latar;
            var warna = b.Tombol.colors;
            warna.disabledColor = Color.white; // warna abu-abu diatur lewat Latar
            b.Tombol.colors = warna;
            b.Tombol.onClick.AddListener(() => Pilih(b));

            b.Nama = HudKamar.Teks(b.Kotak, "", 46, 30, FontStyles.Bold);
            HudKamar.Rentangkan(b.Nama.rectTransform, new Vector2(0.04f, 0.45f), new Vector2(0.72f, 0.95f));
            b.Nama.alignment = TextAlignmentOptions.MidlineLeft;
            b.Harga = HudKamar.Teks(b.Kotak, "", 46, 30, FontStyles.Bold);
            HudKamar.Rentangkan(b.Harga.rectTransform, new Vector2(0.72f, 0.45f), new Vector2(0.96f, 0.95f));
            b.Harga.alignment = TextAlignmentOptions.MidlineRight;
            b.Info = HudKamar.Teks(b.Kotak, "", 36, 26, FontStyles.Normal);
            HudKamar.Rentangkan(b.Info.rectTransform, new Vector2(0.04f, 0.05f), new Vector2(0.96f, 0.48f));
            b.Info.alignment = TextAlignmentOptions.MidlineLeft;
            return b;
        }

        private void Pilih(BarisUI b)
        {
            var layanan = Layanan.Aksi;
            if (layanan == null || idAksi == null) return;
            Layanan.Audio?.Mainkan("klik");
            var perintah = new PerintahAksi(idAksi, b.IdMenu);
            if (!layanan.BolehDilakukan(perintah, out _)) { Layanan.Audio?.Mainkan("salah"); Segarkan(); return; }
            layanan.Lakukan(perintah); // hasil muncul lewat PesanMasuk -> toast
            Tutup();
        }
    }
}
