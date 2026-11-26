using MS.Kontrak;
using UnityEngine;

namespace MS.Dunia
{
    internal sealed class PartikelKampung : MonoBehaviour
    {
        ParticleSystem debu, daun;
        Material bahan;
        Texture2D tekstur;
        Transform pemain;
        bool tinggi, siang, menyala;

        public void Pasang()
        {
            var shader = Shader.Find("Sprites/Default");
            if (shader == null) return;
            const int ukuran = 32;
            tekstur = new Texture2D(ukuran, ukuran, TextureFormat.RGBA32, false)
                { name = "Tekstur partikel udara", wrapMode = TextureWrapMode.Clamp };
            var piksel = new Color32[ukuran * ukuran];
            for (int y = 0; y < ukuran; y++)
                for (int x = 0; x < ukuran; x++)
                {
                    var posisi = new Vector2((x + .5f) / ukuran * 2 - 1, (y + .5f) / ukuran * 2 - 1);
                    byte alpha = (byte)Mathf.RoundToInt(Mathf.SmoothStep(1, 0, Mathf.Clamp01(posisi.magnitude)) * 255);
                    piksel[y * ukuran + x] = new Color32(255, 255, 255, alpha);
                }
            tekstur.SetPixels32(piksel);
            tekstur.Apply(false, true);
            bahan = new Material(shader) { mainTexture = tekstur };
            debu = Buat("Debu di udara", 48, 6, new Color(1f, .93f, .74f, .32f), .055f, -.03f);
            daun = Buat("Daun di udara", 12, .65f, new Color(.63f, .67f, .40f, .46f), .13f, -.074f);
            pemain = GameObject.FindWithTag("Player")?.transform;
        }

        ParticleSystem Buat(string nama, int batas, float laju, Color warna, float ukuran, float gravitasi)
        {
            var objek = new GameObject(nama);
            objek.transform.SetParent(transform, false);
            var sistem = objek.AddComponent<ParticleSystem>();
            var main = sistem.main;
            main.playOnAwake = false;
            main.loop = true;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.maxParticles = batas;
            main.startLifetime = new ParticleSystem.MinMaxCurve(2.8f, 5.9f);
            main.startSize = new ParticleSystem.MinMaxCurve(ukuran * .49f, ukuran);
            main.startSpeed = new ParticleSystem.MinMaxCurve(.045f,.10f);
            main.startColor = warna;
            main.gravityModifier = gravitasi;
            var bentuk = sistem.shape;
            bentuk.shapeType = ParticleSystemShapeType.Box;
            bentuk.scale = new Vector3(15, 3.3f, 15);
            var emit = sistem.emission;
            emit.rateOverTime = laju;
            var alir = sistem.velocityOverLifetime;
            alir.enabled = true;
            alir.space = ParticleSystemSimulationSpace.World;
            alir.x = new ParticleSystem.MinMaxCurve(.16f, .3f);
            alir.y = new ParticleSystem.MinMaxCurve(.02f, .05f);
            alir.z = new ParticleSystem.MinMaxCurve(.09f, .21f);
            var tuju = sistem.colorOverLifetime;
            tuju.enabled = true;
            var gradien = new Gradient();
            gradien.SetKeys(new[] { new GradientColorKey(Color.white,0), new GradientColorKey(Color.white,1) },
                new[] { new GradientAlphaKey(0,0), new GradientAlphaKey(1,.25f), new GradientAlphaKey(0,1) });
            tuju.color = gradien;
            var renderer = objek.GetComponent<ParticleSystemRenderer>();
            renderer.sharedMaterial = bahan;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            sistem.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            return sistem;
        }

        public void AturMutu(bool tinggi) => this.tinggi = tinggi;

        public void AturFase(Fase fase) => siang = fase == Fase.Pagi || fase == Fase.Siang || fase == Fase.Sore;

        void LateUpdate()
        {
            if (debu == null) return;
            bool perlu = tinggi && siang && Layanan.Kondisi?.CuacaId is not ("hujan" or "badai");
            if (perlu != menyala)
            {
                menyala = perlu;
                if (perlu)
                {
                    debu.Play();
                    daun.Play();
                }
                else
                {
                    debu.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
                    daun.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
                }
            }
            if (menyala && pemain != null)
            {
                Vector3 posisi = pemain.position + Vector3.up * 1.8f;
                debu.transform.position = posisi;
                daun.transform.position = posisi;
            }
        }

        void OnDestroy()
        {
            if (bahan != null) Destroy(bahan);
            if (tekstur != null) Destroy(tekstur);
        }
    }
}
