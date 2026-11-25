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
            {
                bahan.Permukaan(jalan.transform.Find("Tanah"), "tanah_kampung", Color.white, new Vector2(24, 17));
                foreach (Transform bidang in jalan.transform)
                {
                    bool aspal = bidang.name.StartsWith("Jalan ");
                    if (!aspal && !bidang.name.StartsWith("Trotoar ")) continue;
                    var ukuran = bidang.localScale;
                    bahan.Permukaan(bidang, aspal ? "asphalt_01" : "concrete_pavers",
                        aspal ? new Color(.87f, .87f, .88f) : new Color(.87f, .83f, .76f),
                        new Vector2(Mathf.Max(1, ukuran.x * .52f), Mathf.Max(1, ukuran.z * .52f)));
                }
                gameObject.AddComponent<DetailJalan>().Pasang(jalan.transform, bahan);
            }

            var bangunan = GameObject.Find("Bangunan");
            if (bangunan != null)
            {
                foreach (Transform gedung in bangunan.transform) PasangFasad(gedung, bahan);
            }

            var prop = GameObject.Find("Prop");
            if (prop == null) return;
            KendaraanKampung.Pasang(gameObject.scene, prop.transform, bahan);
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

        static void PasangFasad(Transform gedung, BahanRealistis bahan)
        {
            var nama = gedung.name;
            int mulai = nama.LastIndexOf('(');
            if (mulai < 0 || !nama.EndsWith(")")) return;
            string id = nama.Substring(mulai + 1, nama.Length - mulai - 2);
            string jalur = "Fasad/" + id;
            var model = Resources.Load<GameObject>(jalur + "/" + id);
            if (model == null) return;

            var sebelumnya = gedung.GetComponentsInChildren<MeshRenderer>();
            var visual = Instantiate(model, gedung);
            visual.name = "Fasad " + id;
            visual.transform.SetLocalPositionAndRotation(Vector3.zero, Quaternion.identity);
            var pengganti = visual.GetComponentsInChildren<MeshRenderer>();
            if (pengganti.Length == 0)
            {
                Destroy(visual);
                return;
            }

            var padat = bahan.Ambil(jalur, Color.white, Vector2.one);
            var kaca = bahan.Ambil(null, new Color(.21f, .27f, .28f), Vector2.one);
            kaca.SetFloat("_Smoothness", .86f);
            kaca.SetFloat("_Metallic", .23f);
            foreach (var renderer in pengganti)
            {
                bool jendela = renderer.name.StartsWith("Kaca");
                renderer.sharedMaterial = jendela ? kaca : padat;
                if (jendela) renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
            foreach (var renderer in sebelumnya) renderer.enabled = false;
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
