using UnityEngine;

namespace MS.Pemain
{
    internal sealed class BidikanInteraksi
    {
        internal const float Jangkauan = 2f;
        internal enum Jenis { Titik, Tangan, Bicara, Kunci }
        readonly RaycastHit[] benturan = new RaycastHit[24];
        readonly Texture2D[] ikon = new Texture2D[4];

        internal TitikInteraksi Cari(Ray ray, Vector3 mata, Transform pemain)
        {
            // ViewportPointToRay dimulai di near plane. Jarak diukur dari mata.
            ray.origin = mata;
            int jumlah = Physics.RaycastNonAlloc(ray, benturan, Jangkauan,
                Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore);
            Collider terhalang = null;
            float jarakHalangan = Jangkauan;
            for (int i = 0; i < jumlah; i++)
            {
                var hit = benturan[i];
                if (hit.collider.transform.IsChildOf(pemain) || hit.distance >= jarakHalangan) continue;
                jarakHalangan = hit.distance;
                terhalang = hit.collider;
            }

            // Titik warisan tidak punya collider. Volume bidik mengikuti jenis benda di atas penanda lantai.
            TitikInteraksi terbaik = null;
            float jarakTerbaik = Jangkauan;
            var daftar = TitikInteraksi.Semua;
            for (int i = 0; i < daftar.Count; i++)
            {
                var titik = daftar[i];
                if (titik == null || string.IsNullOrEmpty(titik.idAksi) ||
                    titik.gameObject.scene != pemain.gameObject.scene) continue;
                var (tinggi, radius) = UkuranBidik(titik.idAksi);
                Vector3 pusat = titik.transform.position + Vector3.up * tinggi;
                Vector3 delta = pusat - mata;
                float proyeksi = Vector3.Dot(delta, ray.direction);
                if (proyeksi <= 0f || delta.sqrMagnitude > Jangkauan * Jangkauan) continue;
                float melintang2 = delta.sqrMagnitude - proyeksi * proyeksi;
                if (melintang2 > radius * radius) continue;
                float masuk = Mathf.Max(0f, proyeksi - Mathf.Sqrt(radius * radius - melintang2));
                if (masuk > jarakTerbaik || masuk > jarakHalangan + .03f) continue;
                if (terhalang != null && proyeksi > jarakHalangan + radius &&
                    !titik.transform.IsChildOf(terhalang.transform) &&
                    !terhalang.transform.IsChildOf(titik.transform)) continue;

                terbaik = titik;
                jarakTerbaik = masuk;
            }
            return terbaik;
        }

        internal static bool AksiBicara(string id) =>
            id is "ngobrolWarga" or "ngobrolBuKos" or "menuWarga";

        static (float, float) UkuranBidik(string id)
        {
            if (AksiBicara(id)) return (1.22f, .48f);
            if (id.StartsWith("masuk", System.StringComparison.Ordinal) ||
                id.StartsWith("keluar", System.StringComparison.Ordinal)) return (1.02f, .58f);
            return id switch
            {
                "ambilPindahan" => (0f, .32f),
                "tataLaptop" => (.73f, .40f),
                "tidur" or "rebahan" or "mandi" or "siramCabai" => (.35f, .49f),
                "belajar" or "masakMi" or "minum" or "naikMotor" => (.69f, .46f),
                _ => (.9f, .5f)
            };
        }

        internal void Gambar(Rect bidang, Jenis jenis)
        {
            int indeks = (int)jenis;
            if (ikon[indeks] == null) ikon[indeks] = BuatIkon(jenis);
            float sisi = Mathf.Clamp(bidang.height / 48f, 15f, 36f);
            var posisi = new Rect(bidang.center.x - sisi / 2f,
                Screen.height - bidang.center.y - sisi / 2f, sisi, sisi);
            GUI.DrawTexture(posisi, ikon[indeks]);
        }

        internal void Lepaskan()
        {
            foreach (var gambar in ikon)
                if (gambar != null) Object.Destroy(gambar);
        }

        static Texture2D BuatIkon(Jenis jenis)
        {
            string[] pola = jenis switch
            {
                Jenis.Tangan => new[]
                {
                    "     ##    ", "     ##    ", "     ##    ", "     ####  ", "     ######",
                    "##   ######", " ##########", "  #########", "   ####### ", "    ###### ", "    ###### "
                },
                Jenis.Bicara => new[]
                {
                    "           ", " ######### ", "###########", "##       ##", "## # # # ##",
                    "##       ##", "###########", " ######### ", "   ##      ", "   #       ", "           "
                },
                Jenis.Kunci => new[]
                {
                    "   #####   ", "  ##   ##  ", "  ##   ##  ", "  ##   ##  ", " ######### ",
                    " ######### ", " #### #### ", " #### #### ", " ######### ", " ######### ", "           "
                },
                _ => new[]
                {
                    "           ", "           ", "           ", "           ", "     #     ",
                    "    ###    ", "     #     ", "           ", "           ", "           ", "           "
                }
            };
            const int lebar = 13;
            var gambar = new Texture2D(lebar, lebar, TextureFormat.RGBA32, false)
            {
                name = "Bidikan " + jenis,
                filterMode = FilterMode.Point,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.HideAndDontSave
            };
            var piksel = new Color32[lebar * lebar];
            var tepi = new Color32(21, 25, 29, 245);
            var isi = new Color32(255, 252, 239, 255);
            for (int y = 0; y < pola.Length; y++)
                for (int x = 0; x < pola[y].Length; x++)
                    if (pola[y][x] == '#')
                        for (int dy = -1; dy <= 1; dy++)
                            for (int dx = -1; dx <= 1; dx++)
                                piksel[(11 - y + dy) * lebar + x + 1 + dx] = tepi;
            for (int y = 0; y < pola.Length; y++)
                for (int x = 0; x < pola[y].Length; x++)
                    if (pola[y][x] == '#') piksel[(11 - y) * lebar + x + 1] = isi;
            gambar.SetPixels32(piksel);
            gambar.Apply(false, true);
            return gambar;
        }
    }
}
