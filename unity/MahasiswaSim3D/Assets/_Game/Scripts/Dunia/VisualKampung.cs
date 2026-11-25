using MS.Kontrak;
using UnityEngine;

namespace MS.Dunia
{
    internal sealed class VisualKampung : MonoBehaviour
    {
        Material lampu;
        IPenerimaAksi aksi;
        TextMesh celetukan;
        Transform wargaBicara;
        float tutupPada;
        static readonly string[] Tanggapan =
        {
            "Saya minggir, Pak Bos!",
            "Kaget, kirain alarm kos!",
            "Pelan, gorengan saya!"
        };

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

        void LateUpdate()
        {
            if (!ReferenceEquals(aksi, Layanan.Aksi))
            {
                if (aksi != null) aksi.AksiMulai -= Dengar;
                aksi = Layanan.Aksi;
                if (aksi != null) aksi.AksiMulai += Dengar;
            }
            if (celetukan == null || !celetukan.gameObject.activeSelf) return;
            if (wargaBicara == null || Time.unscaledTime >= tutupPada)
            {
                celetukan.gameObject.SetActive(false);
                return;
            }
            var kamera = Camera.main;
            if (kamera != null)
                celetukan.transform.SetPositionAndRotation(wargaBicara.position + Vector3.up * 2.15f, kamera.transform.rotation);
        }

        void Dengar(string id)
        {
            if (id != "klakson") return;
            var pemain = GameObject.FindWithTag("Player");
            if (pemain == null || Layanan.Jam?.Fase == Fase.Begadang) return;
            WargaJalan dekat = null;
            float jarak = 25;
            foreach (var warga in FindObjectsByType<WargaJalan>(FindObjectsSortMode.None))
            {
                float kuadrat = (pemain.transform.position - warga.transform.position).sqrMagnitude;
                if (kuadrat >= jarak) continue;
                jarak = kuadrat;
                dekat = warga;
            }
            if (dekat == null) return;
            dekat.ReaksiKlakson(pemain.transform.position);
            if (celetukan == null)
            {
                celetukan = new GameObject("Celetukan warga").AddComponent<TextMesh>();
                celetukan.transform.SetParent(transform);
                celetukan.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
                celetukan.GetComponent<MeshRenderer>().sharedMaterial = celetukan.font.material;
                celetukan.fontSize = 58;
                celetukan.characterSize = .065f;
                celetukan.anchor = TextAnchor.MiddleCenter;
                celetukan.color = new Color(1, .91f, .7f);
            }
            celetukan.text = Tanggapan[Random.Range(0, Tanggapan.Length)];
            celetukan.gameObject.SetActive(true);
            wargaBicara = dekat.transform;
            tutupPada = Time.unscaledTime + 1.8f;
        }

        void OnDestroy()
        {
            if (aksi != null) aksi.AksiMulai -= Dengar;
        }
    }
}
