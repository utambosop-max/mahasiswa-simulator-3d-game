using MS.Inti;
using MS.Kontrak;
using MS.Pemain;
using UnityEngine;

namespace MS.Dunia
{
    internal static class KamarHemat
    {
        internal static bool Pasang(Transform ruang, BahanRealistis bahan)
        {
            var s = GameInti.Instans?.Simpanan;
            if (s == null || s.tahapPindahan == 0 || s.kos != "melati" ||
                s.LevelPerabot("kasur") > 1 || s.LevelPerabot("meja") > 1 ||
                s.LevelPerabot("kipas") > 1 || s.LevelPerabot("dekorasi") > 1) return false;

            foreach (Transform lama in ruang) lama.gameObject.SetActive(false);
            var hemat = new GameObject("Kamar Hemat 2,5 × 3 m").transform;
            hemat.SetParent(ruang, false);
            var plester = bahan.Ambil("plastered_wall_02", new Color(.92f, .87f, .78f), Vector2.one);
            var lantai = bahan.Ambil("Tiles110", new Color(.97f, .94f, .89f), new Vector2(2, 2));
            var kayu = bahan.Ambil("wood_table_001", new Color(.60f, .48f, .34f), Vector2.one);
            var kain = bahan.Ambil(null, new Color(.39f, .53f, .51f), Vector2.one);
            var gelap = bahan.Ambil(null, new Color(.18f, .21f, .22f), Vector2.one);
            var kaca = bahan.Ambil(null, new Color(.35f, .60f, .68f), Vector2.one);
            var putih = bahan.Ambil(null, new Color(.90f, .89f, .83f), Vector2.one);

            GameObject Kotak(string nama, Vector3 posisi, Vector3 ukuran, Material mat, bool bentur = true) =>
                bahan.Detail(hemat, nama, posisi, ukuran, mat, PrimitiveType.Cube, bentur);

            Kotak("Lantai", new Vector3(0,-.05f,0), new Vector3(2.5f,.1f,3), lantai);
            Kotak("Lantai koridor", new Vector3(0,-.055f,-2.09f), new Vector3(1.25f,.1f,1.20f), lantai);
            Kotak("Dinding utara", new Vector3(0,1.23f,1.54f), new Vector3(2.65f,2.46f,.12f), plester);
            Kotak("Dinding barat", new Vector3(-1.31f,1.23f,0), new Vector3(.12f,2.46f,3.1f), plester);
            Kotak("Dinding timur", new Vector3(1.31f,1.23f,0), new Vector3(.12f,2.46f,3.1f), plester);
            foreach (int sisi in new[] { -1, 1 })
                Kotak("Dinding pintu", new Vector3(sisi * .835f,1.23f,-1.54f), new Vector3(.85f,2.46f,.12f), plester);
            Kotak("Ambang pintu 04", new Vector3(0,2.22f,-1.54f), new Vector3(.82f,.48f,.12f), kayu);
            Kotak("Pintu tripleks terbuka", new Vector3(.39f,1.015f,-1.9f), new Vector3(.06f,2.03f,.76f), kayu, false);
            Kotak("Meteran token", new Vector3(.57f,1.25f,-2.49f), new Vector3(.23f,.26f,.08f), gelap, false);
            Titik(hemat, "Meteran listrik", new Vector3(.47f,0,-2.40f), "isiToken");
            Titik(hemat, "Keluar kamar 04", new Vector3(0,0,-1.70f), "keluarKos", "bayarKos");

            Kotak("Dipan", new Vector3(-.77f,.16f,-.36f), new Vector3(.91f,.32f,1.98f), kayu);
            Kotak("Kasur busa", new Vector3(-.77f,.37f,-.36f), new Vector3(.88f,.14f,1.94f), kain);
            Kotak("Bantal", new Vector3(-.77f,.49f,.39f), new Vector3(.65f,.12f,.32f), putih, false);
            Titik(hemat, "Kasur", new Vector3(-.63f,0,-.33f), "tidur", "rebahan");

            Kotak("Meja belajar", new Vector3(-.90f,.66f,.92f), new Vector3(.57f,.12f,.67f), kayu);
            Kotak("Khaki penyangga meja", new Vector3(-1.14f,.32f,.92f), new Vector3(.075f,.63f,.62f), kayu);
            Kotak("Laptop", new Vector3(-.87f,.74f,.89f), new Vector3(.34f,.045f,.29f), gelap, false);
            Kotak("Terminal kabel", new Vector3(-1.12f,.084f,.95f), new Vector3(.24f,.07f,.08f), putih, false);
            Titik(hemat, "Meja dan laptop", new Vector3(-.70f,0,.93f), "belajar", "nugas");

            Kotak("Lemari dua pintu", new Vector3(-.65f,.95f,1.33f), new Vector3(.78f,1.9f,.32f), kayu);
            Kotak("Cermin lemari", new Vector3(-.68f,1.22f,1.158f), new Vector3(.24f,.58f,.018f), kaca, false);
            Titik(hemat, "Lemari dan ruang sembunyi", new Vector3(-.51f,0,1.20f), "bukaUpgrade", "bukaBukuSakti");

            Kotak("Dapur darurat", new Vector3(.93f,.48f,.87f), new Vector3(.59f,.96f,.96f), kayu);
            Kotak("Kaca jendela", new Vector3(.54f,1.66f,1.47f), new Vector3(1.05f,.66f,.03f), kaca, false);
            for (int i = 0; i < 5; i++)
                Kotak("Teralis", new Vector3(.15f + .19f*i,1.66f,1.44f), new Vector3(.025f,.68f,.035f), gelap, false);
            bahan.Detail(hemat, "Galon 19 liter", new Vector3(.96f,.28f,-.32f), new Vector3(.34f,.28f,.34f), kaca, PrimitiveType.Cylinder, true);
            bahan.Detail(hemat, "Penanak nasi", new Vector3(.92f,1.06f,.87f), new Vector3(.34f,.095f,.34f), putih, PrimitiveType.Cylinder);
            Titik(hemat, "Galon", new Vector3(.77f,0,-.32f), "minum", "isiGalon");
            Titik(hemat, "Dapur", new Vector3(.78f,0,.83f), "masakMi", "seduhKopi");
            Titik(hemat, "Ember cuci", new Vector3(.56f,0,-2.03f), "mandi", "cuciManual");

            var spawn = new GameObject("Spawn pintuKamar").transform;
            spawn.SetParent(hemat, false);
            spawn.localPosition = new Vector3(.18f,0,-1.11f);
            spawn.gameObject.AddComponent<TitikSpawn>().id = "pintuKamar";
            if (GameObject.Find("Pemain")?.TryGetComponent<CharacterController>(out var pemain) == true)
            {
                pemain.enabled = false;
                pemain.transform.position = spawn.position;
                pemain.enabled = true;
                Camera.main?.GetComponent<KameraIsometric>()?.Lompat();
            }
            return true;
        }

        static void Titik(Transform induk, string nama, Vector3 posisi, string id, string tambahan = null)
        {
            var penanda = new GameObject(nama);
            penanda.transform.SetParent(induk, false);
            penanda.transform.localPosition = posisi;
            var titik = penanda.AddComponent<TitikInteraksi>();
            titik.nama = nama;
            titik.idAksi = id;
            titik.idAksiTambahan = tambahan;
            titik.namaTambahan = tambahan;
            titik.radius = .92f;
        }
    }
}
