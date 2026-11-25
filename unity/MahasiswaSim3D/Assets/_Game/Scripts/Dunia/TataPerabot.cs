using System;
using UnityEngine;

namespace MS.Dunia
{
    internal static class TataPerabot
    {
        public static void Interior(Transform ruang, string id)
        {
            var katalog = KatalogPropDunia.Muat();
            var perabot = ruang.Find("Perabot");
            if (katalog == null || perabot == null) return;
            foreach (Transform lama in perabot)
            {
                var jenis = lama.name.Replace(" (placeholder)", "");
                if (jenis.StartsWith("int_", StringComparison.Ordinal)) jenis = jenis.Substring(4);
                var sumber = Pilih(jenis, id);
                if (sumber != null) Ganti(lama, katalog.Ambil(sumber));
            }

            var ukuran = ruang.Find("Lantai").localScale;
            var (a, b) = Detail(id);
            Taruh(ruang, katalog.Ambil(a), new Vector3(-ukuran.x * .5f + .65f, 0, ukuran.z * .5f - .53f), .45f, 15);
            Taruh(ruang, katalog.Ambil(b), new Vector3(ukuran.x * .5f - .59f, 0, ukuran.z * .5f - .57f), .40f, -22);
        }

        public static void Kamar(Transform ruang, BahanRealistis bahan)
        {
            var katalog = KatalogPropDunia.Muat();
            if (katalog == null) return;
            var meja = ruang.Find("Perabot meja")?.GetComponent<ModelPerLevel>()?.perLevel;
            var namaMeja = new[] { "small_wooden_table_01", "SchoolDesk_01", "metal_office_desk" };
            if (meja != null)
                for (int i = 0; i < Mathf.Min(meja.Length, namaMeja.Length); i++)
                    if (meja[i] != null) Ganti(meja[i].transform, katalog.Ambil(namaMeja[i]));
            var lemari = ruang.Find("prop_lemari");
            if (lemari != null) Ganti(lemari, katalog.Ambil("painted_wooden_cabinet"));
            var kasur = ruang.Find("Perabot kasur")?.GetComponent<ModelPerLevel>()?.perLevel;
            if (kasur != null && kasur.Length >= 2)
            {
                if (kasur[0] != null)
                {
                    var tempat = kasur[0].transform;
                    var ukuran = Batas(tempat, kasur[0].GetComponentsInChildren<MeshRenderer>(true));
                    bool jadi = Ganti(tempat, katalog.Ambil("old_bed_frame"));
                    if (jadi)
                    {
                        var kain = bahan.Ambil("denim_fabric", new Color(.88f, .90f, .96f), new Vector2(2, 2));
                        kain.SetFloat("_Smoothness", .24f);
                        var bantal = bahan.Ambil(null, new Color(.84f, .85f, .79f), Vector2.one);
                        bahan.Detail(tempat, "Kasur kain", ukuran.center + Vector3.up * (ukuran.size.y * .13f),
                            Vector3.Scale(ukuran.size, new Vector3(.87f, .24f, .87f)), kain);
                        bahan.Detail(tempat, "Bantal kasur kain",
                            ukuran.center + new Vector3(0, ukuran.size.y * .27f, ukuran.size.z * .29f),
                            Vector3.Scale(ukuran.size, new Vector3(.58f, .21f, .24f)), bantal, PrimitiveType.Sphere);
                    }
                }
                if (kasur[1] != null) Ganti(kasur[1].transform, katalog.Ambil("vintage_day_bed"));
            }
            Taruh(ruang, katalog.Ambil("wooden_stool_01"), new Vector3(2.47f, 0, 2.24f), .43f, -15);
            Taruh(ruang, katalog.Ambil("wicker_basket_01"), new Vector3(-.28f, 0, 3.13f), .38f, 12);
            Taruh(ruang, katalog.Ambil("desk_lamp_arm_01"), new Vector3(3.59f, .80f, 2.96f), .41f, 14);
            Taruh(ruang, katalog.Ambil("wooden_bucket_01"), new Vector3(-4.70f, 0, -2.05f), .33f, -10);
        }

        public static void Pohon(Transform prop)
        {
            var katalog = KatalogPropDunia.Muat();
            if (katalog == null) return;
            int indeks = 0, diganti = 0;
            foreach (Transform lama in prop)
            {
                if (diganti >= 8) break;
                if (lama.name != "prop_pohon" || indeks++ % 3 != 0) continue;
                var id = diganti++ % 2 == 0 ? "island_tree_01" : "tree_small_02";
                Ganti(lama, katalog.Ambil(id));
            }
        }

        static string Pilih(string jenis, string id) => jenis switch
        {
            "mejaKuliah" => "SchoolDesk_01",
            "mejaDosen" or "resepsionis" or "kasir" => "metal_office_desk",
            "mejaPustakawan" or "mejaBaca" or "mejaPanjang" => "dining_table",
            "mejaBulat" or "mejaKafe" => "painted_wooden_table",
            "konter" or "konterKopi" or "konterKafe" => "modern_wooden_cabinet",
            "kursiTunggu" => id == "klinik" ? "SchoolChair_01" : "plastic_monobloc_chair_01",
            "rakBuku" => "wooden_bookshelf_worn",
            "rakKertas" => "wooden_display_shelves_01",
            "rak" or "galonRak" => "worn_metal_rack",
            "etalase" => id == "warteg" ? null : "wooden_display_shelves_01",
            "ranjang" or "sofa" => "vintage_day_bed",
            "bangku" => "painted_wooden_bench",
            "keranjang" => "wicker_basket_01",
            "tanaman" => "potted_plant_02",
            "termos" => "vintage_electric_kettle",
            "lapak" => "wooden_picnic_table",
            _ => null
        };

        static (string, string) Detail(string id) => id switch
        {
            "kampus" => ("wicker_basket_01", "SchoolChair_01"),
            "warteg" => ("brass_pot_01", "wooden_bowl_01"),
            "warkop" => ("vintage_electric_kettle", "plastic_bottle_gallon"),
            "minimarket" => ("plastic_crate_01", "cardboard_box_01"),
            "perpus" => ("wicker_basket_01", "potted_plant_02"),
            "klinik" => ("bleach_bottle", "metal_trash_can"),
            "warnet" => ("cardboard_box_01", "metal_trash_can"),
            "fotokopi" => ("cardboard_box_01", "plastic_crate_01"),
            "laundry" => ("plastic_crate_01", "plastic_bottle_gallon"),
            "kafe" => ("planter_pot_clay", "ceramic_vase_01"),
            "bank" => ("potted_plant_02", "metal_trash_can"),
            "gor" => ("wooden_bucket_01", "plastic_crate_01"),
            "karier" => ("potted_plant_02", "wicker_basket_01"),
            "tani" => ("watering_can_metal_01", "cement_bag"),
            "pasar" => ("wooden_crate_01", "wicker_basket_01"),
            "salon" => ("ceramic_vase_01", "plastic_broom"),
            _ => ("cardboard_box_01", "metal_trash_can")
        };

        static bool Ganti(Transform lama, GameObject sumber)
        {
            if (sumber == null) return false;
            var rendererLama = lama.GetComponentsInChildren<MeshRenderer>(true);
            if (rendererLama.Length == 0) return false;
            var target = Batas(lama, rendererLama);
            var baru = UnityEngine.Object.Instantiate(sumber, lama);
            var batas = Batas(baru.transform, baru.GetComponentsInChildren<MeshRenderer>(true));
            if (!Berisi(batas) || !Berisi(target))
            {
                UnityEngine.Object.Destroy(baru);
                return false;
            }
            var skala = new Vector3(target.size.x / batas.size.x, target.size.y / batas.size.y, target.size.z / batas.size.z);
            baru.transform.localScale = skala;
            baru.transform.SetLocalPositionAndRotation(target.center - Vector3.Scale(skala, batas.center), Quaternion.identity);
            foreach (var kandidat in rendererLama) kandidat.enabled = false;
            return true;
        }

        static void Taruh(Transform akar, GameObject sumber, Vector3 posisi, float tinggi, float arah)
        {
            if (sumber == null) return;
            var prop = UnityEngine.Object.Instantiate(sumber, akar);
            var batas = Batas(prop.transform, prop.GetComponentsInChildren<MeshRenderer>(true));
            if (!Berisi(batas))
            {
                UnityEngine.Object.Destroy(prop);
                return;
            }
            var skala = tinggi / batas.size.y;
            prop.transform.localScale = Vector3.one * skala;
            prop.transform.SetLocalPositionAndRotation(posisi - Vector3.up * (batas.min.y * skala),
                Quaternion.Euler(0, arah, 0));
        }

        static bool Berisi(Bounds bentuk) => Mathf.Min(bentuk.size.x, bentuk.size.y, bentuk.size.z) > .001f;

        static Bounds Batas(Transform akar, MeshRenderer[] renderers)
        {
            var hasil = new Bounds();
            bool ada = false;
            foreach (var renderer in renderers)
            {
                var batas = renderer.localBounds;
                var matriks = akar.worldToLocalMatrix * renderer.localToWorldMatrix;
                for (int i = 0; i < 8; i++)
                {
                    var sudut = new Vector3((i & 1) == 0 ? batas.min.x : batas.max.x,
                        (i & 2) == 0 ? batas.min.y : batas.max.y, (i & 4) == 0 ? batas.min.z : batas.max.z);
                    var lokal = matriks.MultiplyPoint3x4(sudut);
                    if (ada) hasil.Encapsulate(lokal);
                    else { hasil = new Bounds(lokal, Vector3.zero); ada = true; }
                }
            }
            return hasil;
        }
    }
}
