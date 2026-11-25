using UnityEngine;

namespace MS.Dunia
{
    internal static class VisualInterior
    {
        public static void Pasang(GameObject induk, string id)
        {
            var ruang = GameObject.Find("Ruang " + id)?.transform;
            var lantai = ruang?.Find("Lantai");
            if (lantai == null) return;
            var bahan = induk.AddComponent<BahanRealistis>();
            var ukuran = lantai.localScale;
            var (aksen, jenisLantai, label) = Tema(id);
            var ubin = new Vector2(ukuran.x * .55f, ukuran.z * .55f);
            bahan.Permukaan(lantai, jenisLantai, new Color(.91f, .89f, .84f), ubin);
            foreach (Transform anak in ruang)
            {
                if (!anak.name.StartsWith("Dinding")) continue;
                bahan.Permukaan(anak, "plastered_wall_02", Color.Lerp(aksen, Color.white, .79f), new Vector2(5, 2));
            }

            float belakang = ukuran.z * .5f;
            float kiri = -ukuran.x * .5f;
            var kayu = bahan.Ambil("wood_table_001", new Color(.65f, .53f, .42f), Vector2.one);
            var panel = bahan.Ambil(null, aksen, Vector2.one);
            var lapis = bahan.Ambil(null, Color.Lerp(aksen, Color.white, .67f), Vector2.one);
            bahan.Detail(ruang, "Lis belakang", new Vector3(0, .085f, belakang - .025f),
                new Vector3(ukuran.x, .17f, .064f), kayu);
            bahan.Detail(ruang, label, new Vector3(0, 1.87f, belakang - .075f),
                new Vector3(Mathf.Min(3.2f, ukuran.x * .47f), .64f, .12f), panel);
            bahan.Detail(ruang, "Bingkai " + label, new Vector3(0, 1.53f, belakang - .12f),
                new Vector3(Mathf.Min(3.2f, ukuran.x * .47f), .045f, .12f), kayu);
            for (var i = 0; i < 4; i++)
                bahan.Detail(ruang, "Panel dinding", new Vector3(kiri + .75f + .24f * i, 1.69f, belakang - .14f),
                    new Vector3(.17f, .28f + .07f * (i % 3), .055f), i % 2 == 0 ? panel : lapis);

            if (id == "warteg" || id == "warkop" || id == "kafe")
            {
                var kaca = bahan.Ambil(null, new Color(.62f, .74f, .68f), Vector2.one);
                kaca.SetFloat("_Smoothness", .83f);
                bahan.Detail(ruang, "Ambalan saji", new Vector3(-1.62f, .99f, belakang - .21f),
                    new Vector3(1.84f, .11f, .46f), kayu);
                for (var i = 0; i < 4; i++)
                    bahan.Detail(ruang, id == "warteg" ? "Wadah etalase" : "Wadah kopi",
                        new Vector3(-2.24f + .33f * i, 1.17f, belakang - .30f),
                        new Vector3(.18f, .14f, .19f), i % 2 == 0 ? kaca : lapis, PrimitiveType.Cylinder);
            }
        }

        static (Color, string, string) Tema(string id) => id switch
        {
            "bank" => (new Color(.21f, .32f, .41f), "Tiles074", "Panel layanan"),
            "fotokopi" => (new Color(.35f, .39f, .46f), "concrete_floor_02", "Rak hasil cetak"),
            "gor" => (new Color(.21f, .38f, .38f), "wood_table_001", "Papan skor"),
            "kafe" => (new Color(.41f, .29f, .22f), "wood_table_001", "Panel menu"),
            "kampus" => (new Color(.15f, .30f, .25f), "Tiles074", "Papan tulis"),
            "karier" => (new Color(.24f, .37f, .47f), "Tiles074", "Papan lowongan"),
            "klinik" => (new Color(.32f, .56f, .50f), "Tiles074", "Panel pemeriksaan"),
            "laundry" => (new Color(.28f, .41f, .52f), "concrete_floor_02", "Panel antrean"),
            "minimarket" => (new Color(.53f, .27f, .27f), "Tiles074", "Panel promosi"),
            "pasar" => (new Color(.53f, .38f, .24f), "concrete_floor_02", "Panel lapak"),
            "perpus" => (new Color(.37f, .30f, .24f), "wood_table_001", "Panel katalog"),
            "polisi" => (new Color(.28f, .34f, .39f), "Tiles074", "Panel pengaduan"),
            "salon" => (new Color(.48f, .34f, .43f), "Tiles074", "Panel pilihan gaya"),
            "tani" => (new Color(.37f, .45f, .24f), "concrete_floor_02", "Panel benih"),
            "warkop" => (new Color(.43f, .29f, .21f), "concrete_floor_02", "Panel kopi"),
            "warnet" => (new Color(.25f, .31f, .48f), "concrete_floor_02", "Panel paket"),
            _ => (new Color(.23f, .45f, .33f), "Tiles074", "Panel lauk")
        };
    }
}
