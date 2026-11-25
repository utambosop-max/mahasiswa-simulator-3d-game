using MS.Inti;
using UnityEngine;

namespace MS.Pemain
{
    /// <summary>Tempat pemain muncul setelah pindah scene. Saat Start, pemain dipindah ke titik yang id-nya = PindahScene.SpawnBerikut.</summary>
    public class TitikSpawn : MonoBehaviour
    {
        public string id;

        void Start()
        {
            if (string.IsNullOrEmpty(id) || id != PindahScene.SpawnBerikut) return;
            PindahScene.SpawnBerikut = null;
            var pemain = FindAnyObjectByType<GerakPemain>();
            if (pemain == null) return;
            // CharacterController harus dimatikan sebentar, kalau tidak posisi baru ditolak
            var cc = pemain.GetComponent<CharacterController>();
            if (cc != null) cc.enabled = false;
            pemain.transform.SetPositionAndRotation(transform.position, transform.rotation);
            if (cc != null) cc.enabled = true;
            var kam = FindAnyObjectByType<KameraIsometric>();
            if (kam != null) kam.Lompat();
        }
    }
}
