using System.Collections;
using MS.Kontrak;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace MS.Inti
{
    /// <summary>Pindah antar-scene (Kamar ↔ Kampung). GameInti ikut terbawa (DontDestroyOnLoad), jadi stat & jam tidak hilang.</summary>
    public static class PindahScene
    {
        /// <summary>Id TitikSpawn tempat pemain muncul di scene berikutnya (dibaca MS.Pemain saat Start).</summary>
        public static string SpawnBerikut;

        public static void Ke(string namaScene, string idSpawn)
        {
            if (Layanan.SedangPindahScene) return;
            if (!Application.CanStreamedLevelBeLoaded(namaScene))
            {
                GameInti.Instans?.Aksi?.Umumkan("Tempat ini belum bisa dibuka.");
                return;
            }
            SpawnBerikut = idSpawn;
            var game = GameInti.Instans;
            if (game != null) SimpanMuat.Simpan(game.Simpanan);
            if (game == null || !Application.isPlaying) SceneManager.LoadScene(namaScene);
            else
            {
                Layanan.SedangPindahScene = true;
                game.StartCoroutine(Pindah(namaScene));
            }
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void AturUlang()
        {
            Layanan.SedangPindahScene = false;
            SpawnBerikut = null;
        }

        static IEnumerator Pindah(string namaScene)
        {
            try
            {
                yield return new WaitForSecondsRealtime(.23f);
                yield return SceneManager.LoadSceneAsync(namaScene);
            }
            finally
            {
                Layanan.SedangPindahScene = false;
            }
        }
    }
}
