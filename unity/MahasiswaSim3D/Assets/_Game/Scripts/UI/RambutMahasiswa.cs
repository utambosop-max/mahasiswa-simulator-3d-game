using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;

namespace MS.UI
{
    internal sealed class RambutMahasiswa : MonoBehaviour
    {
        // The original hair occupies the fourth strip of kar_mahasiswa's four-color atlas.
        const float UvRambut = .875f;
        Transform kepala;
        Transform wadah;
        Mesh tanpaRambut;
        Material bahan;
        string gaya, warna;
        float cekBerikut;

        internal void Pasang(SkinnedMeshRenderer renderer)
        {
            kepala = System.Array.Find(renderer.bones, tulang => tulang != null && tulang.name == "Kepala");
            var mesh = renderer.sharedMesh;
            if (kepala == null || mesh == null || !mesh.isReadable || mesh.subMeshCount != 1) return;
            var uv = mesh.uv;
            if (uv.Length != mesh.vertexCount) return;
            var asal = mesh.GetTriangles(0);
            var hasil = new List<int>(asal.Length);
            for (int i = 0; i < asal.Length; i += 3)
            {
                if (Mathf.Abs(uv[asal[i]].x - UvRambut) < .02f &&
                    Mathf.Abs(uv[asal[i+1]].x - UvRambut) < .02f &&
                    Mathf.Abs(uv[asal[i+2]].x - UvRambut) < .02f) continue;
                hasil.Add(asal[i]); hasil.Add(asal[i+1]); hasil.Add(asal[i+2]);
            }
            if (hasil.Count == asal.Length) return;
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) return;
            tanpaRambut = Instantiate(mesh);
            tanpaRambut.SetTriangles(hasil, 0);
            renderer.sharedMesh = tanpaRambut;
            wadah = new GameObject("Rambut pemain").transform;
            wadah.SetPositionAndRotation(transform.TransformPoint(new Vector3(0, 1.47f, .03f)), transform.rotation);
            wadah.SetParent(kepala, true);
            bahan = new Material(shader);
            Perbarui();
        }

        void Update()
        {
            if (wadah == null || Time.unscaledTime < cekBerikut) return;
            cekBerikut = Time.unscaledTime + .25f;
            Perbarui();
        }

        void Perbarui()
        {
            var hidup = Layanan.Hidup;
            string baru = hidup?.Rambut ?? "pendek";
            if (warna != hidup?.WarnaRambut || gaya == null)
            {
                warna = hidup?.WarnaRambut;
                bahan.color = ColorUtility.TryParseHtmlString(warna, out var warnaBaru) ? warnaBaru : new Color32(59,42,32,255);
            }
            if (gaya == baru) return;
            gaya = baru;
            foreach (Transform anak in wadah) { anak.gameObject.SetActive(false); Destroy(anak.gameObject); }
            if (gaya == "botak") return;
            Bagian(Vector3.zero, new Vector3(.66f,.19f,.54f));
            switch (gaya)
            {
                case "panjang":
                case "hijab":
                    Bagian(new Vector3(0,-.25f,-.21f),new Vector3(.62f,.51f,.25f));
                    if (gaya == "hijab")
                        for (int i = -1; i <= 1; i += 2)
                            Bagian(new Vector3(i*.27f,-.22f,.015f),new Vector3(.16f,.44f,.37f));
                    break;
                case "poni": Bagian(new Vector3(0,-.09f,.23f),new Vector3(.5f,.19f,.19f)); break;
                case "belah": Bagian(new Vector3(.13f,.075f,.12f),new Vector3(.42f,.22f,.41f)); break;
                case "kuncir": Bagian(new Vector3(0,-.22f,-.34f),new Vector3(.22f,.4f,.27f)); break;
                case "cepol": Bagian(new Vector3(0,.15f,-.15f),new Vector3(.25f,.25f,.25f)); break;
                case "keriting":
                case "jabrik":
                    for (int i = -1; i <= 1; i++)
                        Bagian(new Vector3(i*.18f,.11f,.04f),new Vector3(.25f,gaya == "jabrik" ? .33f : .25f,.25f));
                    break;
            }
        }

        void Bagian(Vector3 posisi, Vector3 ukuran)
        {
            var objek = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            if (objek == null) return;
            if (!objek.TryGetComponent<Renderer>(out var renderer))
            {
                Destroy(objek);
                return;
            }
            objek.transform.SetParent(wadah, false);
            objek.transform.localPosition = posisi;
            objek.transform.localScale = ukuran;
            var collider = objek.GetComponent<Collider>();
            if (collider != null)
            {
                collider.enabled = false;
                Destroy(collider);
            }
            renderer.sharedMaterial = bahan;
        }

        void OnDestroy()
        {
            if (bahan != null) Destroy(bahan);
            if (tanpaRambut != null) Destroy(tanpaRambut);
        }
    }
}
