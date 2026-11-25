using MS.Kontrak;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace MS.UI
{
    internal sealed class WidgetBukuSakti
    {
        readonly TextMeshProUGUI isi;
        readonly Button buka;
        readonly RectTransform areaRingkas;
        ICerita cerita;
        bool disembunyikan;

        internal WidgetBukuSakti(HudKamar hud, RectTransform area)
        {
            var tombol = HudKamar.BuatKotak("Buku Sakti", area);
            tombol.anchorMin = tombol.anchorMax = tombol.pivot = Vector2.one;
            tombol.anchoredPosition = new Vector2(-24, -306);
            tombol.sizeDelta = new Vector2(268, 118);
            buka = tombol.gameObject.AddComponent<Button>();
            // Image and Button share the same hit target.
            buka.targetGraphic = hud.Gambar(tombol, TemaAntarmuka.Mentega, true);
            buka.onClick.AddListener(() =>
            {
                if (!Layanan.InputDitahan) cerita?.BukaBukuSakti();
            });
            var teksTombol = HudKamar.Teks(tombol, "Buku Sakti", 36, 26, FontStyles.Bold);
            HudKamar.Rentangkan(teksTombol.rectTransform, Vector2.zero, Vector2.one);
            IkonHud.Pasang(tombol, IkonHud.Jenis.Buku);

            areaRingkas = HudKamar.BuatKotak("Ringkasan Buku Sakti", area);
            hud.Gambar(areaRingkas, TemaAntarmuka.Kertas, true);
            var lipat = areaRingkas.gameObject.AddComponent<Button>();
            lipat.onClick.AddListener(() => { disembunyikan = !disembunyikan; Segarkan(); });
            isi = HudKamar.Teks(areaRingkas, "", 36, 26, FontStyles.Bold);
            isi.textWrappingMode = TextWrappingModes.Normal;
            HudKamar.Rentangkan(isi.rectTransform, new Vector2(.03f, .05f), new Vector2(.97f, .95f));
            Segarkan();
        }

        internal void Hubungkan(ICerita berikut)
        {
            if (ReferenceEquals(cerita, berikut)) return;
            if (cerita != null) cerita.Berubah -= Segarkan;
            cerita = berikut;
            if (cerita != null) cerita.Berubah += Segarkan;
            Segarkan();
        }

        void Segarkan()
        {
            buka.gameObject.SetActive(cerita != null);
            bool aktif = !string.IsNullOrEmpty(cerita?.BabJudul);
            isi.transform.parent.gameObject.SetActive(aktif);
            if (!aktif) return;
            HudKamar.Rentangkan(areaRingkas, new Vector2(.02f, 1), new Vector2(disembunyikan ? .30f : .70f, 1));
            areaRingkas.offsetMin = new Vector2(0, disembunyikan ? -378 : -445);
            areaRingkas.offsetMax = new Vector2(0, -306);
            if (disembunyikan) { isi.text = "Tampilkan tujuan"; return; }

            InfoTujuan berikut = null;
            int selesai = 0;
            var tujuan = cerita.Tujuan;
            if (tujuan != null)
                foreach (var item in tujuan)
                {
                    if (item.Selesai) selesai++;
                    else berikut ??= item;
                }
            string detail = berikut == null ? "Tujuan selesai" : HudKamar.BersihkanEmoji(berikut.Teks ?? "");
            if (berikut != null && berikut.Target > 1) detail += $" ({berikut.Sekarang}/{berikut.Target})";
            isi.text = $"{cerita.BabJudul} · {selesai}/{tujuan?.Count ?? 0}\n{detail}  ·  Ketuk untuk ringkas";
        }
    }
}
