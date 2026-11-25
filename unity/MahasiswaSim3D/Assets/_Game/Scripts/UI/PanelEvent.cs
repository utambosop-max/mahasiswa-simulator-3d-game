using MS.Kontrak;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace MS.UI
{
    internal sealed class PanelEvent
    {
        readonly RectTransform akar;
        readonly ScrollRect gulir;
        readonly TextMeshProUGUI ikon, judul, isi;
        readonly Image latarPanel, latarKartu;
        readonly GameObject konfeti;
        readonly Button[] tombol = new Button[3];
        readonly LayoutElement[] ukuran = new LayoutElement[3];
        readonly TextMeshProUGUI[] label = new TextMeshProUGUI[3], alasan = new TextMeshProUGUI[3];
        readonly System.Action saatBuka;
        IEventAcak layanan;

        internal bool Terbuka => akar.gameObject.activeSelf;
        internal void KeDepan()
        {
            if (Terbuka && akar.GetSiblingIndex() != akar.parent.childCount - 1)
                akar.SetAsLastSibling();
        }

        internal PanelEvent(HudKamar hud, RectTransform area, System.Action saatBuka)
        {
            this.saatBuka = saatBuka;
            akar = HudKamar.BuatKotak("Panel event acak", area);
            HudKamar.Rentangkan(akar, Vector2.zero, Vector2.one);
            latarPanel = akar.gameObject.AddComponent<Image>();
            var hiasan = HudKamar.BuatKotak("Konfeti ending", akar);
            HudKamar.Rentangkan(hiasan, Vector2.zero, Vector2.one);
            konfeti = hiasan.gameObject;
            for (int i = 0; i < 24; i++)
            {
                var serpih = HudKamar.BuatKotak("Serpih", hiasan);
                float x = (i % 2 == 0 ? .045f : .955f) + Mathf.Sin(i * 3f) * .025f;
                float y = .12f + (i / 2) * .07f;
                serpih.anchorMin = serpih.anchorMax = new Vector2(x, y);
                serpih.sizeDelta = new Vector2(13 + i % 4 * 4, 24);
                serpih.localRotation = Quaternion.Euler(0, 0, i * 37);
                var gambar = serpih.gameObject.AddComponent<Image>();
                gambar.color = i % 3 == 0 ? new Color32(245,196,91,255) :
                    i % 3 == 1 ? new Color32(244,144,127,255) : new Color32(167,210,178,255);
                gambar.raycastTarget = false;
            }
            konfeti.SetActive(false);
            var kartu = HudKamar.BuatKotak("Kartu event", akar);
            HudKamar.Rentangkan(kartu, new Vector2(.13f, .08f), new Vector2(.87f, .84f));
            latarKartu = hud.Gambar(kartu, new Color32(255, 250, 242, 255), true);

            var viewport = HudKamar.BuatKotak("Viewport event", kartu);
            HudKamar.Rentangkan(viewport, Vector2.zero, Vector2.one);
            viewport.offsetMin = new Vector2(30, 24);
            viewport.offsetMax = new Vector2(-30, -24);
            viewport.gameObject.AddComponent<RectMask2D>();
            viewport.gameObject.AddComponent<Image>().color = Color.clear;
            var konten = HudKamar.BuatKotak("Isi event", viewport);
            HudKamar.Rentangkan(konten, Vector2.up, Vector2.one);
            konten.pivot = new Vector2(.5f, 1);
            var layout = konten.gameObject.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 16;
            layout.childControlWidth = true;
            layout.childControlHeight = true;
            layout.childForceExpandHeight = false;
            konten.gameObject.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            gulir = kartu.gameObject.AddComponent<ScrollRect>();
            gulir.viewport = viewport;
            gulir.content = konten;
            gulir.horizontal = false;
            gulir.movementType = ScrollRect.MovementType.Clamped;

            ikon = Teks(konten, "Ikon event", 78, FontStyles.Bold);
            judul = Teks(konten, "Judul event", 52, FontStyles.Bold);
            isi = Teks(konten, "Cerita event", 40, FontStyles.Normal);
            for (int i = 0; i < tombol.Length; i++)
            {
                int pilihan = i;
                var baris = HudKamar.BuatKotak("Pilihan event " + (i + 1), konten);
                ukuran[i] = baris.gameObject.AddComponent<LayoutElement>();
                var latar = hud.Gambar(baris, Color.white, true);
                tombol[i] = baris.gameObject.AddComponent<Button>();
                tombol[i].targetGraphic = latar;
                tombol[i].transition = Selectable.Transition.None;
                tombol[i].onClick.AddListener(() =>
                {
                    if (layanan?.Aktif != null && layanan.BolehPilih(pilihan, out _))
                        layanan.Pilih(pilihan);
                });
                label[i] = Teks(baris, "Label pilihan", 42, FontStyles.Bold);
                HudKamar.Rentangkan(label[i].rectTransform, new Vector2(.05f, .04f), new Vector2(.95f, .96f));
                alasan[i] = Teks(konten, "Alasan pilihan " + (i + 1), 34, FontStyles.Normal);
            }
            akar.gameObject.SetActive(false);
        }

        static TextMeshProUGUI Teks(Transform induk, string nama, float ukuran, FontStyles gaya)
        {
            var teks = HudKamar.Teks(induk, nama, ukuran, ukuran, gaya);
            teks.enableAutoSizing = false;
            teks.fontSize = ukuran;
            teks.textWrappingMode = TextWrappingModes.Normal;
            teks.overflowMode = TextOverflowModes.Overflow;
            return teks;
        }

        internal void Hubungkan(IEventAcak baru)
        {
            if (ReferenceEquals(layanan, baru)) return;
            if (layanan != null) layanan.Berubah -= Tampilkan;
            layanan = baru;
            if (layanan != null) layanan.Berubah += Tampilkan;
            Tampilkan();
        }

        internal void Ukur(float skala)
        {
            foreach (var baris in ukuran) baris.minHeight = Mathf.Max(96f, 56f / skala);
        }

        void Tampilkan()
        {
            var data = layanan?.Aktif;
            akar.gameObject.SetActive(data != null);
            if (data == null) return;
            bool ending = data.Id?.StartsWith("cerita:end:", System.StringComparison.Ordinal) == true;
            konfeti.SetActive(ending);
            latarPanel.color = ending ? new Color(.27f, .13f, .08f, .8f) : new Color(0, 0, 0, .48f);
            latarKartu.color = ending ? new Color32(255, 232, 188, 255) : new Color32(255, 250, 242, 255);
            saatBuka();
            akar.SetAsLastSibling();
            // Pakai ikon asli jika font mendukungnya; ! tetap terbaca di font bawaan.
            ikon.text = !string.IsNullOrEmpty(data.Ikon) &&
                ikon.font != null && ikon.font.HasCharacters(data.Ikon) ? data.Ikon : "!";
            judul.text = HudKamar.BersihkanEmoji(data.Judul ?? "");
            isi.text = HudKamar.BersihkanEmoji(data.Teks ?? "");
            for (int i = 0; i < tombol.Length; i++)
            {
                bool ada = i < (data.Pilihan?.Length ?? 0);
                tombol[i].gameObject.SetActive(ada);
                alasan[i].gameObject.SetActive(false);
                if (!ada) continue;
                bool boleh = layanan.BolehPilih(i, out string pesan);
                tombol[i].interactable = boleh;
                tombol[i].targetGraphic.color = boleh ? new Color32(255, 216, 172, 255) : new Color32(222, 217, 212, 255);
                label[i].text = HudKamar.BersihkanEmoji(data.Pilihan[i] ?? "");
                if (boleh) continue;
                alasan[i].text = string.IsNullOrWhiteSpace(pesan) ? "Pilihan belum tersedia." : HudKamar.BersihkanEmoji(pesan);
                alasan[i].gameObject.SetActive(true);
            }
            Canvas.ForceUpdateCanvases();
            gulir.verticalNormalizedPosition = 1;
        }
    }
}
