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
            SpawnBerikut = idSpawn;
            if (GameInti.Instans != null) SimpanMuat.Simpan(GameInti.Instans.Simpanan); // simpan dulu, jaga-jaga
            SceneManager.LoadScene(namaScene);
        }
    }
}
