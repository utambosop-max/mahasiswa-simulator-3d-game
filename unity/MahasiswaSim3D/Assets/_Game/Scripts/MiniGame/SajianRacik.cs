using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;
using UnityEngine.UI;

namespace MS.MiniGame
{
    internal sealed class SajianRacik : MonoBehaviour
    {
        const int Lapis = 22;
        readonly Transform[] antrean = new Transform[3];
        Transform panggung, piring, tuang;
        RawImage gambar;
        Camera lensa;
        RenderTexture tekstur;
        Material bahan;
        PlayableGraph gerak;
        float langkah, menuang, frameBerikut, pergi;
        int isi, depan;
        bool pernah;
        bool kopi, kotor;

        internal void Siapkan(RawImage target) => gambar = target;

        internal void Mulai(bool warkop)
        {
            if (panggung == null) Bangun();
            kopi = warkop;
            panggung.gameObject.SetActive(true);
            pernah = false;
            depan = 0;
            pergi = 0;
        }

        internal void Pelanggan()
        {
            for (int i = piring.childCount - 1; i >= 0; i--)
                Destroy(piring.GetChild(i).gameObject);
            if (tuang != null) Destroy(tuang.gameObject);
            tuang = null;
            if (pernah) depan = (depan + 1) % antrean.Length;
            pernah = true;
            pergi = 0;
            langkah = .58f;
            if (gerak.IsValid()) gerak.Play();
            isi = 0;
            if (kopi)
            {
                Buat(piring, PrimitiveType.Cylinder, Vector3.up*.095f, new Vector3(.36f,.12f,.36f), new Color(.79f,.81f,.73f));
                Buat(piring, PrimitiveType.Cylinder, Vector3.up*.217f, new Vector3(.31f,.008f,.31f), new Color(.25f,.17f,.13f));
                Buat(piring, PrimitiveType.Cylinder, new Vector3(.20f,.093f,0), new Vector3(.14f,.035f,.05f), new Color(.79f,.81f,.73f));
            }
            else
            {
                Buat(piring, PrimitiveType.Cylinder, Vector3.up*.014f, new Vector3(.62f,.022f,.62f), new Color(.91f,.91f,.78f));
                Buat(piring, PrimitiveType.Cylinder, Vector3.up*.038f, new Vector3(.53f,.008f,.53f), new Color(.84f,.83f,.75f));
            }
            kotor = true;
        }

        internal void Tambah(string id)
        {
            if (piring == null) return;
            var warna = id switch
            {
                "nasi" or "susu" or "telur" => new Color(.95f,.93f,.78f),
                "sayur" => new Color(.27f,.53f,.20f),
                "ayam" or "gorengan" => new Color(.73f,.42f,.16f),
                "telur_balado" => new Color(.77f,.25f,.11f),
                "es" or "air_panas" => new Color(.62f,.83f,.91f),
                "mi" => new Color(.86f,.67f,.26f),
                _ => new Color(.46f,.28f,.15f)
            };
            if (kopi)
            {
                if (tuang != null) Destroy(tuang.gameObject);
                tuang = Buat(piring, id == "es" ? PrimitiveType.Cube : PrimitiveType.Cylinder,
                    Vector3.up*.49f, id == "es" ? Vector3.one*.078f : new Vector3(.028f,.17f,.028f), warna);
                menuang = .48f;
                Buat(piring, PrimitiveType.Cylinder, Vector3.up*(.221f + .005f*isi), new Vector3(.307f,.005f,.307f), warna*.83f);
            }
            else
            {
                float rot = isi * 2.39996f;
                var posisi = new Vector3(Mathf.Cos(rot)*.155f,.075f,Mathf.Sin(rot)*.155f);
                int jumlah = id is "nasi" or "sayur" ? 6 : 3;
                for (int i = 0; i < jumlah; i++)
                {
                    float jatuh = i / (float)jumlah;
                    float sudut = i * 2.39996f + rot;
                    var bidang = id is "tempe" or "gorengan" ? PrimitiveType.Cube : PrimitiveType.Sphere;
                    var objek = Buat(piring, bidang, posisi + new Vector3(Mathf.Cos(sudut)*.073f,
                        jatuh*.025f, Mathf.Sin(sudut)*.068f), new Vector3(.094f,.072f,.079f), warna*(1-jatuh*.17f));
                    objek.localRotation = Quaternion.Euler(0, 137.5f * i, 0);
                }
            }
            isi++;
            kotor = true;
        }

        internal void Hidangkan()
        {
            pergi = .48f;
            if (gerak.IsValid()) gerak.Play();
        }

        internal void Tick(float dt)
        {
            if (panggung == null || !panggung.gameObject.activeSelf) return;
            if (langkah > 0)
            {
                langkah = Mathf.Max(0, langkah - dt);
                for (int i = 0; i < antrean.Length; i++)
                    antrean[(depan + i) % antrean.Length].localPosition = new Vector3(.31f + i * .56f + langkah*.74f,
                        .03f + Mathf.Sin(langkah*25 + i)*langkah*.074f, .39f + i*.24f);
                kotor = true;
                if (langkah == 0 && gerak.IsValid()) gerak.Stop();
            }
            if (pergi > 0)
            {
                pergi = Mathf.Max(0, pergi - dt);
                antrean[depan].localPosition = new Vector3(.31f - (.48f-pergi)*3.8f, .03f, .39f - (.48f-pergi)*.9f);
                kotor = true;
                if (pergi == 0 && gerak.IsValid()) gerak.Stop();
            }
            if (tuang != null)
            {
                menuang = Mathf.Max(0, menuang - dt);
                tuang.localPosition = Vector3.up*(.30f + menuang*.53f);
                if (menuang == 0) { Destroy(tuang.gameObject); tuang = null; }
                kotor = true;
            }
            if (!kotor || Time.unscaledTime < frameBerikut) return;
            frameBerikut = Time.unscaledTime + 1f/20f;
            lensa.Render();
            kotor = false;
        }

        internal void Sembunyi()
        {
            if (panggung == null) return;
            panggung.gameObject.SetActive(false);
            if (gerak.IsValid()) gerak.Stop();
            gambar.gameObject.SetActive(false);
        }

        void Bangun()
        {
            panggung = new GameObject("Diorama racik").transform;
            UnityEngine.SceneManagement.SceneManager.MoveGameObjectToScene(panggung.gameObject, gameObject.scene);
            panggung.position = new Vector3(400, -21, 0);
            bahan = new Material(Shader.Find("Universal Render Pipeline/Unlit"));
            Buat(panggung, PrimitiveType.Cube, new Vector3(-.54f,.16f,-.32f),
                new Vector3(1.83f,.26f,.81f), new Color(.38f,.30f,.23f));
            Buat(panggung, PrimitiveType.Cube, new Vector3(-.54f,.292f,-.32f),
                new Vector3(1.87f,.032f,.84f), new Color(.68f,.55f,.40f));
            piring = new GameObject("Sajian").transform;
            piring.SetParent(panggung, false);
            piring.localPosition = new Vector3(-.73f,.32f,-.27f);
            gerak = PlayableGraph.Create("Antrean racik");
            var klip = Resources.LoadAll<AnimationClip>("Karakter/anim_Walking");
            for (int i = 0; i < antrean.Length; i++)
            {
                var akar = new GameObject("Pelanggan racik").transform;
                akar.SetParent(panggung, false);
                akar.localRotation = Quaternion.Euler(0, -128, 0);
                antrean[i] = akar;
                var aset = Resources.Load<GameObject>("Karakter/kar_" + (2+i));
                if (aset != null)
                {
                    var orang = Instantiate(aset, akar);
                    foreach (var anak in orang.GetComponentsInChildren<Transform>(true)) anak.gameObject.layer = Lapis;
                    var anim = orang.GetComponent<Animator>();
                    var skin = orang.GetComponentsInChildren<SkinnedMeshRenderer>(true);
                    if (skin.Length > 0)
                    {
                        var batas = skin[0].bounds;
                        foreach (var mesh in skin) batas.Encapsulate(mesh.bounds);
                        float skala = .91f / Mathf.Max(.1f,batas.size.y);
                        orang.transform.localScale *= skala;
                        orang.transform.localPosition = Vector3.up * (akar.position.y-batas.min.y)*skala;
                    }
                    if (anim != null)
                    {
                        anim.applyRootMotion = false;
                        anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                        foreach (var calon in klip)
                        {
                            if (calon.length <= 0 || calon.name.StartsWith("__preview__")) continue;
                            AnimationPlayableOutput.Create(gerak,"Antrean",anim).SetSourcePlayable(AnimationClipPlayable.Create(gerak,calon));
                            break;
                        }
                    }
                }
                else
                {
                    Buat(akar,PrimitiveType.Sphere,Vector3.up*.72f,new Vector3(.23f,.24f,.22f),new Color(.66f,.48f,.34f));
                    Buat(akar,PrimitiveType.Capsule,Vector3.up*.38f,new Vector3(.32f,.30f,.23f),
                        i%2==0 ? new Color(.32f,.48f,.55f) : new Color(.52f,.40f,.34f));
                }
            }
            var cam = new GameObject("Kamera sajian");
            cam.transform.SetParent(panggung,false);
            cam.transform.localPosition = new Vector3(-.16f,2.00f,-3.1f);
            cam.transform.LookAt(panggung.position + new Vector3(.08f,.44f,.13f));
            lensa = cam.AddComponent<Camera>();
            lensa.enabled = false;
            lensa.orthographic = true;
            lensa.orthographicSize = .78f;
            lensa.clearFlags = CameraClearFlags.SolidColor;
            lensa.backgroundColor = new Color(.35f,.42f,.41f);
            lensa.cullingMask = 1<<Lapis;
            lensa.farClipPlane = 8;
            tekstur = new RenderTexture(256,128,16,RenderTextureFormat.ARGB32);
            lensa.targetTexture = tekstur;
            gambar.texture = tekstur;
        }

        Transform Buat(Transform induk, PrimitiveType jenis, Vector3 posisi, Vector3 skala, Color warna)
        {
            var objek = GameObject.CreatePrimitive(jenis);
            objek.layer = Lapis;
            var kolider = objek.GetComponent<Collider>();
            kolider.enabled = false;
            Destroy(kolider);
            var hasil = objek.transform;
            hasil.SetParent(induk,false);
            hasil.localPosition = posisi;
            hasil.localScale = skala;
            var mesh = objek.GetComponent<MeshRenderer>();
            mesh.sharedMaterial = bahan;
            var blok = new MaterialPropertyBlock();
            blok.SetColor("_BaseColor", warna);
            mesh.SetPropertyBlock(blok);
            mesh.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            return hasil;
        }

        void OnDestroy()
        {
            if (panggung != null) Destroy(panggung.gameObject);
            if (gerak.IsValid()) gerak.Destroy();
            if (tekstur != null) { tekstur.Release(); Destroy(tekstur); }
            if (bahan != null) Destroy(bahan);
        }
    }
}
