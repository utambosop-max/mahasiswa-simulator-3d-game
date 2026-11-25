using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace MS.UI
{
    internal static class IkonHud
    {
        internal enum Jenis { Buku, Rumah }
        static readonly Texture2D[] tekstur = new Texture2D[2];

        internal static void Pasang(RectTransform induk, Jenis jenis)
        {
            var teks = induk.GetComponentInChildren<TextMeshProUGUI>();
            if (teks != null) teks.rectTransform.offsetMin += new Vector2(55, 0);
            var rt = HudKamar.BuatKotak("Ikon", induk);
            rt.anchorMin = rt.anchorMax = new Vector2(0, .5f);
            rt.anchoredPosition = new Vector2(35, 0);
            rt.sizeDelta = new Vector2(35, 35);
            var gambar = rt.gameObject.AddComponent<RawImage>();
            gambar.raycastTarget = false;
            int i = (int)jenis;
            if (tekstur[i] == null)
            {
                string pola = jenis == Jenis.Buku
                    ? "0111110/1001011/1111011/1001011/1111011/1001011/0111110"
                    : "0001000/0011100/0111110/1111111/0101010/0101010/0111110";
                var baru = new Texture2D(7, 7, TextureFormat.RGBA32, false);
                baru.filterMode = FilterMode.Point;
                baru.wrapMode = TextureWrapMode.Clamp;
                var baris = pola.Split('/');
                for (int y = 0; y < 7; y++)
                    for (int x = 0; x < 7; x++)
                        baru.SetPixel(x, 6-y, baris[y][x] == '1' ? new Color32(86,53,39,255) : Color.clear);
                baru.Apply(false, true);
                tekstur[i] = baru;
            }
            gambar.texture = tekstur[i];
        }
    }
}
