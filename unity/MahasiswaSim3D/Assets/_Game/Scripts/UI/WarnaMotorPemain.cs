using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace MS.UI
{
    internal sealed class WarnaMotorPemain : MonoBehaviour
    {
        static readonly int BaseColor = Shader.PropertyToID("_BaseColor");
        static readonly int ColorId = Shader.PropertyToID("_Color");
        readonly List<(Renderer Renderer, int Slot, int Properti, MaterialPropertyBlock Awal)> target = new();
        MaterialPropertyBlock _kerja; // dibuat saat dipakai (MaterialPropertyBlock dilarang di field initializer MonoBehaviour)
        MaterialPropertyBlock kerja => _kerja ??= new MaterialPropertyBlock();
        IInfoHidup hidup;
        string warnaTerakhir;

        void Start()
        {
            foreach (var akar in SceneManager.GetActiveScene().GetRootGameObjects())
                foreach (var node in akar.GetComponentsInChildren<Transform>(true))
                    if (node.name == "Motor Saya" || node.name == "Motor Naik")
                        Simpan(node);
            if (target.Count == 0) enabled = false;
        }

        void Simpan(Transform motor)
        {
            var baru = motor.Find("Bebek visual");
            foreach (var renderer in (baru != null ? baru : motor).GetComponentsInChildren<Renderer>(true))
            {
                if (baru != null && renderer.name != "Cat") continue;
                var material = renderer.sharedMaterials;
                for (int i = 0; i < material.Length; i++)
                {
                    if (material[i] == null) continue;
                    int properti = material[i].HasProperty(BaseColor) ? BaseColor :
                        material[i].HasProperty(ColorId) ? ColorId : 0;
                    if (properti == 0) continue;
                    var awal = new MaterialPropertyBlock();
                    renderer.GetPropertyBlock(awal, i);
                    target.Add((renderer, i, properti, awal));
                }
            }
        }

        void LateUpdate()
        {
            var sekarang = Layanan.Hidup;
            if (ReferenceEquals(hidup, sekarang) && warnaTerakhir == sekarang?.WarnaMotor) return;
            hidup = sekarang;
            warnaTerakhir = hidup?.WarnaMotor;
            bool dicat = ColorUtility.TryParseHtmlString(warnaTerakhir ?? "", out var cat);
            foreach (var bagian in target)
            {
                if (bagian.Renderer == null) continue;
                if (!dicat)
                {
                    bagian.Renderer.SetPropertyBlock(bagian.Awal.isEmpty ? null : bagian.Awal, bagian.Slot);
                    continue;
                }
                bagian.Renderer.GetPropertyBlock(kerja, bagian.Slot);
                kerja.SetColor(bagian.Properti, cat);
                bagian.Renderer.SetPropertyBlock(kerja, bagian.Slot);
            }
        }
    }
}
