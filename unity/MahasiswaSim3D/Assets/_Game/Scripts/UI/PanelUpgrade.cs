using System.Globalization;
using MS.Kontrak;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace MS.UI
{
    internal sealed class PanelUpgrade
    {
        sealed class Kartu
        {
            public RectTransform Akar;
            public TextMeshProUGUI Nama, Info, Alasan, Label;
            public Button Beli;
            public LayoutElement Ukuran;
            public string Id;
        }

        static readonly CultureInfo Indonesia = CultureInfo.GetCultureInfo("id-ID");
        readonly RectTransform akar;
        readonly ScrollRect gulir;
        readonly Kartu[] kartu = new Kartu[4];
        readonly System.Action saatBuka;
        IUpgradeKamar layanan;
        internal bool Terbuka => akar.gameObject.activeSelf;

        internal PanelUpgrade(HudKamar hud, RectTransform area, System.Action saatBuka)
        {
            this.saatBuka = saatBuka;
            akar = HudKamar.BuatKotak("Panel upgrade", area);
            HudKamar.Rentangkan(akar, Vector2.zero, Vector2.one);
            akar.gameObject.AddComponent<Image>().color = TemaAntarmuka.Redup;
            var bingkai = HudKamar.BuatKotak("Upgrade kamar", akar);
            HudKamar.Rentangkan(bingkai, new Vector2(.10f, .05f), new Vector2(.90f, .87f));
            hud.Gambar(bingkai, TemaAntarmuka.Kertas, true);
            var viewport = HudKamar.BuatKotak("Viewport upgrade", bingkai);
            HudKamar.Rentangkan(viewport, Vector2.zero, new Vector2(1, .82f));
            viewport.offsetMin = new Vector2(24, 24);
            viewport.offsetMax = new Vector2(-24, -24);
            viewport.gameObject.AddComponent<RectMask2D>();
            viewport.gameObject.AddComponent<Image>().color = Color.clear;
            var konten = HudKamar.BuatKotak("Daftar upgrade", viewport);
            HudKamar.Rentangkan(konten, Vector2.up, Vector2.one);
            konten.pivot = new Vector2(.5f, 1);
            Susun(konten, 18, 0);
            gulir = bingkai.gameObject.AddComponent<ScrollRect>();
            gulir.viewport = viewport;
            gulir.content = konten;
            gulir.horizontal = false;
            gulir.movementType = ScrollRect.MovementType.Clamped;
            BuatTeks(konten, "Upgrade kamar", 52, true);
            var tutup = BuatTombol(hud, bingkai, "Tutup", out _, out _);
            var posisiTutup = (RectTransform)tutup.transform;
            HudKamar.Rentangkan(posisiTutup, new Vector2(0, .82f), Vector2.one);
            posisiTutup.offsetMin = new Vector2(24, 0);
            posisiTutup.offsetMax = new Vector2(-24, -24);
            tutup.onClick.AddListener(() => layanan?.Tutup());
            for (int i = 0; i < kartu.Length; i++)
            {
                var item = new Kartu { Akar = HudKamar.BuatKotak("Perabot " + (i + 1), konten) };
                hud.Gambar(item.Akar, TemaAntarmuka.Kertas);
                Susun(item.Akar, 8, 18);
                item.Nama = BuatTeks(item.Akar, "", 43, true);
                item.Info = BuatTeks(item.Akar, "", 36);
                item.Beli = BuatTombol(hud, item.Akar, "Beli", out item.Label, out item.Ukuran);
                item.Beli.onClick.AddListener(() =>
                {
                    if (Terbuka && layanan.BolehBeli(item.Id, out _)) layanan.Beli(item.Id);
                });
                item.Alasan = BuatTeks(item.Akar, "", 33);
                kartu[i] = item;
            }
            akar.gameObject.SetActive(false);
        }

        internal void Hubungkan(IUpgradeKamar baru)
        {
            if (ReferenceEquals(layanan, baru)) return;
            if (layanan != null) layanan.Berubah -= Segarkan;
            layanan = baru;
            if (layanan != null) layanan.Berubah += Segarkan;
            Segarkan();
        }

        internal void Tutup() => layanan?.Tutup();

        internal void Ukur(float skala)
        {
            float tinggi = Mathf.Max(88, 56 / skala);
            foreach (var item in kartu) item.Ukuran.minHeight = tinggi;
        }

        void Segarkan()
        {
            bool baruBuka = !Terbuka;
            akar.gameObject.SetActive(layanan?.Terbuka == true);
            if (!Terbuka) return;
            if (baruBuka)
            {
                saatBuka();
                akar.SetAsLastSibling();
            }
            for (int i = 0; i < kartu.Length; i++)
            {
                var item = kartu[i];
                bool ada = i < layanan.Daftar.Count;
                item.Akar.gameObject.SetActive(ada);
                if (!ada) continue;
                var data = layanan.Daftar[i];
                item.Id = data.Id;
                string ikon = Ikon(data, item.Nama);
                item.Nama.text = $"{ikon}  {data.Nama}  •  Lv {data.Level}/{data.LevelMaks}";
                item.Info.text = $"{data.LabelSekarang}\n{Efek(data.DeskripsiSekarang)}";
                if (data.HargaBerikut >= 0)
                    item.Info.text += $"\nBerikutnya: {data.LabelBerikut}\n{Efek(data.DeskripsiBerikut)}";
                item.Label.text = data.HargaBerikut >= 0 ? "Beli · Rp" + data.HargaBerikut.ToString("N0", Indonesia) : "Level maksimal";
                bool boleh = layanan.BolehBeli(data.Id, out var alasan);
                item.Beli.interactable = boleh;
                item.Beli.targetGraphic.color = boleh ? TemaAntarmuka.Mentega : TemaAntarmuka.Pasif;
                item.Alasan.gameObject.SetActive(!boleh);
                if (!boleh) item.Alasan.text = string.IsNullOrWhiteSpace(alasan) ? "Upgrade belum tersedia." : HudKamar.BersihkanEmoji(alasan);
            }
            if (baruBuka)
            {
                Canvas.ForceUpdateCanvases();
                gulir.verticalNormalizedPosition = 1;
            }
        }

        static string Ikon(InfoPerabot data, TextMeshProUGUI teks)
        {
            if (!string.IsNullOrEmpty(data.Ikon) && teks.font != null && teks.font.HasCharacters(data.Ikon))
                return data.Ikon;
            return data.Id switch { "kasur" => "Zz", "meja" => "IPK", "kipas" => "AC", _ => "+" };
        }

        static string Efek(string teks) => HudKamar.BersihkanEmoji((teks ?? "")
            .Replace("⚡", "energi ").Replace("😵", "stres ").Replace("🎓", "IPK "));

        static void Susun(RectTransform wadah, int jarak, int tepi)
        {
            var layout = wadah.gameObject.AddComponent<VerticalLayoutGroup>();
            layout.spacing = jarak;
            layout.padding = new RectOffset(tepi, tepi, tepi, tepi);
            layout.childControlWidth = layout.childControlHeight = true;
            layout.childForceExpandHeight = false;
            // Hanya konten scroll yang mengatur tinggi sendiri. Kartu memakai tinggi dari parent.
            if (tepi == 0) wadah.gameObject.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        }

        static TextMeshProUGUI BuatTeks(Transform induk, string isi, float ukuran, bool tebal = false)
        {
            var t = HudKamar.Teks(induk, isi, ukuran, ukuran, tebal ? FontStyles.Bold : FontStyles.Normal);
            t.enableAutoSizing = false;
            t.fontSize = ukuran;
            t.textWrappingMode = TextWrappingModes.Normal;
            t.overflowMode = TextOverflowModes.Overflow;
            return t;
        }

        static Button BuatTombol(HudKamar hud, Transform induk, string nama, out TextMeshProUGUI label, out LayoutElement ukuran)
        {
            var rt = HudKamar.BuatKotak(nama, induk);
            ukuran = rt.gameObject.AddComponent<LayoutElement>();
            var gambar = hud.Gambar(rt, TemaAntarmuka.Mentega, true);
            var button = rt.gameObject.AddComponent<Button>();
            button.targetGraphic = gambar;
            button.transition = Selectable.Transition.None;
            label = BuatTeks(rt, nama, 40, true);
            HudKamar.Rentangkan(label.rectTransform, Vector2.zero, Vector2.one);
            return button;
        }
    }
}
