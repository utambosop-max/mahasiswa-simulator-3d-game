using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;

namespace MS.Dunia
{
    internal sealed class TampilanHdrp : MonoBehaviour
    {
        readonly Dictionary<Material, Material> materi = new();
        readonly List<Material> slot = new();
        VolumeProfile profil;
        Fog kabut;
        Exposure eksposur;
        HDRISky hdri;
        GlobalIllumination gi;
        ScreenSpaceReflection pantulan;
        ContactShadows bayangan;
        float berikut;
        bool luar;
        int kualitas = -1;

        internal static bool Aktif => GraphicsSettings.currentRenderPipeline is HDRenderPipelineAsset;

        internal void Pasang(string scene, Light matahari)
        {
            luar = scene == "Kampung";
            var volume = gameObject.AddComponent<Volume>();
            volume.isGlobal = true;
            volume.priority = 20;
            volume.sharedProfile = profil = ScriptableObject.CreateInstance<VolumeProfile>();
            var lingkungan = profil.Add<VisualEnvironment>(true);
            var petaLangit = Resources.Load<Cubemap>("Bahan/kloppenheim_06_puresky");
            lingkungan.skyType.value = (int)(luar || petaLangit == null ? SkyType.PhysicallyBased : SkyType.HDRI);
            profil.Add<PhysicallyBasedSky>(true);
            hdri = profil.Add<HDRISky>(true);
            hdri.hdriSky.value = petaLangit;
            eksposur = profil.Add<Exposure>(true);
            eksposur.mode.value = ExposureMode.Fixed;
            profil.Add<Tonemapping>(true).mode.value = TonemappingMode.ACES;
            var pantulanTakLangsung = profil.Add<IndirectLightingController>(true);
            pantulanTakLangsung.indirectDiffuseLightingMultiplier.value = luar ? 1.35f : .85f;
            kabut = profil.Add<Fog>(true);
            kabut.baseHeight.value = 0f;
            kabut.maximumHeight.value = luar ? 9f : 3f;
            kabut.meanFreePath.value = luar ? 115f : 24f;
            kabut.albedo.value = new Color(.83f, .88f, .94f);
            gi = profil.Add<GlobalIllumination>(true);
            pantulan = profil.Add<ScreenSpaceReflection>(true);
            pantulan.enabledTransparent.value = false;
            bayangan = profil.Add<ContactShadows>(true);
            bayangan.opacity.value = .48f;
            if (Camera.main != null)
            {
                var tambahan = Camera.main.GetComponent<HDAdditionalCameraData>();
                if (tambahan == null) tambahan = Camera.main.gameObject.AddComponent<HDAdditionalCameraData>();
                tambahan.clearColorMode = luar ? HDAdditionalCameraData.ClearColorMode.Sky : HDAdditionalCameraData.ClearColorMode.Color;
                tambahan.backgroundColorHDR = new Color(.27f, .25f, .22f);
                tambahan.allowDynamicResolution = true;
                Camera.main.allowDynamicResolution = true;
                tambahan.customRenderingSettings = true;
                foreach (var fitur in new[] { FrameSettingsField.SSR, FrameSettingsField.SSGI, FrameSettingsField.ContactShadows })
                {
                    tambahan.renderingPathCustomFrameSettings.SetEnabled(fitur, true);
                    tambahan.renderingPathCustomFrameSettingsOverrideMask.mask[(uint)fitur] = true;
                }
            }
            if (matahari != null) SiapkanLampu(matahari);
            if (!luar)
            {
                bool warteg = scene == "Gedung_warteg";
                Lampu("Lampu ruang", new Vector3(0, 2.1f, 0), warteg ? 3200f : 6500f, 1050f);
                if (scene == "KamarKos")
                {
                    var ruang = GameObject.Find("Kamar");
                    bool hemat = ruang != null && ruang.transform.Find("Kamar Hemat 2,5 × 3 m") != null;
                    var berkas = Lampu("Berkas jendela", hemat ? new Vector3(.54f,1.66f,1.42f) :
                        new Vector3(-3.2f,1.56f,3.32f), 5500f, 2200f, LightType.Spot);
                    berkas.transform.rotation = Quaternion.LookRotation(new Vector3(.25f,-.32f,-1));
                    berkas.spotAngle = 39f;
                    berkas.shadows = LightShadows.Soft;
                }
            }
            AturMutu();
            PerbaruiMaterial();
        }

        Light Lampu(string nama, Vector3 posisi, float suhu, float lumen, LightType jenis = LightType.Point)
        {
            var lampu = new GameObject(nama).AddComponent<Light>();
            lampu.transform.SetParent(transform, false);
            lampu.transform.position = posisi;
            lampu.type = jenis;
            lampu.range = 12f;
            lampu.useColorTemperature = true;
            lampu.colorTemperature = suhu;
            SiapkanLampu(lampu);
            lampu.lightUnit = LightUnit.Lumen;
            lampu.intensity = lumen;
            return lampu;
        }

        static void SiapkanLampu(Light lampu)
        {
            var tambahan = lampu.GetComponent<HDAdditionalLightData>();
            if (tambahan == null) tambahan = lampu.gameObject.AddComponent<HDAdditionalLightData>();
            tambahan.affectsVolumetric = true;
            tambahan.useContactShadow.useOverride = true;
            tambahan.useContactShadow.@override = true;
        }

        internal void AturFase(Fase nilai, Light matahari, float cahaya)
        {
            bool malam = nilai is Fase.Malam or Fase.Begadang;
            eksposur.fixedExposure.value = luar ? (malam ? 6.4f : 10.3f) : 5.8f;
            hdri.multiplier.value = malam ? .13f : .72f;
            if (matahari == null) return;
            matahari.lightUnit = LightUnit.Lux;
            matahari.intensity = (luar ? (malam ? 24f : nilai == Fase.Sore ? 7200f : 19000f) : (malam ? 15f : 620f)) * cahaya;
        }

        void AturMutu()
        {
            kualitas = QualitySettings.GetQualityLevel();
            string nama = QualitySettings.names[kualitas];
            bool ultra = nama == "Ultra";
            bool tinggi = ultra || nama == "Tinggi";
            gi.enable.value = ultra;
            pantulan.enabled.value = tinggi;
            bayangan.enable.value = tinggi;
            kabut.enabled.value = tinggi;
            kabut.enableVolumetricFog.value = tinggi;
        }

        void LateUpdate()
        {
            if (kualitas != QualitySettings.GetQualityLevel()) AturMutu();
            if (Time.unscaledTime < berikut) return;
            berikut = Time.unscaledTime + .45f;
            PerbaruiMaterial();
        }

        void PerbaruiMaterial()
        {
            foreach (var renderer in FindObjectsByType<Renderer>(FindObjectsSortMode.None))
            {
                renderer.GetSharedMaterials(slot);
                bool ubah = false;
                for (int i = 0; i < slot.Count; i++)
                {
                    var sumber = slot[i];
                    if (sumber == null || sumber.shader == null || !PerluKonversi(sumber.shader.name)) continue;
                    if (!materi.TryGetValue(sumber, out var baru))
                    {
                        baru = Konversi(sumber, renderer is ParticleSystemRenderer);
                        if (baru == null) continue;
                        materi.Add(sumber, baru);
                    }
                    slot[i] = baru;
                    ubah = true;
                }
                if (ubah) renderer.SetSharedMaterials(slot);
            }
            foreach (var pasangan in materi)
            {
                if (pasangan.Key != null && pasangan.Key.HasProperty("_EmissionColor") &&
                    pasangan.Value.HasProperty("_EmissiveColor"))
                    pasangan.Value.SetColor("_EmissiveColor", pasangan.Key.GetColor("_EmissionColor"));
            }
        }

        static bool PerluKonversi(string nama) => nama.StartsWith("Universal Render Pipeline/") ||
            nama.StartsWith("Mahasiswa/") || nama.StartsWith("MS/") || nama is "Standard" or "Sprites/Default";

        static Material Konversi(Material sumber, bool partikel)
        {
            bool unlit = partikel || sumber.shader.name.Contains("Unlit") || sumber.shader.name == "Sprites/Default";
            var templat = Resources.Load<Material>(unlit ? "Hdrp/Unlit" : "Hdrp/Lit");
            if (templat == null) return null;
            var baru = new Material(templat) { name = sumber.name + " (HDRP)" };
            string tekstur = unlit ? "_UnlitColorMap" : "_BaseColorMap";
            Texture warna = sumber.mainTexture;
            baru.SetTexture(tekstur, warna);
            if (warna != null)
            {
                baru.SetTextureScale(tekstur, sumber.mainTextureScale);
                baru.SetTextureOffset(tekstur, sumber.mainTextureOffset);
            }
            string properti = sumber.HasProperty("_BaseColor") ? "_BaseColor" : "_Color";
            if (sumber.HasProperty(properti)) baru.SetColor(unlit ? "_UnlitColor" : "_BaseColor", sumber.GetColor(properti));
            if (!unlit)
            {
                SalinFloat(sumber, baru, "_Metallic", "_Metallic");
                SalinFloat(sumber, baru, "_Smoothness", "_Smoothness");
                SalinFloat(sumber, baru, "_BumpScale", "_NormalScale");
                if (sumber.HasProperty("_BumpMap")) baru.SetTexture("_NormalMap", sumber.GetTexture("_BumpMap"));
                if (sumber.HasProperty("_MetallicGlossMap")) baru.SetTexture("_MaskMap", sumber.GetTexture("_MetallicGlossMap"));
                if (sumber.HasProperty("_EmissionMap")) baru.SetTexture("_EmissiveColorMap", sumber.GetTexture("_EmissionMap"));
            }
            SalinFloat(sumber, baru, "_Surface", "_SurfaceType");
            SalinFloat(sumber, baru, "_AlphaClip", "_AlphaCutoffEnable");
            SalinFloat(sumber, baru, "_Cutoff", "_AlphaCutoff");
            if (partikel || sumber.shader.name == "Sprites/Default") baru.SetFloat("_SurfaceType", 1);
            HDMaterial.ValidateMaterial(baru);
            return baru;
        }

        static void SalinFloat(Material a, Material b, string dari, string ke)
        {
            if (a.HasProperty(dari) && b.HasProperty(ke)) b.SetFloat(ke, a.GetFloat(dari));
        }

        void OnDestroy()
        {
            foreach (var bahan in materi.Values) Destroy(bahan);
            if (profil != null) Destroy(profil);
        }
    }
}
