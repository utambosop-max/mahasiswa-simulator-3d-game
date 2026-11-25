using UnityEngine;

namespace MS.Kontrak
{
    public static class TemaAntarmuka
    {
        public static readonly Color Tinta = new Color32(59, 42, 32, 255);
        public static readonly Color Kertas = new Color32(255, 249, 236, 248);
        public static readonly Color Mentega = new Color32(252, 221, 153, 255);
        public static readonly Color Langit = new Color32(184, 224, 247, 255);
        public static readonly Color Mint = new Color32(174, 228, 196, 255);
        public static readonly Color Bata = new Color32(249, 181, 161, 255);
        public static readonly Color Jingga = new Color32(255, 179, 107, 255);
        public static readonly Color Pasif = new Color32(232, 220, 204, 255);
        public static readonly Color Redup = new Color32(59, 42, 32, 112);
        public const float TeksMinimum = 28;
        public const float SentuhMinimum = 56;
        static Sprite kartu, bulat;

        public static Sprite Bentuk(bool lingkaran = false)
        {
            if (lingkaran) return bulat != null ? bulat : bulat = Buat(true);
            return kartu != null ? kartu : kartu = Buat(false);
        }

        static Sprite Buat(bool lingkaran)
        {
            const int sisi = 64;
            var tekstur = new Texture2D(sisi, sisi, TextureFormat.RGBA32, false)
                { wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
            var piksel = new Color32[sisi * sisi];
            for (int y = 0; y < sisi; y++)
            for (int x = 0; x < sisi; x++)
            {
                var titik = new Vector2(x + .5f - 32, y + .5f - 32);
                var tepi = Vector2.Max(new Vector2(Mathf.Abs(titik.x), Mathf.Abs(titik.y)) - Vector2.one * 10, Vector2.zero);
                float jarak = lingkaran ? titik.magnitude - 29 : tepi.magnitude - 19;
                float cahaya = jarak > -1.6f ? .69f : y < 7 ? .85f : 1;
                piksel[y * sisi + x] = new Color(cahaya, cahaya, cahaya, Mathf.Clamp01(.5f - jarak));
            }
            tekstur.SetPixels32(piksel);
            tekstur.Apply(false, true);
            return Sprite.Create(tekstur, new Rect(0, 0, sisi, sisi), Vector2.one * .5f, 100, 0,
                SpriteMeshType.FullRect, lingkaran ? Vector4.zero : Vector4.one * 25);
        }
    }
}
