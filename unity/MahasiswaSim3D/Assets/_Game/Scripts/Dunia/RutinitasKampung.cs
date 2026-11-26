using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;

namespace MS.Dunia
{
    internal sealed class RutinitasKampung : MonoBehaviour
    {
        static readonly string[] Pagi = { "kampus", "karier", "polisi", "tani" };
        static readonly string[] Siang = { "pasar", "minimarket", "warteg" };
        static readonly string[] Sore = { "warkop", "kafe", "warkop" };
        readonly List<float> lajurX = new();
        readonly List<float> lajurZ = new();
        readonly RaycastHit[] halangan = new RaycastHit[12];
        WargaJalan[] warga;
        Fase fase;
        bool tertunda, mulai;
        float siapPada;

        public void Pasang(Transform jalan)
        {
            if (jalan == null) return;
            foreach (Transform bidang in jalan)
            {
                if (bidang.name == "Jalan V") lajurX.Add(bidang.position.x);
                if (bidang.name == "Jalan H") lajurZ.Add(bidang.position.z);
            }
            warga = FindObjectsByType<WargaJalan>(FindObjectsSortMode.InstanceID);
        }

        public void AturFase(Fase waktu)
        {
            if (mulai && fase == waktu) return;
            mulai = true;
            fase = waktu;
            siapPada = Time.unscaledTime + .12f;
            tertunda = true;
        }

        void LateUpdate()
        {
            if (!tertunda || warga == null || Time.unscaledTime < siapPada) return;
            tertunda = false;
            if (lajurX.Count == 0 || lajurZ.Count == 0 || fase == Fase.Begadang) return;
            var tujuan = fase == Fase.Pagi ? Pagi : fase == Fase.Siang ? Siang : fase == Fase.Sore ? Sore : null;
            for (int i = 0; i < warga.Length; i++)
            {
                var orang = warga[i];
                if (orang == null) continue;
                var titik = tujuan != null ? GameObject.Find("Spawn keluar_" + tujuan[i % tujuan.Length]) : null;
                var akhir = titik != null ? titik.transform.position + titik.transform.right * ((i % 4 - 1.5f) * .44f) : orang.Rumah;
                var rute = Rute(orang.transform, akhir);
                if (rute != null) orang.IkutiKegiatan(rute);
            }
        }

        Vector3[] Rute(Transform orang, Vector3 tujuan)
        {
            var mulai = orang.position; mulai.y = 0;
            tujuan.y = 0;
            var (awal, mendatarAwal) = Trotoar(mulai, false);
            var (akhir, mendatarAkhir) = Trotoar(tujuan, false);
            var (alternatifAwal, _) = Trotoar(mulai, true);
            var (alternatifAkhir, _) = Trotoar(tujuan, true);
            return Sambung(mulai, awal, mendatarAwal, akhir, mendatarAkhir, tujuan, orang)
                ?? Sambung(mulai, alternatifAwal, !mendatarAwal, akhir, mendatarAkhir, tujuan, orang)
                ?? Sambung(mulai, awal, mendatarAwal, alternatifAkhir, !mendatarAkhir, tujuan, orang)
                ?? Sambung(mulai, alternatifAwal, !mendatarAwal, alternatifAkhir, !mendatarAkhir, tujuan, orang);
        }

        Vector3[] Sambung(Vector3 mulai, Vector3 awal, bool mendatarAwal, Vector3 akhir,
            bool mendatarAkhir, Vector3 tujuan, Transform orang)
        {
            var langkah = new List<Vector3>(6) { mulai };
            Tambah(awal);
            if (mendatarAwal != mendatarAkhir)
                Tambah(mendatarAwal ? new Vector3(akhir.x,0,awal.z) : new Vector3(awal.x,0,akhir.z));
            else if (mendatarAwal && Mathf.Abs(awal.z - akhir.z) > .1f)
            {
                float x = Terdekat(lajurX, (awal.x + akhir.x) * .5f) + 3.13f;
                Tambah(new Vector3(x,0,awal.z));
                Tambah(new Vector3(x,0,akhir.z));
            }
            else if (!mendatarAwal && Mathf.Abs(awal.x - akhir.x) > .1f)
            {
                float z = Terdekat(lajurZ, (awal.z + akhir.z) * .5f) + 3.13f;
                Tambah(new Vector3(awal.x,0,z));
                Tambah(new Vector3(akhir.x,0,z));
            }
            Tambah(akhir);
            Tambah(tujuan);
            if (langkah.Count < 2) return null;
            for (int i = 1; i < langkah.Count; i++)
                if (!Lewat(langkah[i - 1], langkah[i], orang)) return null;
            return langkah.ToArray();

            void Tambah(Vector3 titik)
            {
                if ((langkah[langkah.Count - 1] - titik).sqrMagnitude > .02f) langkah.Add(titik);
            }
        }

        (Vector3, bool) Trotoar(Vector3 titik, bool alternatif)
        {
            float x = Terdekat(lajurX, titik.x), z = Terdekat(lajurZ, titik.z);
            bool mendatar = (Mathf.Abs(titik.z - z) <= Mathf.Abs(titik.x - x)) != alternatif;
            const float sisi = 3.13f;
            return mendatar ? (new Vector3(titik.x,0,z + (titik.z < z ? -sisi : sisi)), true)
                : (new Vector3(x + (titik.x < x ? -sisi : sisi),0,titik.z), false);
        }

        bool Lewat(Vector3 asal, Vector3 akhir, Transform orang)
        {
            var arah = akhir - asal;
            int jumlah = Physics.RaycastNonAlloc(asal + Vector3.up*.68f, arah.normalized, halangan,
                arah.magnitude, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore);
            for (int i = 0; i < jumlah; i++)
            {
                var tabrak = halangan[i].collider;
                if (tabrak.transform.IsChildOf(orang) || tabrak.bounds.size.y < 1.6f) continue;
                if (tabrak.GetComponentInParent<WargaJalan>() == null) return false;
            }
            return true;
        }

        static float Terdekat(List<float> daftar, float posisi)
        {
            float hasil = daftar[0];
            foreach (var kandidat in daftar)
                if (Mathf.Abs(kandidat - posisi) < Mathf.Abs(hasil - posisi)) hasil = kandidat;
            return hasil;
        }
    }
}
