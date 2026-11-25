using System.Collections.Generic;
using UnityEngine;

namespace MS.Dunia
{
    internal sealed class DetailJalan : MonoBehaviour
    {
        readonly List<Mesh> meshMilik = new();

        public void Pasang(Transform tanah, BahanRealistis bahan)
        {
            var mendatar = new List<Transform>();
            var tegak = new List<Transform>();
            foreach (Transform objek in tanah)
            {
                if (objek.name == "Jalan H") mendatar.Add(objek);
                if (objek.name == "Jalan V") tegak.Add(objek);
            }
            if (mendatar.Count == 0 || tegak.Count == 0) return;
            var got = new Bidang();
            var tutup = new Bidang();
            Saluran(mendatar, tegak, true, got, tutup);
            Saluran(tegak, mendatar, false, got, tutup);
            Buat("Saluran beton", got, bahan.Ambil(null, new Color(.23f, .22f, .19f), Vector2.one));
            Buat("Tutup saluran", tutup, bahan.Ambil(null, new Color(.42f, .40f, .35f), Vector2.one));

            var padat = bahan.Ambil(null, new Color(.22f, .22f, .20f), Vector2.one);
            var tanda = bahan.Ambil(null, new Color(.72f, .58f, .28f), Vector2.one);
            var air = bahan.Ambil(null, new Color(.23f, .26f, .26f), Vector2.one);
            air.SetFloat("_Smoothness", .94f);
            air.SetFloat("_Metallic", .15f);
            for (int i = 0; i < mendatar.Count; i++)
            {
                var jalan = mendatar[i];
                var pos = jalan.position;
                float sisiJalan = jalan.localScale.z * .5f;
                if (i % 2 == 0)
                {
                    bahan.Detail(transform, "Polisi tidur", pos + new Vector3(13.7f, .058f, 0),
                        new Vector3(.34f, .078f, sisiJalan * 1.75f), padat, bertabrakan: true);
                    bahan.Detail(transform, "Marka polisi tidur", pos + new Vector3(13.7f, .105f, -sisiJalan * .43f),
                        new Vector3(.21f, .012f, .71f), tanda);
                    bahan.Detail(transform, "Marka polisi tidur", pos + new Vector3(13.7f, .105f, sisiJalan * .43f),
                        new Vector3(.21f, .012f, .71f), tanda);
                }
                if (i == 1 || i == 2)
                    bahan.Detail(transform, "Genangan tepi jalan", pos + new Vector3(-12.5f, .033f, sisiJalan - .40f),
                        new Vector3(.98f, .011f, .34f), air, PrimitiveType.Cylinder);
            }
        }

        static void Saluran(List<Transform> jalur, List<Transform> silang, bool mendatar, Bidang got, Bidang tutup)
        {
            var perempatan = new List<(float kiri, float kanan)>();
            foreach (var lintang in silang)
            {
                float pusat = mendatar ? lintang.position.x : lintang.position.z;
                float lebar = (mendatar ? lintang.localScale.x : lintang.localScale.z) * .5f + .68f;
                perempatan.Add((pusat - lebar, pusat + lebar));
            }
            perempatan.Sort((a, b) => a.kiri.CompareTo(b.kiri));

            foreach (var jalan in jalur)
            {
                float panjang = (mendatar ? jalan.localScale.x : jalan.localScale.z) * .5f;
                float lebar = (mendatar ? jalan.localScale.z : jalan.localScale.x) * .5f;
                float arus = mendatar ? jalan.position.x : jalan.position.z;
                float pusat = mendatar ? jalan.position.z : jalan.position.x;
                float awal = arus - panjang;
                float akhir = arus + panjang;
                foreach (var (kiri, kanan) in perempatan)
                {
                    Tambah(awal, Mathf.Min(kiri, akhir));
                    awal = Mathf.Max(awal, kanan);
                }
                Tambah(awal, akhir);

                void Tambah(float a, float b)
                {
                    if (b - a < .45f) return;
                    for (int tanda = -1; tanda <= 1; tanda += 2)
                    {
                        float sisi = pusat + tanda * (lebar + .36f);
                        got.Tambah(a, b, sisi, .18f, .043f, mendatar);
                        for (float t = a + 2.45f; t < b - .5f; t += 6.4f)
                            tutup.Tambah(t - .35f, t + .35f, sisi, .22f, .051f, mendatar);
                    }
                }
            }
        }

        void Buat(string nama, Bidang bidang, Material bahan)
        {
            if (bidang.titik.Count == 0) return;
            var objek = new GameObject(nama);
            objek.transform.SetParent(transform, false);
            var mesh = new Mesh { name = nama };
            mesh.SetVertices(bidang.titik);
            mesh.SetTriangles(bidang.sisi, 0);
            mesh.RecalculateNormals();
            objek.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = objek.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = bahan;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            meshMilik.Add(mesh);
        }

        void OnDestroy()
        {
            foreach (var mesh in meshMilik) Destroy(mesh);
        }

        sealed class Bidang
        {
            public readonly List<Vector3> titik = new();
            public readonly List<int> sisi = new();

            public void Tambah(float awal, float akhir, float pusat, float lebar, float y, bool mendatar)
            {
                float kiri = pusat - lebar * .5f, kanan = pusat + lebar * .5f;
                int indeks = titik.Count;
                Vector3 Pos(float arus, float silang) => mendatar ? new Vector3(arus, y, silang) : new Vector3(silang, y, arus);
                titik.Add(Pos(awal, kiri));
                titik.Add(Pos(awal, kanan));
                titik.Add(Pos(akhir, kanan));
                titik.Add(Pos(akhir, kiri));
                sisi.Add(indeks);
                sisi.Add(indeks + (mendatar ? 1 : 2));
                sisi.Add(indeks + (mendatar ? 2 : 1));
                sisi.Add(indeks);
                sisi.Add(indeks + (mendatar ? 2 : 3));
                sisi.Add(indeks + (mendatar ? 3 : 2));
            }
        }
    }
}
