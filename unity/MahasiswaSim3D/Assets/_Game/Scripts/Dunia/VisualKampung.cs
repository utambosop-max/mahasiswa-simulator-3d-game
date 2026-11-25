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
                        aspal ? new Color(.87f, .87f, .88f) : new Color(.87f, .83f, .76f),
                        new Vector2(Mathf.Max(1, ukuran.x * .52f), Mathf.Max(1, ukuran.z * .52f)));
                }

            var bangunan = GameObject.Find("Bangunan");
            if (bangunan != null)
            {
                foreach (Transform gedung in bangunan.transform)
                    if (gedung.Find("Badan") is Transform badan)
                    {
                        var renderer = badan.GetComponent<Renderer>();
                        if (renderer == null) continue;
                        var warna = renderer.sharedMaterial.color;
                        bahan.Permukaan(badan, gedung.name.Contains("Petak") ? "brick_wall_02" : "plastered_wall_02",
                            Color.Lerp(warna, Color.white, .25f), new Vector2(4, 2));
                    }
                PasangFasad(bangunan.transform, bahan);
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
            var parkir = GameObject.Find("Motor Saya");
            if (parkir != null)
                bahan.Tanaman(prop.transform, prop.transform.InverseTransformPoint(parkir.transform.position) + new Vector3(1.8f, 0, 1.6f), .80f);
        }

        static void PasangFasad(Transform bangunan, BahanRealistis bahan)
        {
            var plester = bahan.Ambil("plastered_wall_02", new Color(.82f, .78f, .67f), new Vector2(2, 1));
            var rangka = bahan.Ambil(null, new Color(.25f, .29f, .28f), Vector2.one);
            var kaca = bahan.Ambil(null, new Color(.32f, .48f, .48f), Vector2.one);
            kaca.SetFloat("_Smoothness", .72f);
            foreach (var id in new[] { "kos", "warteg", "warkop" })
            {
                var pintu = bangunan.Find("Pintu " + id);
                if (pintu == null) continue;
                foreach (Transform gedung in bangunan)
                {
                    if (!gedung.name.EndsWith("(" + id + ")") || !gedung.TryGetComponent<BoxCollider>(out var collider)) continue;
                    var batas = collider.bounds;
                    var kePintu = pintu.position - batas.center;
                    Vector3 depan = Mathf.Abs(kePintu.x) > Mathf.Abs(kePintu.z)
                        ? Vector3.right * Mathf.Sign(kePintu.x) : Vector3.forward * Mathf.Sign(kePintu.z);
                    Vector3 sisi = Vector3.Cross(Vector3.up, depan);
                    float kedalaman = Mathf.Abs(Vector3.Dot(depan, batas.extents));
                    float lebar = Mathf.Abs(Vector3.Dot(sisi, batas.size));
                    if (lebar < 2f || batas.size.y < 3f) break;
                    Vector3 tengah = batas.center + depan * (kedalaman + .045f);
                    tengah.y = batas.min.y + 2.1f;
                    var rak = new GameObject("Detail fasad " + id).transform;
                    rak.SetParent(gedung, true);
                    rak.SetPositionAndRotation(tengah, Quaternion.LookRotation(depan));
                    bahan.Detail(rak, "Teritisan", new Vector3(0, .62f, .11f), new Vector3(lebar * .88f, .10f, .42f), plester);
                    bahan.Detail(rak, "Talang", new Vector3(0, .55f, .29f), new Vector3(lebar * .88f, .10f, .055f), rangka);
                    for (int arah = -1; arah <= 1; arah += 2)
                    {
                        var letak = new Vector3(arah * lebar * .28f, 0, 0);
                        bahan.Detail(rak, "Kusen luar", letak, new Vector3(.83f, .68f, .095f), rangka);
                        bahan.Detail(rak, "Kaca luar", letak + Vector3.forward * .065f, new Vector3(.72f, .58f, .05f), kaca);
                    }
                    break;
                }
            }
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
