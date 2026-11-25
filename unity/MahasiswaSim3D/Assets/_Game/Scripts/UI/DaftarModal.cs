using MS.Kontrak;
using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace MS.UI
{
    internal sealed class DaftarModal
    {
        readonly RectTransform akar, isi;
        readonly ScrollRect gulir;
        readonly HudKamar hud;
        readonly TextMeshProUGUI judul, info;
        readonly List<GameObject> baris = new();
        readonly List<LayoutElement> targetSentuh = new();
        float tinggi = 145;
        internal bool Terbuka => akar.gameObject.activeSelf;

        internal DaftarModal(HudKamar hud, RectTransform induk, string nama, Action tutup)
        {
            this.hud = hud;
            akar = HudKamar.BuatKotak(nama, induk);
            HudKamar.Rentangkan(akar, Vector2.zero, Vector2.one);
            akar.gameObject.AddComponent<Image>().color = TemaAntarmuka.Redup;
            var kartu = HudKamar.BuatKotak("Kartu", akar);
            HudKamar.Rentangkan(kartu, new Vector2(.09f,.05f), new Vector2(.91f,.9f));
            hud.Gambar(kartu, TemaAntarmuka.Kertas, true);
            var port = HudKamar.BuatKotak("Viewport", kartu);
            HudKamar.Rentangkan(port, Vector2.zero, new Vector2(1, .82f));
            port.offsetMin = new Vector2(24,24);
            port.offsetMax = new Vector2(-24,-24);
            port.gameObject.AddComponent<RectMask2D>();
            port.gameObject.AddComponent<Image>().color = Color.clear;
            isi = HudKamar.BuatKotak("Isi", port);
            HudKamar.Rentangkan(isi, Vector2.up, Vector2.one);
            isi.pivot = new Vector2(.5f,1);
            Susun(isi, 12, 0);
            isi.gameObject.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            gulir = kartu.gameObject.AddComponent<ScrollRect>();
            gulir.viewport = port;
            gulir.content = isi;
            gulir.horizontal = false;
            gulir.movementType = ScrollRect.MovementType.Clamped;
            judul = Teks(isi, "", 48, true);
            info = Teks(isi, "", 32);
            var tombol = (RectTransform)BuatBaris("Tutup", "", true, tutup, null, kartu).transform;
            HudKamar.Rentangkan(tombol, new Vector2(0, .82f), Vector2.one);
            tombol.offsetMin = new Vector2(24, 0);
            tombol.offsetMax = new Vector2(-24, -24);
            baris.Clear();
            akar.gameObject.SetActive(false);
        }

        internal void Tampil(bool tampil, string nama = "", string ringkasan = "")
        {
            bool baru = !Terbuka && tampil;
            akar.gameObject.SetActive(tampil);
            if (!tampil) return;
            if (baru) akar.SetAsLastSibling();
            bool reset = baru || judul.text != nama;
            judul.text = nama;
            info.text = ringkasan;
            info.gameObject.SetActive(!string.IsNullOrWhiteSpace(ringkasan));
            foreach (var objek in baris)
            {
                if (objek.TryGetComponent<LayoutElement>(out var ukuran)) targetSentuh.Remove(ukuran);
                objek.SetActive(false);
                UnityEngine.Object.Destroy(objek);
            }
            baris.Clear();
            if (reset) isi.anchoredPosition = Vector2.zero;
        }

        internal void Tambah(string nama, string detail, bool boleh, Action klik, Color? contoh = null)
            => BuatBaris(nama, detail, boleh, klik, contoh);

        GameObject BuatBaris(string nama, string detail, bool boleh, Action klik, Color? contoh, RectTransform induk = null)
        {
            var rt = HudKamar.BuatKotak(nama, induk ?? isi);
            Susun(rt, 5, 14);
            if (klik != null)
            {
                var ukuran = rt.gameObject.AddComponent<LayoutElement>();
                ukuran.minHeight = tinggi;
                targetSentuh.Add(ukuran);
                var gambar = hud.Gambar(rt, boleh ? TemaAntarmuka.Mentega : TemaAntarmuka.Pasif, true);
                var tombol = rt.gameObject.AddComponent<Button>();
                tombol.targetGraphic = gambar;
                tombol.transition = Selectable.Transition.None;
                tombol.interactable = boleh;
                tombol.onClick.AddListener(() => klik());
            }
            Teks(rt, nama, 38, true);
            if (!string.IsNullOrWhiteSpace(detail)) Teks(rt, detail, 31);
            if (contoh.HasValue)
            {
                var swatch = HudKamar.BuatKotak("Contoh warna", rt);
                var ukuran = swatch.gameObject.AddComponent<LayoutElement>();
                ukuran.minHeight = 34;
                swatch.gameObject.AddComponent<Image>().color = contoh.Value;
            }
            baris.Add(rt.gameObject);
            return rt.gameObject;
        }

        internal void Ukur(float skala)
        {
            tinggi = Mathf.Max(100, 56 / Mathf.Max(.05f, skala));
            foreach (var ukuran in targetSentuh) ukuran.minHeight = tinggi;
        }

        internal static string Ikon(string ikon, string cadangan)
        {
            var font = TMP_Settings.defaultFontAsset;
            return !string.IsNullOrEmpty(ikon) && font != null && font.HasCharacters(ikon) ? ikon : cadangan;
        }

        static void Susun(RectTransform rt, int jarak, int tepi)
        {
            var susun = rt.gameObject.AddComponent<VerticalLayoutGroup>();
            susun.spacing = jarak;
            susun.padding = new RectOffset(tepi, tepi, tepi, tepi);
            susun.childControlHeight = susun.childControlWidth = true;
            susun.childForceExpandHeight = false;
        }

        static TextMeshProUGUI Teks(Transform induk, string teks, float ukuran, bool tebal = false)
        {
            var label = HudKamar.Teks(induk, teks, ukuran, ukuran, tebal ? FontStyles.Bold : FontStyles.Normal);
            label.enableAutoSizing = false;
            label.fontSize = ukuran;
            label.textWrappingMode = TextWrappingModes.Normal;
            label.overflowMode = TextOverflowModes.Overflow;
            return label;
        }
    }
}
