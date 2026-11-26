using MS.Kontrak;
using UnityEngine;
using UnityEngine.Rendering;

namespace MS.Dunia
{
    internal sealed class PencahayaanUltra : MonoBehaviour
    {
        ReflectionProbe probe;
        GameObject berkasJendela;
        Material bahanBerkas;
        Mesh meshBerkas;
        bool aktif;
        bool cahayaSiang = true;
        bool perluTangkap;
        int tangkapan = -1;

        internal static PencahayaanUltra Pasang(Transform induk, string scene)
        {
#if UNITY_STANDALONE_WIN
            bool kamar = scene == "KamarKos";
            if (!kamar && !scene.StartsWith("Gedung_")) return null;
            var ruang = GameObject.Find(kamar ? "Kamar" : "Ruang " + scene.Substring(7));
            var indukLantai = ruang != null ? ruang.transform.Find("Kamar Hemat 2,5 × 3 m") ?? ruang.transform : null;
            var lantai = indukLantai != null ? indukLantai.Find("Lantai") : null;
            if (lantai == null) return null;

            var akar = new GameObject("Pencahayaan Ultra");
            akar.SetActive(false);
            akar.transform.SetParent(induk, false);
            var efek = akar.AddComponent<PencahayaanUltra>();
            efek.SiapkanRuang(lantai, kamar, scene == "Gedung_warteg");
            return efek;
#else
            return null;
#endif
        }

        void SiapkanRuang(Transform lantai, bool kamar, bool warteg)
        {
            var pusat = lantai.position + Vector3.up * 1.25f;
            var pantulan = new GameObject("Probe pantulan ruang");
            pantulan.transform.SetParent(transform);
            pantulan.transform.position = pusat;
            probe = pantulan.AddComponent<ReflectionProbe>();
            probe.size = new Vector3(lantai.lossyScale.x, 3.2f, lantai.lossyScale.z);
            probe.mode = ReflectionProbeMode.Realtime;
            probe.refreshMode = ReflectionProbeRefreshMode.ViaScripting;
            probe.timeSlicingMode = ReflectionProbeTimeSlicingMode.IndividualFaces;
            probe.resolution = 256;
            probe.intensity = .72f;
            probe.boxProjection = true;
            probe.importance = 3;
            probe.clearFlags = ReflectionProbeClearFlags.SolidColor;
            probe.backgroundColor = new Color(.22f, .23f, .27f);
            probe.farClipPlane = Mathf.Max(probe.size.x, probe.size.z) * 1.3f;

            if (warteg) BuatLampu(pusat + new Vector3(-1.15f, .95f, .25f), 3200f, 1.8f, 6.5f, "Bohlam warteg 3200 K");
            if (kamar)
            {
                bool hemat = lantai.lossyScale.x < 3f;
                BuatLampu(pusat + new Vector3(.75f, 1.05f, .35f), 6500f, 1.4f, 5.5f, "Neon kamar 6500 K");
                BuatBerkas(lantai.parent, hemat);
            }
        }

        void BuatLampu(Vector3 posisi, float kelvin, float daya, float jangkauan, string nama)
        {
            var lampu = new GameObject(nama).AddComponent<Light>();
            lampu.transform.SetParent(transform);
            lampu.transform.position = posisi;
            lampu.type = LightType.Point;
            lampu.useColorTemperature = true;
            lampu.colorTemperature = kelvin;
            lampu.intensity = daya;
            lampu.range = jangkauan;
            lampu.shadows = LightShadows.None;
        }

        void BuatBerkas(Transform kamar, bool hemat)
        {
            var shader = Resources.Load<Shader>("Efek/BerkasJendelaUltra");
            if (shader == null) return;
            bahanBerkas = new Material(shader) { name = "Cahaya jendela Ultra" };
            berkasJendela = new GameObject("Berkas cahaya jendela", typeof(MeshFilter), typeof(MeshRenderer));
            berkasJendela.transform.SetParent(transform, false);
            berkasJendela.transform.position = kamar.TransformPoint(hemat ? new Vector3(.54f, 1.66f, 1.44f) :
                new Vector3(-3.2f, 1.56f, 3.32f));
            if (hemat) berkasJendela.transform.localScale = Vector3.one * .52f;
            berkasJendela.transform.rotation = kamar.rotation;

            var mulai = new Vector3(0, 0, 0);
            var akhir = new Vector3(.85f, -.86f, -2.62f);
            meshBerkas = new Mesh { name = "Berkas cahaya jendela" };
            meshBerkas.vertices = new[]
            {
                mulai + new Vector3(-.70f, 0, 0), mulai + new Vector3(.70f, 0, 0),
                akhir + new Vector3(-.94f, 0, 0), akhir + new Vector3(.94f, 0, 0),
                mulai + new Vector3(0, -.40f, 0), mulai + new Vector3(0, .40f, 0),
                akhir + new Vector3(0, -.51f, 0), akhir + new Vector3(0, .51f, 0)
            };
            meshBerkas.uv = new[]
            {
                Vector2.zero, Vector2.right, Vector2.up, Vector2.one,
                Vector2.zero, Vector2.right, Vector2.up, Vector2.one
            };
            meshBerkas.triangles = new[] { 0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7 };
            meshBerkas.RecalculateBounds();
            berkasJendela.GetComponent<MeshFilter>().sharedMesh = meshBerkas;
            var renderer = berkasJendela.GetComponent<MeshRenderer>();
            renderer.sharedMaterial = bahanBerkas;
            renderer.shadowCastingMode = ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            renderer.lightProbeUsage = LightProbeUsage.Off;
            renderer.reflectionProbeUsage = ReflectionProbeUsage.Off;
        }

        internal void AturMutu(bool ultra)
        {
            if (aktif == ultra) return;
            aktif = ultra;
            perluTangkap = ultra;
            gameObject.SetActive(ultra);
        }

        internal void AturFase(Fase fase)
        {
            bool siang = fase == Fase.Pagi || fase == Fase.Siang || fase == Fase.Sore;
            if (aktif && cahayaSiang != siang) perluTangkap = true;
            cahayaSiang = siang;
            if (berkasJendela == null) return;
            berkasJendela.SetActive(siang);
            bahanBerkas.SetColor("_Tint", fase == Fase.Sore
                ? new Color(1f, .64f, .32f, .20f)
                : new Color(1f, .94f, .80f, .15f));
        }

        void LateUpdate()
        {
            if (!perluTangkap || (tangkapan >= 0 && !probe.IsFinishedRendering(tangkapan))) return;
            tangkapan = probe.RenderProbe();
            perluTangkap = false;
        }

        void OnDisable() => tangkapan = -1;

        void OnDestroy()
        {
            Destroy(bahanBerkas);
            Destroy(meshBerkas);
        }
    }
}
