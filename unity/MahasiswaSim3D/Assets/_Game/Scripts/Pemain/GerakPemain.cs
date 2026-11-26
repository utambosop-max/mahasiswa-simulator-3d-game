using System.Collections.Generic;
using UnityEngine;

namespace MS.Pemain
{
    /// <summary>Jalan kaki: gerak relatif kamera, rotasi halus, gravitasi sederhana.</summary>
    [RequireComponent(typeof(CharacterController), typeof(InputPemain))]
    public class GerakPemain : MonoBehaviour
    {
        // Angka dari web (Player.tsx KECEPATAN_JALAN, balance.json). TODO: baca dari Data JSON via MS.Inti.
        [SerializeField] float kecepatanJalan = 3.2f;     // m/s
        public static float PengaliMedan { get; set; } = 1f;
        [SerializeField] float pengaliLari = 1.5f;
        [SerializeField] float pengaliLemas = 0.6f;       // balance.json pengali.kecepatanSaatLemas
        [SerializeField] float ambangEnergiLemas = 20f;   // TODO: samakan dengan balance.json ambang.energiLemas
        [SerializeField] float lajuPutar = 12f;           // sama dengan web: dt * 12
        [SerializeField] float gravitasi = -20f;
        [SerializeField] Transform kamera;                // kosong = Camera.main

        CharacterController _cc;
        InputPemain _input;
        KameraIsometric _kamera;
        float _vy;
        float jarakLangkah;
        readonly List<Bounds> jalan = new();
        readonly List<Bounds> paving = new();

        /// <summary>Untuk animasi (parameter Animator "Kecepatan").</summary>
        public float KecepatanSaatIni { get; private set; }

        void Awake()
        {
            _cc = GetComponent<CharacterController>();
            _input = GetComponent<InputPemain>();
            if (kamera == null && Camera.main != null) kamera = Camera.main.transform;
            if (kamera != null) _kamera = kamera.GetComponent<KameraIsometric>();
            var kampung = GameObject.Find("Tanah & Jalan");
            if (kampung == null) return;
            foreach (Transform bidang in kampung.transform)
            {
                if (!bidang.TryGetComponent<Renderer>(out var permukaan)) continue;
                if (bidang.name.StartsWith("Jalan ")) jalan.Add(permukaan.bounds);
                else if (bidang.name.StartsWith("Trotoar") || bidang.name == "Gang" || bidang.name == "Jalur Tepi Sungai")
                    paving.Add(permukaan.bounds);
            }
        }

        void Update()
        {
            float dt = Time.deltaTime;
            Vector2 g = _input.Gerak;

            // Arah maju/kanan kamera diratakan ke lantai
            Vector3 maju = Vector3.forward, kanan = Vector3.right;
            if (kamera != null)
            {
                maju = kamera.forward; maju.y = 0f; maju.Normalize();
                kanan = kamera.right; kanan.y = 0f; kanan.Normalize();
            }
            Vector3 arah = kanan * g.x + maju * g.y;

            var stat = MS.Kontrak.Layanan.Stat;
            float lemas = (stat != null && stat.Energi < ambangEnergiLemas) ? pengaliLemas : 1f;
            var hidup = MS.Inti.GameInti.Instans != null ? MS.Inti.GameInti.Instans.Hidup : null;
            bool motor = hidup != null && hidup.NaikMotor;
            if (motor) lemas = 1f; // motor tidak terpengaruh lemas
            else if (_input.Lari) lemas *= pengaliLari;
            Vector3 v = arah * (kecepatanJalan * lemas * PengaliMedan * (hidup != null ? hidup.PengaliKecepatan : 1f));
            if (motor) hidup.Tempuh(v.magnitude * dt); // bensin berkurang sesuai jarak
            KecepatanSaatIni = v.magnitude;

            // Gravitasi sederhana: tempel ke lantai saat menapak
            if (_cc.isGrounded && _vy < 0f) _vy = -2f;
            _vy += gravitasi * dt;
            v.y = _vy;
            Vector3 asal = transform.position;
            _cc.Move(v * dt);
            if (motor) jarakLangkah = 0;
            else if (_cc.isGrounded)
            {
                var perpindahan = transform.position - asal;
                perpindahan.y = 0;
                jarakLangkah += perpindahan.magnitude;
                if (jarakLangkah >= .85f)
                {
                    jarakLangkah -= .85f;
                    MS.Kontrak.Layanan.Audio?.Mainkan(SuaraLangkah());
                }
            }

            // Putar halus menghadap arah gerak
            if (_kamera?.OrangPertama != true && arah.sqrMagnitude > 0.0001f)
            {
                Quaternion tuju = Quaternion.LookRotation(arah, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, tuju, Mathf.Min(1f, dt * lajuPutar));
            }
        }

        string SuaraLangkah()
        {
            if (!Physics.Raycast(transform.position + Vector3.up * .13f, Vector3.down, out var lantai,
                .38f, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore)) return "langkah";
            var bidang = lantai.collider;
            string nama = bidang.name;
            if (nama == "Tanah")
            {
                // Aspal dan trotoar adalah bidang visual. Keduanya memakai kolider Tanah.
                var posisi = transform.position;
                if (DiBidang(jalan, posisi)) return "langkahAspal";
                return DiBidang(paving, posisi) ? "langkahPaving" : "langkahRumput";
            }
            if (nama.Contains("Got")) return "langkahPaving";
            var bahan = bidang.GetComponent<Renderer>()?.sharedMaterial?.name;
            return bahan != null && (bahan.Contains("oak") || bahan.Contains("wood"))
                ? "langkahKayu" : "langkahKeramik";
        }

        static bool DiBidang(List<Bounds> daftar, Vector3 posisi)
        {
            foreach (var batas in daftar)
                if (batas.Contains(new Vector3(posisi.x, batas.center.y, posisi.z))) return true;
            return false;
        }
    }
}
