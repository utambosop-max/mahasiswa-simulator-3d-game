using MS.Inti;
using MS.Kontrak;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

namespace MS.Dunia
{
    public sealed class PencahayaanRealistis : MonoBehaviour
    {
        Light matahari;
        Light pantulanLangit;
        JamGame jam;
        Material langit;
        VolumeProfile profil;
        Bloom bloom;
        Vignette vignette;
        ColorAdjustments penataanWarna;
        VisualKampung kampung;
        PartikelKampung partikel;
        bool luar;
        int mutu = -1;
        float cahayaCuaca = 1f;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Pasang()
        {
            SceneManager.sceneLoaded += SaatScene;
        }

        static void SaatScene(Scene scene, LoadSceneMode mode)
        {
            if (scene.name != "Kampung" && scene.name != "KamarKos" && !scene.name.StartsWith("Gedung_")) return;
            var dunia = new GameObject("Pencahayaan dunia");
            var cahaya = dunia.AddComponent<PencahayaanRealistis>();
            if (scene.name == "KamarKos") VisualKamar.Pasang(dunia);
            if (scene.name.StartsWith("Gedung_")) VisualInterior.Pasang(dunia, scene.name.Substring(7));
            if (scene.name == "Kampung")
            {
                cahaya.kampung = dunia.AddComponent<VisualKampung>();
                cahaya.kampung.Pasang();
            }
        }

        void Start()
        {
            luar = gameObject.scene.name == "Kampung";
            matahari = GameObject.Find("Matahari")?.GetComponent<Light>();
            jam = GameInti.Instans?.Jam;
            if (jam != null) jam.FaseBerganti += AturCahaya;
            if (kampung?.Cuaca != null) kampung.Cuaca.CahayaBerubah += SaatCuaca;

            var volume = gameObject.AddComponent<Volume>();
            volume.isGlobal = true;
            volume.priority = 8;
            profil = ScriptableObject.CreateInstance<VolumeProfile>();
            volume.sharedProfile = profil;
            profil.Add<Tonemapping>(true).mode.value = TonemappingMode.ACES;
            penataanWarna = profil.Add<ColorAdjustments>(true);
            penataanWarna.contrast.value = 4;
            penataanWarna.saturation.value = -5;
            bloom = profil.Add<Bloom>(true);
            bloom.intensity.value = .12f;
            bloom.threshold.value = 1.2f;
            vignette = profil.Add<Vignette>(true);
            vignette.intensity.value = .13f;
            if (Camera.main != null) Camera.main.GetUniversalAdditionalCameraData().renderPostProcessing = true;

            if (luar)
            {
                pantulanLangit = new GameObject("Pantulan cahaya langit").AddComponent<Light>();
                pantulanLangit.transform.SetParent(transform, false);
                pantulanLangit.type = LightType.Directional;
                pantulanLangit.transform.rotation = Quaternion.Euler(56f, 146f, 0);
                pantulanLangit.shadows = LightShadows.None;
                pantulanLangit.color = new Color(.84f, .89f, .99f);
                partikel = gameObject.AddComponent<PartikelKampung>();
                partikel.Pasang();
                RenderSettings.fog = true;
                RenderSettings.fogMode = FogMode.Linear;
                var hdr = Resources.Load<Cubemap>("Bahan/kloppenheim_06_puresky");
                var materialLangit = Resources.Load<Material>("Bahan/MaterialLangit");
                var shader = Resources.Load<Shader>("Fasad/LangitKampung");
                if (shader == null) shader = materialLangit != null ? materialLangit.shader : Shader.Find("Skybox/Cubemap");
                if (hdr != null)
                {
                    if (shader != null)
                    {
                        langit = new Material(shader);
                        langit.SetTexture("_Tex", hdr);
                        RenderSettings.skybox = langit;
                        if (Camera.main != null) Camera.main.clearFlags = CameraClearFlags.Skybox;
                    }
                    var probe = gameObject.AddComponent<ReflectionProbe>();
                    probe.mode = ReflectionProbeMode.Custom;
                    probe.customBakedTexture = hdr;
                    probe.size = new Vector3(180, 38, 130);
                    probe.intensity = .4f;
                    RenderSettings.defaultReflectionMode = DefaultReflectionMode.Custom;
                    RenderSettings.customReflectionTexture = hdr;
                }
            }
            else RenderSettings.ambientIntensity = .8f;
            AturCahaya(jam?.Fase ?? Fase.Pagi);
            AturMutu();
        }

        void Update()
        {
            if (mutu != QualitySettings.GetQualityLevel()) AturMutu();
        }

        void AturMutu()
        {
            mutu = QualitySettings.GetQualityLevel();
            bool tinggi = mutu > 0;
            bloom.active = vignette.active = tinggi;
            if (matahari != null) matahari.shadows = tinggi ? LightShadows.Soft : LightShadows.Hard;
            if (!luar) return;
            if (Camera.main != null) Camera.main.farClipPlane = tinggi ? 98f : 76f;
            RenderSettings.fogStartDistance = tinggi ? 38f : 34f;
            RenderSettings.fogEndDistance = tinggi ? 91f : 71f;
            partikel?.AturMutu(tinggi);
        }

        void AturCahaya(Fase fase)
        {
            if (kampung != null) kampung.AturFase(fase);
            if (partikel != null) partikel.AturFase(fase);
            if (matahari == null) return;
            switch (fase)
            {
                case Fase.Pagi: Matahari(32, 1.15f, new Color(1, .88f, .71f)); break;
                case Fase.Siang: Matahari(62, 1.3f, new Color(1, .97f, .91f)); break;
                case Fase.Sore: Matahari(22, .95f, new Color(1, .66f, .43f)); break;
                default: Matahari(39, .28f, new Color(.43f, .59f, 1)); break;
            }
            if (luar) Suasana(fase);
        }

        void Suasana(Fase fase)
        {
            var (kabut, warnaLangit, filter, terang) = fase switch
            {
                Fase.Pagi => (new Color(.69f, .63f, .53f), new Color(.54f, .50f, .45f), new Color(1f, .99f, .97f), .69f),
                Fase.Siang => (new Color(.68f, .72f, .71f), new Color(.50f, .51f, .52f), Color.white, .85f),
                Fase.Sore => (new Color(.72f, .53f, .38f), new Color(.65f, .42f, .30f), new Color(1f, .96f, .89f), .66f),
                Fase.Malam => (new Color(.19f, .24f, .33f), new Color(.37f, .43f, .60f), new Color(.93f, .97f, 1f), .30f),
                _ => (new Color(.13f, .16f, .25f), new Color(.30f, .36f, .56f), new Color(.90f, .94f, 1f), .23f)
            };
            RenderSettings.fogColor = Color.Lerp(kabut, new Color(.39f, .46f, .51f), (1f - cahayaCuaca) * .72f);
            penataanWarna.colorFilter.value = filter;
            bool malam = fase == Fase.Malam || fase == Fase.Begadang;
            RenderSettings.reflectionIntensity = malam ? .36f : 1f;
            if (pantulanLangit != null) pantulanLangit.intensity = malam ? .04f : .37f * cahayaCuaca;
            penataanWarna.postExposure.value = malam ? .10f : .21f;
            if (langit == null) return;
            langit.SetFloat("_Exposure", terang * cahayaCuaca);
            langit.SetColor("_Tint", warnaLangit);
            if (langit.HasProperty("_Malam")) langit.SetFloat("_Malam", malam ? 1f : 0f);
        }

        void Matahari(float tinggi, float intensitas, Color warna)
        {
            matahari.transform.rotation = Quaternion.Euler(tinggi, -36, 0);
            matahari.intensity = luar ? intensitas * cahayaCuaca : Mathf.Max(.54f, intensitas);
            matahari.color = warna;
            RenderSettings.ambientLight = Color.Lerp(new Color(.43f, .46f, .53f), warna, luar ? .40f : .52f);
        }

        void SaatCuaca(float cahaya)
        {
            cahayaCuaca = cahaya;
            AturCahaya(jam?.Fase ?? Fase.Pagi);
        }

        void OnDestroy()
        {
            if (jam != null) jam.FaseBerganti -= AturCahaya;
            if (kampung?.Cuaca != null) kampung.Cuaca.CahayaBerubah -= SaatCuaca;
            if (langit != null) Destroy(langit);
            if (profil != null) Destroy(profil);
        }
    }
}
