using MS.Dunia;
using MS.Kontrak;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;
using UnityEngine.UI;

namespace MS.UI
{
    internal sealed class StudioPenampilan : MonoBehaviour
    {
        GameObject studio;
        GameObject figur;
        PenampilanMahasiswa penampilan;
        RenderTexture gambar;
        VolumeProfile profil;
        Camera kamera;
        int lapis;
        int indeks = -1;

        public void Tampilkan(RupaMahasiswa rupa)
        {
            if (studio == null) BuatStudio();
            if (indeks != rupa.Figur)
            {
                indeks = rupa.Figur;
                if (figur != null) { figur.SetActive(false); Destroy(figur); }
                var model = PenampilanMahasiswa.Muat(PenampilanMahasiswa.Figur(indeks));
                if (model == null) return;
                figur = Instantiate(model, studio.transform);
                foreach (var bagian in figur.GetComponentsInChildren<Transform>(true))
                    bagian.gameObject.layer = lapis;
                var animator = figur.GetComponent<Animator>();
                if (animator != null && animator.isHuman)
                {
                    var klip = System.Array.Find(Resources.LoadAll<AnimationClip>("Karakter/anim_Idle"),
                        item => !item.name.StartsWith("__preview__", System.StringComparison.Ordinal) && item.length > 0);
                    if (klip != null) klip.SampleAnimation(figur, Mathf.Min(1f, klip.length * .5f));
                    else PenampilanMahasiswa.PoseSantai(animator);
                }
                figur.transform.SetLocalPositionAndRotation(Vector3.zero, Quaternion.Euler(0, 165f, 0));
                penampilan = figur.AddComponent<PenampilanMahasiswa>();
            }
            if (penampilan == null) return;
            penampilan.Atur(rupa, PenampilanMahasiswa.Figur(indeks));
            figur.transform.localScale = new Vector3(1 + .14f * rupa.Badan, 1 + .055f * rupa.Badan, 1 + .09f * rupa.Badan);
        }

        void BuatStudio()
        {
            lapis = LayerMask.NameToLayer("StudioKarakter");
            studio = new GameObject("Studio karakter 3D") { layer = lapis };
            studio.transform.position = new Vector3(-180, -150, 0);
            gambar = new RenderTexture(640, 800, 24, RenderTextureFormat.ARGB32) { name = "Foto studio" };
            GetComponent<RawImage>().texture = gambar;
            kamera = BuatObjek("Kamera studio", new Vector3(0, 1.1f, -4.38f)).AddComponent<Camera>();
            kamera.transform.LookAt(studio.transform.position + Vector3.up * .94f);
            kamera.clearFlags = CameraClearFlags.SolidColor;
            kamera.backgroundColor = new Color(.24f, .31f, .30f);
            kamera.targetTexture = gambar;
            kamera.cullingMask = 1 << lapis;
            kamera.fieldOfView = 26f;
            kamera.nearClipPlane = .1f;
            kamera.farClipPlane = 12f;
            bool hdrp = GraphicsSettings.currentRenderPipeline is HDRenderPipelineAsset;
            if (hdrp)
            {
                var data = kamera.gameObject.AddComponent<HDAdditionalCameraData>();
                data.clearColorMode = HDAdditionalCameraData.ClearColorMode.Color;
                data.backgroundColorHDR = kamera.backgroundColor;
                data.volumeLayerMask = 1 << lapis;
                data.antialiasing = HDAdditionalCameraData.AntialiasingMode.SubpixelMorphologicalAntiAliasing;
                var volume = studio.AddComponent<Volume>();
                volume.isGlobal = true;
                volume.priority = 100;
                profil = ScriptableObject.CreateInstance<VolumeProfile>();
                volume.sharedProfile = profil;
                var exposure = profil.Add<Exposure>(true);
                exposure.mode.value = ExposureMode.Fixed;
                exposure.fixedExposure.value = 7.2f;
            }
            Lampu("Lampu utama", new Vector3(-1.4f, 2.35f, -2.2f), new Color(1, .88f, .74f), hdrp ? 3200f : 3.2f);
            Lampu("Lampu isi", new Vector3(1.65f, 1.35f, -2f), new Color(.74f, .86f, 1), hdrp ? 1700f : 2f);
            Lampu("Lampu tepi", new Vector3(.25f, 2f, 1.7f), Color.white, hdrp ? 1650f : 1.5f);
        }

        GameObject BuatObjek(string nama, Vector3 posisi)
        {
            var objek = new GameObject(nama) { layer = lapis };
            objek.transform.SetParent(studio.transform, false);
            objek.transform.localPosition = posisi;
            return objek;
        }

        void Lampu(string nama, Vector3 posisi, Color warna, float intensitas)
        {
            var lampu = BuatObjek(nama, posisi).AddComponent<Light>();
            lampu.type = LightType.Point;
            lampu.range = 8f;
            lampu.color = warna;
            lampu.intensity = intensitas;
            lampu.cullingMask = 1 << lapis;
        }

        void Update()
        {
            if (figur == null) return;
            figur.transform.Rotate(0f, 17f * Time.unscaledDeltaTime, 0f);
            penampilan.Ekspresi(false);
        }

        void OnEnable() { if (studio != null) studio.SetActive(true); }
        void OnDisable() { if (studio != null) studio.SetActive(false); }

        void OnDestroy()
        {
            if (studio != null) Destroy(studio);
            if (gambar != null) { gambar.Release(); Destroy(gambar); }
            if (profil != null) Destroy(profil);
        }
    }
}
