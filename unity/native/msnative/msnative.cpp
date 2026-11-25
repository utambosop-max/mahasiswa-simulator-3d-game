// MsNative: contoh native plugin C++ untuk Mahasiswa Simulator 3D.
// Berisi fungsi matematika murni (tanpa alokasi, tanpa state) yang juga punya versi C# di Inti/AsliCpp.cs.
// Kalau DLL ini tidak ada (mis. di Android sebelum .so dibuat), game otomatis memakai versi C#.
//
// Aturan aman untuk plugin Unity:
//  - extern "C" agar nama fungsi tidak diacak compiler (C# mencari nama persis).
//  - Hanya tipe sederhana (int32, float, double, pointer array) → tidak perlu marshalling rumit.
//  - Tidak melempar exception keluar DLL (exception lintas C#/C++ = crash).
#include <cstdint>
#include <algorithm>
#include <cmath>

#if defined(_WIN32)
#define MS_API extern "C" __declspec(dllexport)
#else
#define MS_API extern "C" __attribute__((visibility("default")))
#endif

namespace {
constexpr std::int32_t kVersi = 1;

// Campuran bit ala MurmurHash3 (fmix32) — sama persis dengan DataFitur.CuacaHari di C#.
constexpr std::uint32_t AcakHari(std::int32_t hari) noexcept {
    std::uint32_t h = static_cast<std::uint32_t>(hari ^ static_cast<std::int32_t>(0x9e3779b9u)) * 0x85ebca6bu;
    h ^= h >> 13;
    h *= 0xc2b2ae35u;
    h ^= h >> 16;
    return h;
}
static_assert(AcakHari(3) == AcakHari(3), "deterministik");
}  // namespace

/// Versi plugin. Dipakai C# untuk mengecek DLL berhasil dimuat.
MS_API std::int32_t ms_versi() noexcept { return kVersi; }

/// Angka acak "tetap" 0..1 dari nomor hari (cuaca sama di semua HP).
MS_API double ms_cuaca_acak(std::int32_t hari) noexcept {
    return static_cast<double>(AcakHari(hari)) / 4294967296.0;
}

/// Kurva Yerkes–Dodson: hasil terbaik di stres optimum, turun bila terlalu santai/tegang.
MS_API float ms_efisiensi_stres(float stres, float optimum, float turun, float minimum) noexcept {
    const float rentang = stres < optimum ? optimum : 100.0f - optimum;
    if (rentang <= 0.0f) return 1.0f;
    const float t = (stres - optimum) / rentang;
    return std::clamp(1.0f - turun * t * t, minimum, 1.0f);
}

/// Satu hari pertumbuhan cabai (logistik): N + r·N·(1 − N) + 0,005, maksimal 1, dibulatkan 3 desimal.
MS_API float ms_cabai_tumbuh(float n, float laju) noexcept {
    const float n1 = std::min(1.0f, n + laju * n * (1.0f - n) + 0.005f);
    return std::round(n1 * 1000.0f) / 1000.0f;
}

/// Contoh fungsi "massal": hitung efisiensi stres untuk banyak nilai sekaligus (satu panggilan lintas bahasa).
/// Aman bila pointer null atau jumlah <= 0.
MS_API void ms_efisiensi_massal(const float* stres, float* hasil, std::int32_t jumlah,
                                float optimum, float turun, float minimum) noexcept {
    if (stres == nullptr || hasil == nullptr || jumlah <= 0) return;
    for (std::int32_t i = 0; i < jumlah; ++i) hasil[i] = ms_efisiensi_stres(stres[i], optimum, turun, minimum);
}
