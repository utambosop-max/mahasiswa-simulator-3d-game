using UnityEngine;
using UnityEngine.SceneManagement;

namespace MS.Dunia
{
    internal static class KendaraanKampung
    {
        public static void Pasang(Scene scene, Transform prop, BahanRealistis bahan)
        {
            const string atlas = "Kendaraan/atlas";
            var umum = bahan.Ambil(atlas, Color.white, Vector2.one);
            var merah = bahan.Ambil(atlas, new Color(.54f, .17f, .12f), Vector2.one);
            var hijau = bahan.Ambil(atlas, new Color(.28f, .53f, .45f), Vector2.one);
            var krem = bahan.Ambil(atlas, new Color(.67f, .48f, .31f), Vector2.one);
            var asetMotor = Resources.Load<GameObject>("Kendaraan/motor_bebek/motor_bebek");
            if (asetMotor != null)
            {
                foreach (var akar in scene.GetRootGameObjects())
                    foreach (var motor in akar.GetComponentsInChildren<Transform>(true))
                    {
                        if (motor.name != "Motor Saya" && motor.name != "Motor Naik" &&
                            motor.name != "prop_motor" && motor.name != "Motor Parkir") continue;
                        var visual = Ganti(motor, asetMotor, "Bebek visual", umum, merah);
                        if (motor.name == "Motor Naik") visual.AddComponent<RodaKendaraan>().Siapkan();
                    }
            }

            var gerobak = prop.Find("prop_gerobak");
            var asetGerobak = Resources.Load<GameObject>("Kendaraan/gerobak/gerobak");
            if (gerobak != null && asetGerobak != null) Ganti(gerobak, asetGerobak, "Gerobak kayu", umum, krem);

            var halte = prop.Find("Halte Barat");
            var asetAngkot = Resources.Load<GameObject>("Kendaraan/angkot/angkot");
            if (halte == null || asetAngkot == null) return;
            var angkot = new GameObject("Angkot Halte Barat").transform;
            angkot.SetParent(prop, false);
            angkot.SetPositionAndRotation(halte.position + halte.right * 3.1f + halte.forward * 1.3f,
                halte.rotation * Quaternion.Euler(0, 90, 0));
            Ganti(angkot, asetAngkot, "Angkot visual", umum, hijau);
        }

        static GameObject Ganti(Transform posisi, GameObject aset, string nama, Material umum, Material cat)
        {
            var sebelumnya = posisi.GetComponentsInChildren<MeshRenderer>(true);
            var model = Object.Instantiate(aset, posisi);
            model.name = nama;
            model.transform.SetLocalPositionAndRotation(Vector3.zero, Quaternion.identity);
            foreach (var renderer in model.GetComponentsInChildren<MeshRenderer>(true))
                renderer.sharedMaterial = renderer.name == "Cat" ? cat : umum;
            foreach (var renderer in sebelumnya) renderer.enabled = false;
            return model;
        }
    }
}
