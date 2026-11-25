// Menampilkan model perabot sesuai level upgrade (anak ke-0 = Lv1, ke-1 = Lv2, ...).
using MS.Kontrak;
using UnityEngine;

namespace MS.Dunia
{
    public class ModelPerLevel : MonoBehaviour
    {
        public string idPerabot = "kasur";
        [Tooltip("Model per level, urut Lv1..Lv3. Boleh kosong (mis. dekorasi Lv1 = tidak ada apa-apa).")]
        public GameObject[] perLevel = new GameObject[3];

        IUpgradeKamar upgrade;

        void OnEnable() { Sambung(); Terapkan(); }
        void Start() { Sambung(); Terapkan(); } // Layanan bisa baru terisi setelah OnEnable
        void OnDisable() { if (upgrade != null) upgrade.Berubah -= Terapkan; upgrade = null; }

        void Sambung()
        {
            if (upgrade != null || Layanan.Upgrade == null) return;
            upgrade = Layanan.Upgrade;
            upgrade.Berubah += Terapkan;
        }

        void Terapkan()
        {
            int lv = upgrade != null ? upgrade.Level(idPerabot) : 1;
            for (int i = 0; i < perLevel.Length; i++)
                if (perLevel[i] != null) perLevel[i].SetActive(i == lv - 1);
        }
    }
}
