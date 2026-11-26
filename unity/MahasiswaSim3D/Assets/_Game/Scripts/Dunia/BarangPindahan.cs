using MS.Inti;
using MS.Kontrak;
using MS.Pemain;
using UnityEngine;

namespace MS.Dunia
{
    internal sealed class BarangPindahan : MonoBehaviour
    {
        const int KardusBuku = 1;
        const int KardusPakaian = 2;
        const int Galon = 4;
        int kode;
        IPenerimaAksi aksi;

        internal static void SembunyikanSetelahDitata(GameObject titik) =>
            titik.AddComponent<BarangPindahan>();

        internal static void Pasang(Transform induk, BahanRealistis bahan)
        {
            var save = GameInti.Instans?.Simpanan;
            if (save?.tahapPindahan != 1) return;
            TitikSpawn gerbang = null;
            foreach (var t in FindObjectsByType<TitikSpawn>(FindObjectsSortMode.None))
                if (t.id == "pintuKos") { gerbang = t; break; }
            if (gerbang == null) return;
            var alas = gerbang.transform.position;
            var karton = bahan.Ambil(null, new Color(.62f, .45f, .27f), Vector2.one);
            var biru = bahan.Ambil(null, new Color(.26f, .52f, .67f), Vector2.one);
            Buat("Kardus buku", KardusBuku, alas + new Vector3(.55f, .29f, 1.0f), new Vector3(.44f, .36f, .37f), karton, PrimitiveType.Cube);
            Buat("Kardus pakaian", KardusPakaian, alas + new Vector3(1.05f, .29f, 1.02f), new Vector3(.42f, .34f, .37f), karton, PrimitiveType.Cube);
            Buat("Galon kosong", Galon, alas + new Vector3(.94f, .31f, 1.55f), new Vector3(.33f, .25f, .33f), biru, PrimitiveType.Cylinder);

            void Buat(string nama, int bit, Vector3 posisi, Vector3 ukuran, Material mat, PrimitiveType bentuk)
            {
                if ((save.barangPindahan & bit) != 0) return;
                var benda = bahan.Detail(induk, nama, induk.InverseTransformPoint(posisi), ukuran, mat, bentuk, true);
                var rb = benda.AddComponent<Rigidbody>();
                rb.mass = bit == Galon ? .7f : 3f;
                var titik = benda.AddComponent<TitikInteraksi>();
                titik.idAksi = "ambilPindahan";
                titik.target = bit.ToString(System.Globalization.CultureInfo.InvariantCulture);
                titik.nama = "Angkat " + nama.ToLowerInvariant();
                var penanda = benda.AddComponent<BarangPindahan>();
                penanda.kode = bit;
            }
        }

        void OnEnable()
        {
            aksi = Layanan.Aksi;
            if (aksi != null) aksi.AksiMulai += Dipungut;
        }

        void OnDisable()
        {
            if (aksi != null) aksi.AksiMulai -= Dipungut;
        }

        void Dipungut(string id)
        {
            if (kode == 0 && id == "tataLaptop" ||
                kode != 0 && id == "ambilPindahan" && (GameInti.Instans.Simpanan.barangPindahan & kode) != 0)
                gameObject.SetActive(false);
        }
    }
}
