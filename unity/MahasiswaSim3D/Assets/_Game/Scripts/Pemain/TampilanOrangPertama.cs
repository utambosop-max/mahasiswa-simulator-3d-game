using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Rendering;

namespace MS.Pemain
{
    /// <summary>Kamera mata dan lengan lokal. Model humanoid utuh dipulihkan saat kembali ke Kamera Atas.</summary>
    internal sealed class TampilanOrangPertama
    {
        readonly Camera kamera;
        readonly Dictionary<Renderer, bool> tersembunyi = new();
        readonly List<Renderer> rendererPemain = new();
        Transform lengan;
        Material kain, kulit;
        float yaw, pitch, cekModelBerikutnya;
        bool kursorDimiliki;
        int frameTangkapKursor = -1;

        internal TampilanOrangPertama(Camera kamera) => this.kamera = kamera;
        internal bool Aktif { get; private set; }
        internal bool BidikanAktif => Aktif && Application.isFocused && !Layanan.InputDitahan &&
            Cursor.lockState == CursorLockMode.Locked && Time.frameCount != frameTangkapKursor;

        internal void AturAktif(bool aktif, Transform pemain)
        {
            if (Aktif == aktif) return;
            Aktif = aktif;
            if (!aktif)
            {
                BebaskanKursor();
                foreach (var (renderer, semula) in tersembunyi)
                    if (renderer != null) renderer.forceRenderingOff = semula;
                tersembunyi.Clear();
                rendererPemain.Clear();
                if (lengan != null) lengan.gameObject.SetActive(false);
                return;
            }

            if (lengan == null) BuatLengan();
            if (lengan != null) lengan.gameObject.SetActive(true);
            cekModelBerikutnya = 0;
            Lompat(pemain);
        }

        internal void Lompat(Transform pemain)
        {
            yaw = pemain.eulerAngles.y;
            pitch = 4f;
            Posisi(pemain);
        }

        internal void Input(Transform pemain)
        {
            if (!Application.isFocused || Layanan.InputDitahan || Mouse.current == null)
            {
                BebaskanKursor();
                return;
            }
            if (Cursor.lockState != CursorLockMode.Locked)
            {
                kursorDimiliki = true;
                Cursor.lockState = CursorLockMode.Locked;
                Cursor.visible = false;
                frameTangkapKursor = Time.frameCount;
                return; // jangan pakai delta / klik dari frame ketika panel baru ditutup
            }
            float sensitivitas = PlayerPrefs.GetInt("SensitivitasKamera", 1) switch
            {
                0 => .08f,
                2 => .21f,
                _ => .13f
            };
            Vector2 delta = Mouse.current.delta.ReadValue() * sensitivitas;
            yaw = Mathf.Repeat(yaw + delta.x, 360f);
            pitch = Mathf.Clamp(pitch - delta.y, -82f, 82f);
            pemain.rotation = Quaternion.Euler(0, yaw, 0);
            kamera.transform.rotation = Quaternion.Euler(pitch, yaw, 0);
        }

        internal void Posisi(Transform pemain)
        {
            // Kaki adalah origin semua prefab pemain. Kamera stabil saat animasi humanoid berganti.
            float tinggi = Layanan.Kendaraan?.NaikMotor == true ? 1.25f : 1.52f;
            kamera.transform.SetPositionAndRotation(pemain.position + Vector3.up * tinggi, Quaternion.Euler(pitch, yaw, 0));
            if (Time.unscaledTime < cekModelBerikutnya) return;
            cekModelBerikutnya = Time.unscaledTime + .25f;
            pemain.GetComponentsInChildren(true, rendererPemain);
            foreach (var renderer in rendererPemain)
            {
                if (tersembunyi.ContainsKey(renderer) || BagianMotor(renderer.transform, pemain)) continue;
                tersembunyi.Add(renderer, renderer.forceRenderingOff);
                renderer.forceRenderingOff = true;
            }
        }

        static bool BagianMotor(Transform bagian, Transform pemain)
        {
            for (; bagian != pemain; bagian = bagian.parent)
                if (bagian.name == "Motor Naik") return true;
            return false;
        }

        internal void BebaskanKursor()
        {
            if (!kursorDimiliki) return;
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
            kursorDimiliki = false;
        }

        void BuatLengan()
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) return;
            kain = new Material(shader) { color = new Color(.19f, .28f, .35f) };
            kulit = new Material(shader) { color = new Color(.69f, .46f, .32f) };
            kain.SetFloat("_Smoothness", .12f);
            kulit.SetFloat("_Smoothness", .21f);
            lengan = new GameObject("Lengan orang pertama").transform;
            lengan.SetParent(kamera.transform, false);
            for (int tanda = -1; tanda <= 1; tanda += 2)
            {
                Vector3 siku = new(.36f * tanda, -.43f, .22f);
                Vector3 pergelangan = new(.25f * tanda, -.27f, .51f);
                Vector3 tangan = Vector3.Lerp(siku, pergelangan, 1.12f);
                Bagian("Lengan baju", siku, Vector3.Lerp(siku, pergelangan, .55f), .095f, kain);
                Bagian("Lengan bawah", Vector3.Lerp(siku, pergelangan, .33f), pergelangan, .070f, kulit);
                Bagian("Tangan", pergelangan, tangan, .076f, kulit);
            }
        }

        void Bagian(string nama, Vector3 awal, Vector3 akhir, float lebar, Material material)
        {
            GameObject bagian = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            bagian.name = nama;
            bagian.transform.SetParent(lengan, false);
            bagian.transform.localPosition = (awal + akhir) / 2f;
            bagian.transform.localRotation = Quaternion.FromToRotation(Vector3.up, akhir - awal);
            bagian.transform.localScale = new Vector3(lebar, (akhir - awal).magnitude / 2f + lebar / 4f, lebar);
            var collider = bagian.GetComponent<Collider>();
            collider.enabled = false;
            Object.Destroy(collider);
            var renderer = bagian.GetComponent<Renderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.Off;
        }

        internal void Lepaskan()
        {
            AturAktif(false, null);
            if (lengan != null) Object.Destroy(lengan.gameObject);
            if (kain != null) Object.Destroy(kain);
            if (kulit != null) Object.Destroy(kulit);
        }
    }
}
