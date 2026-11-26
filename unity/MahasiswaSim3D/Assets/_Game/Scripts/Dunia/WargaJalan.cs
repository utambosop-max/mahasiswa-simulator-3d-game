// Warga bernama yang berjalan di jalur tetap (data web: NPC_JALUR di src/game/duniaLayout.ts).
// 2 titik = bolak-balik, >= 3 titik = putaran (loop). Berhenti & menoleh bila pemain dekat,
// sesekali istirahat di ujung jalur, dan "pulang" (anak-anaknya disembunyikan) saat fase Begadang.
using MS.Kontrak;
using UnityEngine;

namespace MS.Dunia
{
    public class WargaJalan : MonoBehaviour
    {
        [Tooltip("Titik jalur dalam koordinat dunia (y diabaikan, dipakai y = 0).")]
        public Vector3[] jalur;
        public float kecepatan = 1.3f;

        [Header("Warna baju (diterapkan saat Start lewat MaterialPropertyBlock)")]
        public Renderer[] rendererBaju;
        public Color warnaBaju = Color.white;

        const float JarakSapa = 2.5f;        // pemain sedekat ini → warga berhenti & menoleh
        const float JarakLanjut = 3.0f;      // sedikit lebih jauh agar tidak berhenti-jalan bergantian (histeresis)
        const float TinggiBobbing = 0.04f;   // naik-turun maksimal saat berjalan
        const float KecepatanPutar = 8f;

        Transform pemain;
        float timerCariPemain;
        int tujuan = 1;          // indeks titik yang sedang dituju
        int arahPingPong = 1;    // +1 / -1 untuk jalur 2 titik
        float timerJeda;         // > 0 = sedang istirahat di ujung jalur
        bool menyapa;
        bool tersembunyi;
        float faseLangkah;
        Vector3 posisiDatar;     // posisi di jalur tanpa bobbing
        Vector3[] perjalanan;
        int langkahKegiatan;
        internal bool SedangBerkegiatan => perjalanan != null;
        internal Vector3 Rumah => jalur != null && jalur.Length > 0 ? jalur[0] : transform.position;

        internal void IkutiKegiatan(Vector3[] rute)
        {
            perjalanan = rute;
            langkahKegiatan = 1;
        }

        internal void ReaksiKlakson(Vector3 posisiPemain)
        {
            Vector3 arah = posisiPemain - transform.position;
            arah.y = 0;
            if (arah.sqrMagnitude > .01f) transform.rotation = Quaternion.LookRotation(arah);
            timerJeda = Mathf.Max(timerJeda, .65f);
        }

        void Start()
        {
            TerapkanWarnaBaju();
            CariPemain();
            if (jalur == null || jalur.Length == 0) { posisiDatar = transform.position; return; }

            // Mulai di titik acak sepanjang jalur agar warga tidak tampak "baru di-spawn" bersamaan
            if (jalur.Length >= 2)
            {
                int ruas = jalur.Length == 2 ? 0 : Random.Range(0, jalur.Length);
                int ke = (ruas + 1) % jalur.Length;
                posisiDatar = Vector3.Lerp(Datar(jalur[ruas]), Datar(jalur[ke]), Random.value);
                tujuan = ke;
            }
            else posisiDatar = Datar(jalur[0]);
            transform.position = posisiDatar;
        }

        void TerapkanWarnaBaju()
        {
            if (rendererBaju == null || rendererBaju.Length == 0) return;
            var blok = new MaterialPropertyBlock(); // sekali saja di Start, bukan di Update
            blok.SetColor("_BaseColor", warnaBaju);
            for (int i = 0; i < rendererBaju.Length; i++)
                if (rendererBaju[i] != null) rendererBaju[i].SetPropertyBlock(blok);
        }

        void CariPemain()
        {
            var go = GameObject.FindWithTag("Player");
            if (go == null) go = GameObject.Find("Pemain");
            if (go != null) pemain = go.transform;
        }

        void Update()
        {
            // --- Malam begadang: warga sudah pulang ---
            var jam = Layanan.Jam;
            bool harusSembunyi = jam != null && jam.Fase == Fase.Begadang;
            if (harusSembunyi != tersembunyi) AturTampil(!harusSembunyi);
            if (tersembunyi) return;

            float dt = Time.deltaTime;

            // Pemain belum ketemu (mis. dimuat belakangan) → coba lagi tiap 2 detik, bukan tiap frame
            if (pemain == null)
            {
                timerCariPemain -= dt;
                if (timerCariPemain <= 0f) { timerCariPemain = 2f; CariPemain(); }
            }

            // --- Pemain dekat: berhenti & menoleh ---
            if (pemain != null)
            {
                Vector3 kePemain = pemain.position - posisiDatar; kePemain.y = 0f;
                float jarak2 = kePemain.sqrMagnitude;
                if (menyapa) menyapa = jarak2 < JarakLanjut * JarakLanjut;
                else menyapa = jarak2 < JarakSapa * JarakSapa;
                if (menyapa)
                {
                    Hadap(kePemain, dt);
                    Diam(dt);
                    return;
                }
            }

            if (perjalanan != null && langkahKegiatan >= perjalanan.Length) { Diam(dt); return; }
            if (perjalanan == null && (jalur == null || jalur.Length < 2)) { Diam(dt); return; }

            // --- Istirahat sebentar di ujung jalur ---
            if (timerJeda > 0f) { timerJeda -= dt; Diam(dt); return; }

            // --- Berjalan ke titik tujuan ---
            Vector3 target = Datar(perjalanan != null ? perjalanan[langkahKegiatan] : jalur[tujuan]);
            Vector3 arah = target - posisiDatar;
            float langkah = kecepatan * dt;
            if (arah.sqrMagnitude <= langkah * langkah)
            {
                posisiDatar = target;
                if (perjalanan != null) langkahKegiatan++;
                else TitikBerikutnya();
            }
            else
            {
                posisiDatar += arah.normalized * langkah;
                Hadap(arah, dt);
            }

            // Bobbing: ayunan kecil seirama langkah (|sin| = dua pantulan per siklus)
            faseLangkah += dt * kecepatan * 5f;
            if (faseLangkah > Mathf.PI * 2f) faseLangkah -= Mathf.PI * 2f;
            transform.position = posisiDatar + Vector3.up * (Mathf.Abs(Mathf.Sin(faseLangkah)) * TinggiBobbing);
        }

        void TitikBerikutnya()
        {
            if (jalur.Length == 2)
            {
                // Bolak-balik: setiap sampai di ujung, 50% kemungkinan istirahat 1–3 detik
                if (Random.value < 0.5f) timerJeda = Random.Range(1f, 3f);
                if (tujuan + arahPingPong > 1 || tujuan + arahPingPong < 0) arahPingPong = -arahPingPong;
                tujuan += arahPingPong;
            }
            else
            {
                // Putaran: istirahat hanya saat kembali ke titik awal (ujung satu putaran), 60% kemungkinan
                if (tujuan == 0 && Random.value < 0.6f) timerJeda = Random.Range(1f, 3f);
                tujuan = (tujuan + 1) % jalur.Length;
            }
        }

        // Turunkan bobbing perlahan ke tanah saat diam
        void Diam(float dt)
        {
            faseLangkah = 0f;
            Vector3 p = transform.position;
            p.x = posisiDatar.x; p.z = posisiDatar.z;
            p.y = Mathf.MoveTowards(p.y, posisiDatar.y, dt * 0.3f);
            transform.position = p;
        }

        void Hadap(Vector3 arah, float dt)
        {
            arah.y = 0f;
            if (arah.sqrMagnitude < 0.0001f) return;
            var rotTarget = Quaternion.LookRotation(arah);
            transform.rotation = Quaternion.Slerp(transform.rotation, rotTarget, 1f - Mathf.Exp(-KecepatanPutar * dt));
        }

        // Sembunyikan/tampilkan anak saja (diri sendiri tetap aktif agar Update terus memantau fase)
        void AturTampil(bool tampil)
        {
            tersembunyi = !tampil;
            for (int i = 0; i < transform.childCount; i++)
            {
                var bagian = transform.GetChild(i);
                if (bagian.name == "Payung cuaca")
                {
                    if (!tampil) bagian.gameObject.SetActive(false);
                    continue;
                }
                bagian.gameObject.SetActive(tampil);
            }
            var kol = GetComponent<Collider>();
            if (kol != null) kol.enabled = tampil;
        }

        static Vector3 Datar(Vector3 v) { v.y = 0f; return v; }

        void OnDrawGizmosSelected()
        {
            if (jalur == null || jalur.Length < 2) return;
            Gizmos.color = Color.cyan;
            for (int i = 0; i < jalur.Length; i++)
            {
                if (jalur.Length == 2 && i == 1) break;
                Gizmos.DrawLine(jalur[i], jalur[(i + 1) % jalur.Length]);
            }
        }
    }
}
