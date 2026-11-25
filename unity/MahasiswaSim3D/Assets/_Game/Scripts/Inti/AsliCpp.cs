// Jembatan ke plugin C++ (MsNative.dll, sumber di unity/native/msnative/msnative.cpp).
// Setiap fungsi punya cadangan C# yang hasilnya SAMA, jadi game tetap jalan bila DLL tidak ada
// (mis. Android sebelum versi .so dibuat). Tes TesAsliCpp membandingkan keduanya.
using System;
using System.Runtime.InteropServices;
using UnityEngine;

namespace MS.Inti
{
    public static class AsliCpp
    {
        const string Dll = "MsNative";

        [DllImport(Dll)] static extern int ms_versi();
        [DllImport(Dll)] static extern double ms_cuaca_acak(int hari);
        [DllImport(Dll)] static extern float ms_efisiensi_stres(float stres, float optimum, float turun, float minimum);
        [DllImport(Dll)] static extern float ms_cabai_tumbuh(float n, float laju);

        static int status; // 0 = belum dicek, 1 = ada, −1 = tidak ada
        /// <summary>Paksa pakai C# (dipakai tes untuk membandingkan).</summary>
        public static bool MatikanCpp;

        /// <summary>True bila MsNative.dll berhasil dimuat.</summary>
        public static bool Ada
        {
            get
            {
                if (MatikanCpp) return false;
                if (status == 0)
                {
                    try { status = ms_versi() >= 1 ? 1 : -1; }
                    catch (Exception e) when (e is DllNotFoundException || e is EntryPointNotFoundException || e is BadImageFormatException)
                    { status = -1; }
                    Debug.Log(status > 0 ? "[Inti] Plugin C++ MsNative aktif." : "[Inti] Plugin C++ tidak ada, pakai C#.");
                }
                return status > 0;
            }
        }

        /// <summary>Angka acak tetap 0..1 dari nomor hari (cuaca).</summary>
        public static double CuacaAcak(int hari) => Ada ? ms_cuaca_acak(hari) : CuacaAcakCs(hari);
        public static double CuacaAcakCs(int hari)
        {
            uint h = unchecked((uint)(hari ^ unchecked((int)0x9e3779b9)) * 0x85ebca6bu);
            h ^= h >> 13;
            h = unchecked(h * 0xc2b2ae35u);
            h ^= h >> 16;
            return h / 4294967296.0;
        }

        public static float EfisiensiStres(float stres, float optimum, float turun, float minimum) =>
            Ada ? ms_efisiensi_stres(stres, optimum, turun, minimum) : EfisiensiStresCs(stres, optimum, turun, minimum);
        public static float EfisiensiStresCs(float stres, float optimum, float turun, float minimum)
        {
            float rentang = stres < optimum ? optimum : 100f - optimum;
            if (rentang <= 0f) return 1f;
            float t = (stres - optimum) / rentang;
            return Mathf.Clamp(1f - turun * t * t, minimum, 1f);
        }

        public static float CabaiTumbuh(float n, float laju) => Ada ? ms_cabai_tumbuh(n, laju) : CabaiTumbuhCs(n, laju);
        public static float CabaiTumbuhCs(float n, float laju)
        {
            float n1 = Mathf.Min(1f, n + laju * n * (1f - n) + 0.005f);
            return Mathf.Round(n1 * 1000f) / 1000f;
        }
    }
}
