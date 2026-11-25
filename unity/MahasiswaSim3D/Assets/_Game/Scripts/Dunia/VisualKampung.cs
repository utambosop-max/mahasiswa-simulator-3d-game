using MS.Kontrak;
using UnityEngine;

namespace MS.Dunia
{
    internal sealed class VisualKampung : MonoBehaviour
    {
        Material lampu;

        public void Pasang()
        {
            var bahan = gameObject.AddComponent<BahanRealistis>();
            var jalan = GameObject.Find("Tanah & Jalan");
            if (jalan != null)
                foreach (Transform bidang in jalan.transform)
                {
                    bool aspal = bidang.name.StartsWith("Jalan ");
                    if (!aspal && !bidang.name.StartsWith("Trotoar ")) continue;
                    var ukuran = bidang.localScale;
                    bahan.Permukaan(bidang, aspal ? "asphalt_01" : "concrete_floor_02",
                        aspal ? new Color(.58f, .58f, .59f) : new Color(.83f, .78f, .68f),
                        new Vector2(Mathf.Max(1, ukuran.x * .52f), Mathf.Max(1, ukuran.z * .52f)));
                }

            var bangunan = GameObject.Find("Bangunan");
            if (bangunan != null)
                foreach (Transform gedung in bangunan.transform)
                    if (gedung.Find("Badan") is Transform badan)
                    {
                        var renderer = badan.GetComponent<Renderer>();
                        if (renderer == null) continue;
                        var warna = renderer.sharedMaterial.color;
                        bahan.Permukaan(badan, gedung.name.Contains("Petak") ? "brick_wall_02" : "plastered_wall_02",
                            Color.Lerp(warna, Color.white, .25f), new Vector2(4, 2));
                    }

            var prop = GameObject.Find("Prop");
            if (prop == null) return;
            lampu = bahan.Ambil(null, new Color(.64f, .55f, .37f), Vector2.one);
            lampu.EnableKeyword("_EMISSION");
            lampu.globalIlluminationFlags = MaterialGlobalIlluminationFlags.None;
            var asalLampu = new System.Collections.Generic.List<Vector3>();
            foreach (Transform anak in prop.transform)
            {
                if (!anak.name.StartsWith("prop_lampu") && anak.name != "Lampu Jalan") continue;
                if (anak.name.Contains("lalin")) continue;
                var tinggi = anak.name == "Lampu Jalan" ? 1.9f : 3.65f;
                asalLampu.Add(prop.transform.InverseTransformPoint(anak.position + Vector3.up * tinggi));
            }
            foreach (var posisi in asalLampu)
                bahan.Detail(prop.transform, "Bohlam jalan", posisi, new Vector3(.22f, .14f, .22f), lampu, PrimitiveType.Sphere);
            var parkir = GameObject.Find("Parkir Motor");
            if (parkir != null)
                bahan.Tanaman(prop.transform, prop.transform.InverseTransformPoint(parkir.transform.position) + new Vector3(1.8f, 0, 1.6f), .80f);
        }

        public void AturFase(Fase fase)
        {
            if (lampu != null)
                lampu.SetColor("_EmissionColor", fase == Fase.Malam || fase == Fase.Begadang
                    ? new Color(1f, .56f, .16f) * 2.4f : Color.black);
        }
    }
}
