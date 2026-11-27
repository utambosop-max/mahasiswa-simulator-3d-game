using System;
using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;
using UnityEngine.AI;

namespace MS.Pemain
{
    [DefaultExecutionOrder(-12)]
    public sealed class AntreanAksi : MonoBehaviour
    {
        public const int Kapasitas = 5;
        public sealed class Entri
        {
            public string Nama;
            public Vector3 Tujuan;
            public TitikInteraksi Titik;
            public PerintahAksi? Perintah;
            public Action<PerintahAksi> Jalankan;
        }

        public Vector3 Arah { get; private set; }
        public IReadOnlyList<Entri> Daftar => antrean;
        public event Action Berubah;
        public event Action<string> Pesan;
        public bool Ditahan { get; set; }

        readonly List<Entri> antrean = new();
        NavMeshPath jalur;
        Camera kamera;
        KameraIsometric mode;
        NavMeshDataInstance nav;
        Vector3[] sudut;
        int indeks;
        float waktuBuntu;
        Vector3 posisiLalu;

        void Start()
        {
            jalur = new NavMeshPath();
            kamera = Camera.main;
            mode = kamera?.GetComponent<KameraIsometric>();
        }

        public bool Tambah(Entri entri)
        {
            if (entri == null || antrean.Count >= Kapasitas) return false;
            antrean.Add(entri);
            Berubah?.Invoke();
            return true;
        }

        public void Batal(int nomor)
        {
            if (nomor < 0 || nomor >= antrean.Count) return;
            antrean.RemoveAt(nomor);
            if (nomor == 0) { sudut = null; Arah = Vector3.zero; }
            Berubah?.Invoke();
        }

        public void SegarkanPeta() { if (nav.valid) nav.Remove(); sudut = null; }

        void Update()
        {
            Arah = Vector3.zero;
            if (antrean.Count == 0 || Ditahan || mode?.ModeAtur != true || Layanan.InputDitahan || Layanan.Jam?.Sibuk == true) return;
            var aktif = antrean[0];
            if (aktif.Perintah.HasValue && aktif.Titik == null) { Batal(0); return; }
            var tujuan = aktif.Titik != null ? aktif.Titik.transform.position : aktif.Tujuan;
            var dekat = aktif.Titik == null ? .34f : Mathf.Clamp(aktif.Titik.radius * .77f, .65f, 1.5f);
            if (Datar(tujuan - transform.position).sqrMagnitude < dekat * dekat)
            {
                Batal(0);
                if (aktif.Perintah.HasValue) aktif.Jalankan?.Invoke(aktif.Perintah.Value);
                return;
            }

            if (sudut == null)
            {
                if (!SiapkanJalur(tujuan, dekat)) { Gagal(); return; }
                indeks = 1;
                waktuBuntu = 0;
                posisiLalu = transform.position;
            }
            if (indeks >= sudut.Length) { Gagal(); return; }
            var langkah = Datar(sudut[indeks] - transform.position);
            if (langkah.sqrMagnitude < .18f * .18f) { indeks++; return; }
            Arah = langkah.normalized;
            if ((posisiLalu - transform.position).sqrMagnitude > .052f * .052f)
            {
                posisiLalu = transform.position;
                waktuBuntu = 0;
            }
            else waktuBuntu += Time.deltaTime;
            if (waktuBuntu > 2f) Gagal();
        }

        bool SiapkanJalur(Vector3 target, float dekat)
        {
            if (!nav.valid)
            {
                var sources = new List<NavMeshBuildSource>();
                var batas = new Bounds(transform.position, gameObject.scene.name == "Kampung"
                    ? new Vector3(245, 12, 245) : new Vector3(32, 10, 32));
                NavMeshBuilder.CollectSources(batas, Physics.DefaultRaycastLayers, NavMeshCollectGeometry.PhysicsColliders,
                    0, new List<NavMeshBuildMarkup>(), sources);
                sources.RemoveAll(s => s.component is CharacterController ||
                    s.component != null && (s.component.name.StartsWith("Warga ", StringComparison.Ordinal) ||
                    (s.component is Collider c && c.isTrigger)));
                var setting = NavMesh.GetSettingsByIndex(0);
                setting.agentRadius = .23f;
                setting.agentHeight = 1.55f;
                setting.minRegionArea = .1f;
                var data = NavMeshBuilder.BuildNavMeshData(setting, sources, batas, Vector3.zero, Quaternion.identity);
                if (data == null) return false;
                nav = NavMesh.AddNavMeshData(data);
            }
            if (!NavMesh.SamplePosition(transform.position, out var asal, 1.2f, NavMesh.AllAreas)) return false;
            if (!NavMesh.SamplePosition(target, out var akhir, dekat + .35f, NavMesh.AllAreas)) return false;
            if (!NavMesh.CalculatePath(asal.position, akhir.position, NavMesh.AllAreas, jalur) ||
                jalur.status != NavMeshPathStatus.PathComplete) return false;
            sudut = jalur.corners;
            return sudut.Length > 1;
        }

        void Gagal()
        {
            Batal(0);
            Pesan?.Invoke("Jalurnya terhalang.");
        }

        static Vector3 Datar(Vector3 v) => new Vector3(v.x, 0, v.z);
        void OnDestroy() { if (nav.valid) nav.Remove(); }
    }
}
