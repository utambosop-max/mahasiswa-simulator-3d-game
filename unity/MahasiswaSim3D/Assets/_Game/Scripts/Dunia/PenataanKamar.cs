using System.Collections.Generic;
using MS.Inti;
using MS.Pemain;
using UnityEngine;

namespace MS.Dunia
{
    public sealed class PenataanKamar : MonoBehaviour
    {
        public sealed class Barang
        {
            public readonly string Id, Nama;
            public readonly int Harga;
            internal readonly float Tinggi;
            public Barang(string id, string nama, int harga, float tinggi)
            { Id = id; Nama = nama; Harga = harga; Tinggi = tinggi; }
        }

        public static readonly Barang[] Katalog =
        {
            new("painted_wooden_nightstand", "Meja samping", 45000, .55f),
            new("wooden_stool_01", "Bangku kayu", 23000, .43f),
            new("potted_plant_02", "Tanaman pot", 18000, .34f)
        };
        static readonly Color[] cat = { Color.white, new(.82f, .70f, .52f), new(.63f, .83f, .69f) };
        readonly Dictionary<string, GameObject> objek = new();
        Transform ruang;
        Renderer dasar;
        GameInti game;
        string pilihan;
        int sudut;
        GameObject garis;
        Material bahanGaris, bahanLantai;
        Mesh meshGaris;
        public bool Aktif { get; private set; }
        public string Pilihan => pilihan;
        public bool Milik(string id) => game?.Simpanan.tataKamar.ContainsKey(id) == true;

        public bool Mulai(bool aktif)
        {
            if (!aktif) { Aktif = false; if (garis != null) garis.SetActive(false); return true; }
            if (!Siapkan()) return false;
            Aktif = true;
            if (garis == null) BuatGrid();
            garis.SetActive(true);
            return true;
        }

        void Start() { Siapkan(); }
        bool Siapkan()
        {
            if (dasar != null && dasar.gameObject.activeInHierarchy) return true;
            game = GameInti.Instans;
            var akar = GameObject.Find("Kamar")?.transform;
            if (game == null || akar == null) return false;
            ruang = akar.Find("Kamar Hemat 2,5 × 3 m") ?? akar;
            dasar = ruang.Find("Lantai")?.GetComponent<Renderer>();
            if (dasar == null) return false;
            game.Simpanan.tataKamar ??= new();
            foreach (var barang in Katalog)
                if (game.Simpanan.tataKamar.TryGetValue(barang.Id, out var lokasi) && lokasi.terpasang)
                    Terapkan(barang, lokasi);
            Finishing();
            return true;
        }

        public bool Pilih(Barang barang, bool beli)
        {
            if (!Aktif || barang == null) return false;
            if (!Milik(barang.Id))
            {
                if (!beli || game.Stat.Uang < barang.Harga || KatalogPropDunia.Muat()?.Ambil(barang.Id) == null) return false;
                game.Simpanan.tataKamar.Add(barang.Id, new LetakPerabot());
                game.Stat.TambahUang(-barang.Harga);
                SimpanMuat.Simpan(game.Simpanan);
            }
            pilihan = barang.Id;
            sudut = game.Simpanan.tataKamar[pilihan].rotasi;
            return true;
        }

        public bool PilihObjek(Transform target)
        {
            foreach (var barang in Katalog)
                if (objek.TryGetValue(barang.Id, out var benda) && target.IsChildOf(benda.transform))
                    return Pilih(barang, false);
            return false;
        }

        public void Putar() { sudut = (sudut + 90) % 360; }

        public bool Tempatkan(Vector3 titik)
        {
            if (!Aktif || pilihan == null) return false;
            var barang = System.Array.Find(Katalog, b => b.Id == pilihan);
            var batas = dasar.bounds;
            float x = Mathf.Round(titik.x * 4f) / 4f, z = Mathf.Round(titik.z * 4f) / 4f;
            var posisi = new Vector3(x, batas.max.y, z);
            if (x < batas.min.x + .26f || x > batas.max.x - .26f || z < batas.min.z + .26f || z > batas.max.z - .26f)
                return false;
            if (game.Simpanan.tataKamar.TryGetValue(pilihan, out var lokasi))
            {
                objek.TryGetValue(pilihan, out var lama);
                foreach (var c in Physics.OverlapBox(posisi + Vector3.up * .20f, new Vector3(.19f, .18f, .19f),
                    Quaternion.identity, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore))
                    if (lama == null || !c.transform.IsChildOf(lama.transform)) return false;
                lokasi.x = x;
                lokasi.z = z;
                lokasi.rotasi = sudut;
                lokasi.terpasang = true;
                Terapkan(barang, lokasi);
                GameObject.Find("Pemain")?.GetComponent<AntreanAksi>()?.SegarkanPeta();
                SimpanMuat.Simpan(game.Simpanan);
            }
            return true;
        }

        public void GantiCat() { if (Aktif) { game.Simpanan.catKamar = (game.Simpanan.catKamar + 1) % 3; SimpanFinishing(); } }
        public void GantiLantai() { if (Aktif) { game.Simpanan.lantaiKamar = (game.Simpanan.lantaiKamar + 1) % 3; SimpanFinishing(); } }
        void SimpanFinishing() { Finishing(); SimpanMuat.Simpan(game.Simpanan); }

        void Finishing()
        {
            var warna = cat[Mathf.Clamp(game.Simpanan.catKamar, 0, cat.Length - 1)];
            var blok = new MaterialPropertyBlock();
            blok.SetColor("_BaseColor", warna);
            foreach (var dinding in ruang.GetComponentsInChildren<Renderer>())
                if (dinding.name.StartsWith("Dinding", System.StringComparison.OrdinalIgnoreCase))
                    dinding.SetPropertyBlock(blok);
            int lantai = game.Simpanan.lantaiKamar;
            if (lantai == 0 && bahanLantai == null) return;
            var sumber = dasar.sharedMaterial;
            string jenis = lantai == 1 ? "wood_table_001" : lantai == 2 ? "Tiles110" : "Tiles074";
            var tekstur = Resources.Load<Texture2D>("Bahan/" + jenis + "/warna");
            if (sumber == null || tekstur == null) return;
            dasar.GetPropertyBlock(blok);
            blok.SetTexture(sumber.HasProperty("_BaseColorMap") ? "_BaseColorMap" : "_BaseMap", tekstur);
            dasar.SetPropertyBlock(blok);
            bahanLantai = sumber;
        }

        void Terapkan(Barang barang, LetakPerabot lokasi)
        {
            if (!objek.TryGetValue(barang.Id, out var model))
            {
                var prefab = KatalogPropDunia.Muat()?.Ambil(barang.Id);
                if (prefab == null) return;
                model = new GameObject(barang.Nama);
                model.transform.SetParent(ruang, false);
                var isi = Instantiate(prefab, model.transform);
                var render = isi.GetComponentsInChildren<Renderer>();
                if (render.Length > 0)
                {
                    var b = render[0].bounds;
                    foreach (var r in render) b.Encapsulate(r.bounds);
                    float k = barang.Tinggi / Mathf.Max(.05f, b.size.y);
                    isi.transform.localScale *= k;
                    isi.transform.localPosition -= (new Vector3(b.center.x,b.min.y,b.center.z) - model.transform.position) * k;
                    var collider = model.AddComponent<BoxCollider>();
                    collider.center = Vector3.up * (barang.Tinggi * .5f);
                    collider.size = b.size * k;
                }
                objek.Add(barang.Id, model);
            }
            model.transform.SetPositionAndRotation(new Vector3(lokasi.x, dasar.bounds.max.y, lokasi.z), Quaternion.Euler(0, lokasi.rotasi, 0));
        }

        void BuatGrid()
        {
            garis = new GameObject("Grid seperempat meter");
            garis.transform.SetParent(transform);
            var b = dasar.bounds;
            float y = b.max.y + .014f;
            var v = new List<Vector3>();
            for (float x = Mathf.Ceil(b.min.x * 4) * .25f; x <= b.max.x; x += .25f)
            { v.Add(new Vector3(x, y, b.min.z)); v.Add(new Vector3(x, y, b.max.z)); }
            for (float z = Mathf.Ceil(b.min.z * 4) * .25f; z <= b.max.z; z += .25f)
            { v.Add(new Vector3(b.min.x, y, z)); v.Add(new Vector3(b.max.x, y, z)); }
            meshGaris = new Mesh();
            meshGaris.SetVertices(v);
            var indeks = new int[v.Count];
            for (int i = 0; i < indeks.Length; i++) indeks[i] = i;
            meshGaris.SetIndices(indeks, MeshTopology.Lines, 0);
            garis.AddComponent<MeshFilter>().sharedMesh = meshGaris;
            bahanGaris = TampilanHdrp.Aktif ? new Material(Resources.Load<Material>("Hdrp/Unlit"))
                : new Material(Shader.Find("Universal Render Pipeline/Unlit"));
            bahanGaris.color = new Color(.42f,.66f,.61f);
            garis.AddComponent<MeshRenderer>().sharedMaterial = bahanGaris;
        }

        void OnDestroy() { if (meshGaris != null) Destroy(meshGaris); if (bahanGaris != null) Destroy(bahanGaris); }
    }
}
