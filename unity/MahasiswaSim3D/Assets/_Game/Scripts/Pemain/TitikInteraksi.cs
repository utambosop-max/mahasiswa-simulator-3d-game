using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace MS.Pemain
{
    /// <summary>Penanda tempat aksi (id dari Data/aksi.json). Mendaftar sendiri ke daftar statis.</summary>
    public class TitikInteraksi : MonoBehaviour
    {
        public string idAksi;
        public string target;          // opsional
        public string nama;            // untuk teks tombol
        public float radius = 1.6f;    // web interaksi.ts: 1.4 - 1.9
        public string idAksiTambahan;  // opsional: tombol kedua (mis. kasur → rebahan)
        public string namaTambahan;
        public string targetTambahan;  // opsional: target untuk aksi tambahan (mis. id warga)

        public static readonly List<TitikInteraksi> Semua = new List<TitikInteraksi>(64);

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void DaftarPerabot()
        {
            SceneManager.sceneLoaded -= PasangGalon;
            SceneManager.sceneLoaded += PasangGalon;
        }

        static void PasangGalon(Scene scene, LoadSceneMode mode)
        {
            if (scene.name != "KamarKos") return;
            var kamar = GameObject.Find("Kamar");
            if (kamar == null) return;
            var galon = new GameObject("Titik galon");
            galon.transform.SetParent(kamar.transform, false);
            galon.transform.localPosition = new Vector3(4.15f, 0, 1.18f);
            var titik = galon.AddComponent<TitikInteraksi>();
            titik.idAksi = "minum";
            titik.nama = "Minum Air";
            titik.radius = 1.18f;
        }

        void OnEnable() { Semua.Add(this); }
        void OnDisable() { Semua.Remove(this); }

        void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(transform.position, radius);
        }
    }
}
