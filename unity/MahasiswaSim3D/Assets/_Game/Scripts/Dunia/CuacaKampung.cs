using System;
using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;

namespace MS.Dunia
{
    internal sealed class CuacaKampung : MonoBehaviour
    {
        const int Cerah = 0, Mendung = 1, Gerimis = 2, Hujan = 3;
        static readonly int Licin = Shader.PropertyToID("_Smoothness");
        readonly List<GameObject> payungWarga = new();
        readonly List<Material> permukaan = new();
        readonly List<(Transform posisi, Vector3 ukuran)> genangan = new();
        ParticleSystem tetes;
        Material bahan;
        Texture2D tekstur;
        Transform pemain;
        float periksaPada;
        int terakhir = -1, mutu = -1;
        bool wargaDiLuar;

        public event Action<float> CahayaBerubah;

        public void Pasang(Transform jalan)
        {
            var shader = Shader.Find("Sprites/Default");
            if (shader == null) return;
            pemain = GameObject.FindWithTag("Player")?.transform;
            tekstur = new Texture2D(8,16,TextureFormat.RGBA32,false)
                { name = "Tetes gerimis", wrapMode = TextureWrapMode.Clamp };
            var piksel = new Color32[128];
            for (int y = 0; y < 16; y++)
                for (int x = 0; x < 8; x++)
                {
                    float selubung = Mathf.Max(0, 1 - Mathf.Abs(x - 3.5f) / 3.6f);
                    float ujung = Mathf.Sin(y * Mathf.PI / 15);
                    piksel[y * 8 + x] = new Color32(224,236,248,(byte)(220 * selubung * ujung));
                }
            tekstur.SetPixels32(piksel);
            tekstur.Apply(false,true);
            bahan = new Material(shader) { mainTexture = tekstur };

            var objek = new GameObject("Partikel hujan");
            objek.transform.SetParent(transform,false);
            tetes = objek.AddComponent<ParticleSystem>();
            tetes.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
            var utama = tetes.main;
            utama.playOnAwake = false;
            utama.loop = true;
            utama.maxParticles = 255;
            utama.simulationSpace = ParticleSystemSimulationSpace.World;
            utama.startLifetime = new ParticleSystem.MinMaxCurve(.57f,.79f);
            utama.startSpeed = 0;
            utama.startSize = new ParticleSystem.MinMaxCurve(.018f,.034f);
            utama.startColor = new Color(.77f,.86f,1f,.45f);
            var ruang = tetes.shape;
            ruang.shapeType = ParticleSystemShapeType.Box;
            ruang.scale = new Vector3(18,.3f,18);
            var laju = tetes.velocityOverLifetime;
            laju.enabled = true;
            laju.space = ParticleSystemSimulationSpace.World;
            laju.x = new ParticleSystem.MinMaxCurve(.32f,1.22f);
            laju.y = new ParticleSystem.MinMaxCurve(-11.8f,-8.9f);
            laju.z = new ParticleSystem.MinMaxCurve(.16f,.81f);
            var render = objek.GetComponent<ParticleSystemRenderer>();
            render.sharedMaterial = bahan;
            render.renderMode = ParticleSystemRenderMode.Stretch;
            render.lengthScale = 1.9f;
            render.velocityScale = .19f;
            render.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            render.receiveShadows = false;

            if (jalan == null) return;
            foreach (Transform bidang in jalan)
            {
                if (!bidang.name.StartsWith("Jalan ") && !bidang.name.StartsWith("Trotoar ")) continue;
                var renderer = bidang.GetComponent<MeshRenderer>();
                if (renderer != null && !permukaan.Contains(renderer.sharedMaterial))
                    permukaan.Add(renderer.sharedMaterial);
            }
            foreach (Transform anak in transform)
                if (anak.name == "Genangan tepi jalan") genangan.Add((anak, anak.localScale));
            var katalog = KatalogPropDunia.Muat();
            var sumber = katalog != null ? katalog.Ambil("prop_payung") : null;
            if (sumber == null) return;
            foreach (var warga in FindObjectsByType<WargaJalan>(FindObjectsSortMode.InstanceID))
            {
                if (payungWarga.Count == 7) break;
                var payung = Instantiate(sumber,warga.transform);
                payung.name = "Payung cuaca";
                payung.transform.SetLocalPositionAndRotation(new Vector3(.27f,.16f,0),Quaternion.Euler(0,-12,0));
                foreach (var permukaan in payung.GetComponentsInChildren<MeshRenderer>())
                    permukaan.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                payung.SetActive(false);
                payungWarga.Add(payung);
            }
        }

        void LateUpdate()
        {
            if (tetes == null) return;
            if (pemain != null) tetes.transform.position = pemain.position + Vector3.up * 6.5f;
            if (Time.unscaledTime < periksaPada) return;
            periksaPada = Time.unscaledTime + .25f;
            var jam = Layanan.Jam;
            var id = Layanan.Kondisi?.CuacaId;
            int kualitas = QualitySettings.GetQualityLevel();
            bool turun = id == "hujan";
            int sekarang = turun ? (jam?.Fase == Fase.Pagi || jam?.Fase == Fase.Sore ? Gerimis : Hujan)
                : id == "cerah" && jam?.Tanggal % 4 == 0 ? Mendung : Cerah;
            bool terlihat = jam?.Fase != Fase.Begadang;
            if (sekarang == terakhir && mutu == kualitas && wargaDiLuar == terlihat) return;
            terakhir = sekarang;
            mutu = kualitas;
            wargaDiLuar = terlihat;
            var utama = tetes.main;
            utama.maxParticles = kualitas > 0 ? 460 : 255;
            var emit = tetes.emission;
            emit.rateOverTime = sekarang == Hujan ? (kualitas > 0 ? 410 : 230)
                : sekarang == Gerimis ? (kualitas > 0 ? 110 : 64) : 0;
            if (turun && !tetes.isPlaying) tetes.Play();
            if (!turun && tetes.isPlaying) tetes.Stop(true,ParticleSystemStopBehavior.StopEmitting);
            foreach (var material in permukaan)
                if (material != null) material.SetFloat(Licin, turun ? .89f : .75f);
            foreach (var (posisi, ukuran) in genangan)
                if (posisi != null)
                    posisi.localScale = turun ? Vector3.Scale(ukuran, new Vector3(1.55f, 1, 1.70f)) : ukuran;
            foreach (var payung in payungWarga)
                if (payung != null) payung.SetActive(turun && terlihat);
            CahayaBerubah?.Invoke(sekarang switch { Hujan => .58f, Gerimis => .73f, Mendung => .81f, _ => 1f });
        }

        void OnDestroy()
        {
            if (bahan != null) Destroy(bahan);
            if (tekstur != null) Destroy(tekstur);
        }
    }
}
