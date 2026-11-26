using UnityEngine;

namespace MS.Dunia
{
    internal sealed class PentasAksi
    {
        internal enum Jenis { TidakAda, Menulis, Mengetik, Memasak, Tidur, Makan, Melayani }

        readonly Transform pemain;
        Animator animator;
        Transform model, alat;
        Material bahan;
        Jenis jenis;
        Vector3? titik;
        Quaternion arah;
        float mula;

        public PentasAksi(Transform pemain) => this.pemain = pemain;

        public static Jenis Pilih(string id) => id switch
        {
            "belajar" or "belajarPerpus" => Jenis.Menulis,
            "nugas" or "nugasKafe" or "wfhKafe" or "nulisSkripsi" => Jenis.Mengetik,
            "masakMi" => Jenis.Memasak,
            "tidur" or "rebahan" or "tidurSiang" => Jenis.Tidur,
            "makanWarteg" => Jenis.Makan,
            "kerjaWarteg" or "kerjaWarkop" => Jenis.Melayani,
            _ => Jenis.TidakAda
        };

        public void Hubungkan(Animator sumber)
        {
            animator = sumber;
            model = sumber.transform;
        }

        public void Mulai(Jenis berikut)
        {
            Berhenti();
            jenis = berikut;
            if (jenis == Jenis.TidakAda || model == null) return;
            mula = Time.time;
            arah = pemain.rotation;
            string nama = jenis switch
            {
                Jenis.Menulis or Jenis.Mengetik => "Titik Meja",
                Jenis.Memasak => "Titik Dapur",
                Jenis.Tidur => "Titik Kasur",
                Jenis.Makan => "int_mejaPanjang",
                _ => null
            };
            var lokasi = nama == null ? null : GameObject.Find(nama)?.transform;
            if (lokasi != null && (lokasi.position - pemain.position).sqrMagnitude < 9f)
            {
                if (jenis == Jenis.Tidur)
                {
                    float tinggi = .47f;
                    var kasur = lokasi.parent.GetComponent<ModelPerLevel>();
                    if (kasur != null)
                    {
                        foreach (var bagian in kasur.perLevel)
                        {
                            if (bagian == null || !bagian.activeInHierarchy) continue;
                            var mesh = bagian.GetComponentInChildren<MeshRenderer>();
                            if (mesh != null) tinggi = Mathf.Clamp(mesh.bounds.size.y * .68f, .22f, .66f);
                            break;
                        }
                    }
                    titik = lokasi.position + Vector3.up * tinggi;
                    arah = Quaternion.LookRotation(Vector3.right);
                }
                else if (jenis == Jenis.Makan)
                {
                    float sisi = lokasi.InverseTransformPoint(pemain.position).z >= 0 ? 1f : -1f;
                    arah = Quaternion.LookRotation(-lokasi.forward * sisi);
                    titik = lokasi.position + lokasi.forward * (.72f * sisi) + Vector3.up * .49f;
                }
                else
                {
                    var menghadap = jenis == Jenis.Memasak ? Vector3.right : Vector3.forward;
                    arah = Quaternion.LookRotation(menghadap);
                    titik = lokasi.position + Vector3.up * (jenis == Jenis.Memasak ? 0f : .49f);
                }
            }
            if (jenis != Jenis.Tidur) SiapkanAlat();
        }

        public void Terapkan(ref Vector3 posisi, ref Quaternion rotasi)
        {
            if (jenis == Jenis.TidakAda || model == null) return;
            rotasi = Quaternion.Inverse(pemain.rotation) * arah;
            if (titik.HasValue)
            {
                var pangkal = jenis == Jenis.Memasak ? null : animator.GetBoneTransform(HumanBodyBones.Hips);
                if (pangkal == null) posisi = pemain.InverseTransformPoint(titik.Value);
                else
                {
                    var rusuk = model.InverseTransformPoint(pangkal.position);
                    posisi = pemain.InverseTransformPoint(titik.Value) - rotasi * Vector3.Scale(rusuk, model.localScale);
                }
            }
            if (alat == null) return;

            float t = Time.time - mula;
            float ketuk = Mathf.Sin(t * 15f);
            float aduk = t * 7f;
            var dasar = pemain.TransformPoint(posisi);
            var kanan = arah * Vector3.right;
            var depan = arah * Vector3.forward;
            float tinggi = jenis == Jenis.Memasak || jenis == Jenis.Melayani ? .95f : .76f;
            var tengah = titik.HasValue && jenis != Jenis.Memasak ? titik.Value : dasar;
            tengah.y = pemain.position.y + tinggi;
            tengah += depan * .39f;
            alat.SetPositionAndRotation(tengah, arah);

            var targetKiri = tengah - kanan * .145f + Vector3.up * .04f;
            var targetKanan = tengah + kanan * .145f + Vector3.up * .04f;
            if (jenis == Jenis.Menulis)
                targetKanan = tengah + kanan * (.06f + ketuk * .055f) + depan * (.054f * Mathf.Cos(t * 9f));
            else if (jenis == Jenis.Mengetik)
            {
                targetKiri += Vector3.up * (.035f * ketuk);
                targetKanan -= Vector3.up * (.035f * ketuk);
            }
            else if (jenis == Jenis.Memasak)
                targetKanan = tengah + kanan * (.13f * Mathf.Sin(aduk)) + depan * (.13f * Mathf.Cos(aduk)) + Vector3.up * .13f;
            else if (jenis == Jenis.Makan)
            {
                var mulut = animator.GetBoneTransform(HumanBodyBones.Head);
                if (mulut != null)
                    targetKanan = Vector3.Lerp(targetKanan, mulut.position + depan * .13f - Vector3.up * .035f,
                        .5f - .5f * Mathf.Cos(t * 3.3f));
            }
            else targetKanan += depan * (.20f * Mathf.Sin(t * 5f));

            ArahLengan(HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand, targetKiri, -kanan);
            ArahLengan(HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand, targetKanan, kanan);
        }

        void ArahLengan(HumanBodyBones atas, HumanBodyBones bawah, HumanBodyBones ujung, Vector3 sasaran, Vector3 sisi)
        {
            var bahu = animator.GetBoneTransform(atas);
            var siku = animator.GetBoneTransform(bawah);
            var tangan = animator.GetBoneTransform(ujung);
            if (bahu == null || siku == null || tangan == null) return;
            var asal = bahu.position;
            float a = (siku.position - asal).magnitude, b = (tangan.position - siku.position).magnitude;
            if (Mathf.Min(a,b)<.02f) return;
            var keSasaran = sasaran - asal;
            if (keSasaran.sqrMagnitude < .0001f) return;
            var lurus = keSasaran.normalized;
            float panjang = Mathf.Clamp(keSasaran.magnitude, Mathf.Abs(a-b)+.01f, a+b-.01f);
            float proyeksi = (a*a + panjang*panjang - b*b) / (2*panjang);
            var tikuk = Vector3.ProjectOnPlane(sisi * .75f + Vector3.down, lurus).normalized;
            var sikuBaru = asal + lurus * proyeksi + tikuk * Mathf.Sqrt(Mathf.Max(0, a*a - proyeksi*proyeksi));
            bahu.rotation = Quaternion.FromToRotation(siku.position - asal, sikuBaru - asal) * bahu.rotation;
            siku.rotation = Quaternion.FromToRotation(tangan.position - siku.position, asal + lurus*panjang - siku.position) * siku.rotation;
        }

        void SiapkanAlat()
        {
            if (bahan == null) bahan = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            alat = new GameObject("Perlengkapan " + jenis).transform;
            alat.SetParent(pemain, false);
            var hitam = new Color(.16f, .18f, .21f);
            var putih = new Color(.92f, .91f, .82f);
            switch (jenis)
            {
                case Jenis.Menulis:
                    Bentuk(PrimitiveType.Cube, Vector3.zero, new Vector3(.32f,.022f,.22f), putih);
                    Bentuk(PrimitiveType.Cube, new Vector3(.02f,.022f,.06f), new Vector3(.22f,.009f,.006f), new Color(.33f,.50f,.60f));
                    break;
                case Jenis.Mengetik:
                    Bentuk(PrimitiveType.Cube, Vector3.zero, new Vector3(.35f,.024f,.23f), hitam);
                    Bentuk(PrimitiveType.Cube, new Vector3(0,.116f,.118f), new Vector3(.35f,.23f,.018f), hitam);
                    Bentuk(PrimitiveType.Cube, new Vector3(0,.12f,.107f), new Vector3(.31f,.18f,.009f), new Color(.37f,.65f,.79f));
                    break;
                case Jenis.Memasak:
                    Bentuk(PrimitiveType.Cylinder, Vector3.zero, new Vector3(.32f,.055f,.32f), hitam);
                    Bentuk(PrimitiveType.Cylinder, new Vector3(0,.055f,0), new Vector3(.28f,.008f,.28f), new Color(.83f,.65f,.26f));
                    break;
                default:
                    Bentuk(PrimitiveType.Cylinder, Vector3.zero, new Vector3(.30f,.015f,.30f), putih);
                    Bentuk(PrimitiveType.Sphere, new Vector3(0,.025f,0), new Vector3(.167f,.065f,.15f), new Color(.78f,.60f,.35f));
                    break;
            }
        }

        void Bentuk(PrimitiveType jenis, Vector3 posisi, Vector3 ukuran, Color warna)
        {
            var benda = GameObject.CreatePrimitive(jenis);
            var kolider = benda.GetComponent<Collider>();
            kolider.enabled = false;
            Object.Destroy(kolider);
            benda.transform.SetParent(alat, false);
            benda.transform.localPosition = posisi;
            benda.transform.localScale = ukuran;
            var mesh = benda.GetComponent<MeshRenderer>();
            mesh.sharedMaterial = bahan;
            var blok = new MaterialPropertyBlock();
            blok.SetColor("_BaseColor", warna);
            mesh.SetPropertyBlock(blok);
        }

        public void Berhenti()
        {
            if (alat != null)
            {
                alat.gameObject.SetActive(false);
                Object.Destroy(alat.gameObject);
                alat = null;
            }
            jenis = Jenis.TidakAda;
            titik = null;
        }

        public void Lepas()
        {
            Berhenti();
            if (bahan != null) Object.Destroy(bahan);
        }
    }
}
