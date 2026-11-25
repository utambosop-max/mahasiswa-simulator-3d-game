using UnityEngine;

namespace MS.Dunia
{
    internal static class VisualKamar
    {
        public static void Pasang(GameObject induk)
        {
            var kamar = GameObject.Find("Kamar");
            if (kamar == null) return;
            var ruang = kamar.transform;
            var bahan = induk.AddComponent<BahanRealistis>();
            var plester = new Color(.91f, .82f, .68f);
            bahan.Permukaan(ruang.Find("Lantai"), "Tiles074", new Color(.98f, .91f, .83f), new Vector2(5, 4));
            foreach (var nama in new[] { "Dinding Belakang", "Dinding Kiri", "Dinding Kanan", "Dinding Depan" })
            {
                var dinding = ruang.Find(nama);
                bahan.Permukaan(dinding, "plastered_wall_02", plester, new Vector2(4, 2));
            }

            var kayu = bahan.Ambil("wood_table_001", new Color(.73f, .58f, .42f), Vector2.one);
            var kusen = bahan.Ambil(null, new Color(.22f, .16f, .12f), Vector2.one);
            var kaca = bahan.Ambil(null, new Color(.42f, .61f, .62f), Vector2.one);
            kaca.SetFloat("_Smoothness", .8f);
            var kain = bahan.Ambil(null, new Color(.47f, .57f, .50f), Vector2.one);
            var putih = bahan.Ambil(null, new Color(.87f, .83f, .74f), Vector2.one);
            var biru = bahan.Ambil(null, new Color(.19f, .48f, .66f), Vector2.one);
            bahan.Detail(ruang, "Lis dinding belakang", new Vector3(0, .08f, 3.47f), new Vector3(10, .16f, .06f), kayu);
            bahan.Detail(ruang, "Lis kepala dinding", new Vector3(0, 2.46f, 3.43f), new Vector3(10, .10f, .18f), putih);
            bahan.Detail(ruang, "Kusen jendela", new Vector3(-3.2f, 1.56f, 3.46f), new Vector3(1.67f, 1.03f, .12f), kusen);
            bahan.Detail(ruang, "Kaca jendela", new Vector3(-3.2f, 1.56f, 3.39f), new Vector3(1.49f, .87f, .04f), kaca);
            bahan.Detail(ruang, "Bilah jendela", new Vector3(-3.2f, 1.56f, 3.35f), new Vector3(.055f, .88f, .06f), kusen);
            bahan.Detail(ruang, "Rel gorden", new Vector3(-3.2f, 2.15f, 3.32f), new Vector3(1.92f, .048f, .06f), kusen);
            for (int sisi = -1; sisi <= 1; sisi += 2)
                for (int lipat = 0; lipat < 3; lipat++)
                    bahan.Detail(ruang, "Lipatan gorden", new Vector3(-3.2f + sisi * (.66f + .095f * lipat), 1.60f, 3.28f + .025f * (lipat % 2)),
                        new Vector3(.115f, 1.02f, .065f), kain);
            bahan.Detail(ruang, "Keset", new Vector3(-2.9f, .014f, 1.02f), new Vector3(1.62f, .025f, .72f), kain);
            bahan.Detail(ruang, "Galon", new Vector3(4.40f, .42f, 1.18f), new Vector3(.36f, .39f, .36f), biru, PrimitiveType.Cylinder);
            bahan.Detail(ruang, "Tutup galon", new Vector3(4.40f, .84f, 1.18f), new Vector3(.14f, .06f, .14f), putih, PrimitiveType.Cylinder);
        }
    }
}
