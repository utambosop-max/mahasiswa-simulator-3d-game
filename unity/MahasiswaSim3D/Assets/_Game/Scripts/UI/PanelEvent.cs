using MS.Kontrak;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace MS.UI
{
    internal sealed class PanelEvent
    {
        readonly RectTransform akar;
        readonly RectTransform kartu, konten, viewport, tutupDialog;
        readonly CanvasGroup animasi;
        readonly HudKamar hud;
        readonly GameObject bukaLagi;
        readonly ScrollRect gulir;
        readonly TextMeshProUGUI judul, isi;
        readonly Image latarPanel, latarKartu;
        readonly GameObject konfeti;
        readonly Button[] tombol = new Button[3];
        readonly LayoutElement[] ukuran = new LayoutElement[3];
        readonly TextMeshProUGUI[] label = new TextMeshProUGUI[3], alasan = new TextMeshProUGUI[3];
        readonly System.Action saatBuka;
        IEventAcak layanan;
        Coroutine sedangMuncul;
        bool disembunyikan;
        float ruangBawah = 120;

        internal bool Terbuka => akar.gameObject.activeSelf;
        internal void KeDepan()
        {
            if (Terbuka && !disembunyikan && akar.GetSiblingIndex() != akar.parent.childCount - 1)
                akar.SetAsLastSibling();
        }

        internal PanelEvent(HudKamar hud, RectTransform area, System.Action saatBuka)
        {
            this.hud = hud;
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
            kartu = HudKamar.BuatKotak("Kartu event", akar);
            HudKamar.Rentangkan(kartu, new Vector2(.16f, .5f), new Vector2(.84f, .5f));
            latarKartu = hud.Gambar(kartu, TemaAntarmuka.Kertas, true);
            animasi = kartu.gameObject.AddComponent<CanvasGroup>();

            viewport = HudKamar.BuatKotak("Viewport event", kartu);
            HudKamar.Rentangkan(viewport, Vector2.zero, new Vector2(1, 1));
            viewport.offsetMin = new Vector2(30, 120);
            viewport.offsetMax = new Vector2(-30, -24);
            viewport.gameObject.AddComponent<RectMask2D>();
            viewport.gameObject.AddComponent<Image>().color = Color.clear;
            konten = HudKamar.BuatKotak("Isi event", viewport);
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

            var lencana = HudKamar.BuatKotak("Lencana dialog", konten);
            lencana.gameObject.AddComponent<LayoutElement>().minHeight = 80;
            IkonHud.Pasang(lencana, IkonHud.Jenis.Dialog, 68, new Vector2(.5f, .5f));
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
            tutupDialog = BuatKontrol(kartu, "Tutup dialog", () => AturRingkas(true));
            HudKamar.Rentangkan(tutupDialog, new Vector2(.07f, 0), new Vector2(.93f, 0));
            tutupDialog.offsetMin = new Vector2(0, 18);
            tutupDialog.offsetMax = new Vector2(0, 109);
            var buka = BuatKontrol(akar, "Lanjut dialog", () => AturRingkas(false));
            HudKamar.Rentangkan(buka, new Vector2(.37f, .57f), new Vector2(.63f, .57f));
            buka.sizeDelta = new Vector2(0, 125);
            bukaLagi = buka.gameObject;
            bukaLagi.SetActive(false);
            akar.gameObject.SetActive(false);
        }

        RectTransform BuatKontrol(Transform induk, string nama, System.Action klik)
        {
            var rt = HudKamar.BuatKotak(nama, induk);
            var tombol = rt.gameObject.AddComponent<Button>();
            tombol.targetGraphic = hud.Gambar(rt, TemaAntarmuka.Langit, true);
            tombol.onClick.AddListener(() => klik());
            var teks = Teks(rt, nama, 32, FontStyles.Bold);
            HudKamar.Rentangkan(teks.rectTransform, Vector2.zero, Vector2.one);
            return rt;
        }

        void AturRingkas(bool ringkas)
        {
            disembunyikan = ringkas;
            kartu.gameObject.SetActive(!ringkas);
            bukaLagi.SetActive(ringkas);
            latarPanel.enabled = !ringkas;
            if (!ringkas) UkurKartu();
        }

        void UkurKartu()
        {
            Canvas.ForceUpdateCanvases();
            LayoutRebuilder.ForceRebuildLayoutImmediate(konten);
            kartu.sizeDelta = new Vector2(0, Mathf.Min(akar.rect.height * .86f, konten.rect.height + ruangBawah + 24));
        }

        System.Collections.IEnumerator Muncul()
        {
            for (float t = 0; t < .18f; t += Time.unscaledDeltaTime)
            {
                animasi.alpha = Mathf.Clamp01(t / .18f);
                kartu.localScale = Vector3.one * Mathf.Lerp(.93f, 1, animasi.alpha);
                yield return null;
            }
            animasi.alpha = 1;
            kartu.localScale = Vector3.one;
            sedangMuncul = null;
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
            float minimum = TemaAntarmuka.SentuhMinimum / Mathf.Max(.05f, skala);
            foreach (var baris in ukuran) baris.minHeight = Mathf.Max(96f, minimum);
            var lanjut = (RectTransform)bukaLagi.transform;
            lanjut.sizeDelta = new Vector2(0, Mathf.Max(125, minimum));
            tutupDialog.offsetMax = new Vector2(0, 18 + Mathf.Max(90, minimum));
            ruangBawah = tutupDialog.offsetMax.y + 12;
            viewport.offsetMin = new Vector2(30, ruangBawah);
            if (Terbuka && !disembunyikan) UkurKartu();
        }

        void Tampilkan()
        {
            var data = layanan?.Aktif;
            akar.gameObject.SetActive(data != null);
            if (data == null) return;
            bool ending = data.Id?.StartsWith("cerita:end:", System.StringComparison.Ordinal) == true;
            konfeti.SetActive(ending);
            latarPanel.color = ending ? new Color(.27f, .13f, .08f, .8f) : new Color(0, 0, 0, .48f);
            latarKartu.color = ending ? TemaAntarmuka.Mentega : TemaAntarmuka.Kertas;
            saatBuka();
            akar.SetAsLastSibling();
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
                tombol[i].targetGraphic.color = boleh ? TemaAntarmuka.Mentega : TemaAntarmuka.Pasif;
                label[i].text = HudKamar.BersihkanEmoji(data.Pilihan[i] ?? "");
                if (boleh) continue;
                alasan[i].text = string.IsNullOrWhiteSpace(pesan) ? "Pilihan belum tersedia." : HudKamar.BersihkanEmoji(pesan);
                alasan[i].gameObject.SetActive(true);
            }
            AturRingkas(false);
            if (sedangMuncul != null) hud.StopCoroutine(sedangMuncul);
            sedangMuncul = hud.StartCoroutine(Muncul());
            gulir.verticalNormalizedPosition = 1;
        }
    }
}
