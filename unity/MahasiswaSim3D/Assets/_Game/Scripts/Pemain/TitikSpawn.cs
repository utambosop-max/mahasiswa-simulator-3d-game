using MS.Inti;
using UnityEngine;

namespace MS.Pemain
{
    /// <summary>Tempat pemain muncul setelah pindah scene. Saat Start, pemain dipindah ke titik yang id-nya = PindahScene.SpawnBerikut.</summary>
    public class TitikSpawn : MonoBehaviour
    {
        public string id;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void DaftarPindahDiScene() => PindahScene.PindahDiScene = CariDanPindah;

        static bool CariDanPindah(string id)
        {
            if (string.IsNullOrEmpty(id)) return false;
            var scene = UnityEngine.SceneManagement.SceneManager.GetActiveScene();
            foreach (var calon in FindObjectsByType<TitikSpawn>(FindObjectsSortMode.None))
                if (calon.id == id && calon.gameObject.scene == scene && calon.PindahkanPemain())
                    return true;
            return false;
        }

        void Start()
        {
            if (string.IsNullOrEmpty(id) || id != PindahScene.SpawnBerikut) return;
            if (PindahkanPemain()) PindahScene.SpawnBerikut = null;
        }

        bool PindahkanPemain()
        {
            var pemain = FindAnyObjectByType<GerakPemain>();
            if (pemain == null) return false;
            // CharacterController harus dimatikan sebentar, kalau tidak posisi baru ditolak
            var cc = pemain.GetComponent<CharacterController>();
            if (cc != null) cc.enabled = false;
            pemain.transform.SetPositionAndRotation(transform.position, transform.rotation);
            if (cc != null) cc.enabled = true;
            var kam = FindAnyObjectByType<KameraIsometric>();
            if (kam != null) kam.Lompat();
            return true;
        }
    }
}
