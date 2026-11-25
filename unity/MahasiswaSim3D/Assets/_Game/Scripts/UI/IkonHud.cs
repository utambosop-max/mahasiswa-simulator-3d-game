using System.Collections.Generic;
using MS.Kontrak;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace MS.UI
{
    internal static class IkonHud
    {
        internal enum Jenis { Buku, Rumah, Jam, Uang, Ipk, Energi, Stres, Dialog, Kamera, Aksi, Arah, Cuaca, Pengaturan }
        static readonly Dictionary<Jenis, Texture2D> Tekstur = new();

        internal static RawImage Pasang(RectTransform induk, Jenis jenis, float ukuran = 38, Vector2? jangkar = null)
        {
            var posisi = jangkar ?? new Vector2(0, .5f);
            if (!jangkar.HasValue)
            {
                var teks = induk.GetComponentInChildren<TextMeshProUGUI>();
                if (teks != null) teks.rectTransform.offsetMin += new Vector2(ukuran + 26, 0);
            }
            var rt = HudKamar.BuatKotak("Ikon", induk);
            rt.anchorMin = rt.anchorMax = posisi;
            rt.anchoredPosition = jangkar.HasValue ? Vector2.zero : new Vector2(ukuran * .5f + 15, 0);
            rt.sizeDelta = Vector2.one * ukuran;
            var gambar = rt.gameObject.AddComponent<RawImage>();
            gambar.raycastTarget = false;
            gambar.color = TemaAntarmuka.Tinta;
            gambar.texture = Ambil(jenis);
            return gambar;
        }

        internal static Texture2D Ambil(Jenis jenis)
        {
            if (Tekstur.TryGetValue(jenis, out var lama) && lama != null) return lama;
            const int sisi = 64;
            var garis = jenis switch
            {
                Jenis.Buku => new[] { "8,9 8,53 34,53 49,46 49,12 34,18 8,9", "34,53 34,18", "15,42 26,42", "15,33 26,33" },
                Jenis.Rumah => new[] { "6,31 32,54 58,31", "12,35 12,10 52,10 52,35", "26,10 26,26 38,26 38,10" },
                Jenis.Jam => new[] { "32,55 46,50 54,37 54,25 46,13 32,9 18,13 10,25 10,37 18,50 32,55", "32,46 32,31 43,25" },
                Jenis.Uang => new[] { "8,17 56,17 56,47 8,47 8,17", "32,23 40,32 32,41 24,32 32,23", "14,26 14,38", "50,26 50,38" },
                Jenis.Ipk => new[] { "5,39 32,53 59,39 32,25 5,39", "16,32 16,20 32,12 48,20 48,32", "59,39 59,26" },
                Jenis.Energi => new[] { "34,56 12,28 29,28 25,8 52,38 34,38 38,56 34,56" },
                Jenis.Stres => new[] { "32,53 48,47 54,32 48,17 32,11 16,17 10,32 16,47 32,53", "21,38 24,35", "43,38 40,35", "22,23 32,29 42,23" },
                Jenis.Dialog => new[] { "9,53 55,53 55,20 29,20 14,8 15,20 9,20 9,53", "19,41 45,41", "19,31 40,31" },
                Jenis.Kamera => new[] { "9,44 22,44 26,52 40,52 44,44 55,44 55,13 9,13 9,44", "32,40 43,29 32,18 21,29 32,40" },
                Jenis.Arah => new[] { "32,9 32,55", "9,32 55,32", "24,47 32,55 40,47", "24,17 32,9 40,17", "17,24 9,32 17,40", "47,24 55,32 47,40" },
                Jenis.Cuaca => new[] { "12,18 53,18 55,30 49,38 40,38 35,49 24,50 15,42 13,34 7,30 7,23 12,18" },
                Jenis.Pengaturan => new[]
                {
                    "27,55 37,55 40,46 48,49 55,42 51,34 56,27 51,18 42,19 37,10 27,10 23,19 14,18 9,27 14,34 10,42 17,49 24,46 27,55",
                    "32,42 39,39 42,32 39,25 32,22 25,25 22,32 25,39 32,42"
                },
                _ => new[] { "10,32 51,32", "35,48 51,32 35,16" }
            };
            var ruas = new List<(Vector2 a, Vector2 b)>();
            foreach (string jalur in garis)
            {
                Vector2? lalu = null;
                foreach (string token in jalur.Split(' '))
                {
                    var xy = token.Split(',');
                    var titik = new Vector2(int.Parse(xy[0]), int.Parse(xy[1]));
                    if (lalu.HasValue) ruas.Add((lalu.Value, titik));
                    lalu = titik;
                }
            }
            var warna = new Color32[sisi * sisi];
            for (int y = 0; y < sisi; y++)
            for (int x = 0; x < sisi; x++)
            {
                var p = new Vector2(x + .5f, y + .5f);
                float alfa = 0;
                foreach (var (a, b) in ruas)
                {
                    var ab = b - a;
                    var dekat = a + ab * Mathf.Clamp01(Vector2.Dot(p - a, ab) / ab.sqrMagnitude);
                    alfa = Mathf.Max(alfa, Mathf.Clamp01(2.8f - Vector2.Distance(p, dekat)));
                }
                warna[y * sisi + x] = new Color(1, 1, 1, alfa);
            }
            var hasil = new Texture2D(sisi, sisi, TextureFormat.RGBA32, false)
                { wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
            hasil.SetPixels32(warna);
            hasil.Apply(false, true);
            Tekstur[jenis] = hasil;
            return hasil;
        }
    }
}
