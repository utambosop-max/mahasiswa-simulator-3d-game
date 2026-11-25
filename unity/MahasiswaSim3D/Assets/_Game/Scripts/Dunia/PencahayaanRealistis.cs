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
        JamGame jam;
        Material langit;
        VolumeProfile profil;
        Bloom bloom;
        Vignette vignette;
        VisualKampung kampung;
        bool luar;
        int mutu = -1;

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

            var volume = gameObject.AddComponent<Volume>();
            volume.isGlobal = true;
            volume.priority = 8;
            profil = ScriptableObject.CreateInstance<VolumeProfile>();
            volume.sharedProfile = profil;
            profil.Add<Tonemapping>(true).mode.value = TonemappingMode.ACES;
            var warna = profil.Add<ColorAdjustments>(true);
            warna.contrast.value = 4;
            warna.saturation.value = -5;
            bloom = profil.Add<Bloom>(true);
            bloom.intensity.value = .12f;
            bloom.threshold.value = 1.2f;
            vignette = profil.Add<Vignette>(true);
            vignette.intensity.value = .13f;
            if (Camera.main != null) Camera.main.GetUniversalAdditionalCameraData().renderPostProcessing = true;

            if (luar)
            {
                var hdr = Resources.Load<Cubemap>("Bahan/kloppenheim_06_puresky");
                var materialLangit = Resources.Load<Material>("Bahan/MaterialLangit");
                var shader = materialLangit != null ? materialLangit.shader : Shader.Find("Skybox/Cubemap");
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
        }

        void AturCahaya(Fase fase)
        {
            if (kampung != null) kampung.AturFase(fase);
            if (matahari == null) return;
            switch (fase)
            {
                case Fase.Pagi: Matahari(32, 1.15f, new Color(1, .88f, .71f)); break;
                case Fase.Siang: Matahari(62, 1.3f, new Color(1, .97f, .91f)); break;
                case Fase.Sore: Matahari(22, .95f, new Color(1, .66f, .43f)); break;
                default: Matahari(39, .28f, new Color(.43f, .59f, 1)); break;
            }
            if (langit != null)
                langit.SetFloat("_Exposure", fase == Fase.Malam || fase == Fase.Begadang ? .25f : .75f);
        }

        void Matahari(float tinggi, float intensitas, Color warna)
        {
            matahari.transform.rotation = Quaternion.Euler(tinggi, -36, 0);
            matahari.intensity = luar ? intensitas : Mathf.Max(.54f, intensitas);
            matahari.color = warna;
            RenderSettings.ambientLight = Color.Lerp(new Color(.43f, .46f, .53f), warna, luar ? .40f : .52f);
        }

        void OnDestroy()
        {
            if (jam != null) jam.FaseBerganti -= AturCahaya;
            if (langit != null) Destroy(langit);
            if (profil != null) Destroy(profil);
        }
    }
}
