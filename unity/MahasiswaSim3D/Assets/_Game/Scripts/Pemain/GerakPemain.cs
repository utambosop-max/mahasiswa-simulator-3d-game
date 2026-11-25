using UnityEngine;

namespace MS.Pemain
{
    /// <summary>Jalan kaki: gerak relatif kamera, rotasi halus, gravitasi sederhana.</summary>
    [RequireComponent(typeof(CharacterController), typeof(InputPemain))]
    public class GerakPemain : MonoBehaviour
    {
        // Angka dari web (Player.tsx KECEPATAN_JALAN, balance.json). TODO: baca dari Data JSON via MS.Inti.
        [SerializeField] float kecepatanJalan = 3.2f;     // m/s
        [SerializeField] float pengaliLemas = 0.6f;       // balance.json pengali.kecepatanSaatLemas
        [SerializeField] float ambangEnergiLemas = 20f;   // TODO: samakan dengan balance.json ambang.energiLemas
        [SerializeField] float lajuPutar = 12f;           // sama dengan web: dt * 12
        [SerializeField] float gravitasi = -20f;
        [SerializeField] Transform kamera;                // kosong = Camera.main

        CharacterController _cc;
        InputPemain _input;
        float _vy;

        /// <summary>Untuk animasi (parameter Animator "Kecepatan").</summary>
        public float KecepatanSaatIni { get; private set; }

        void Awake()
        {
            _cc = GetComponent<CharacterController>();
            _input = GetComponent<InputPemain>();
            if (kamera == null && Camera.main != null) kamera = Camera.main.transform;
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
            Vector3 v = arah * (kecepatanJalan * lemas * (hidup != null ? hidup.PengaliKecepatan : 1f));
            if (motor) hidup.Tempuh(v.magnitude * dt); // bensin berkurang sesuai jarak
            KecepatanSaatIni = v.magnitude;

            // Gravitasi sederhana: tempel ke lantai saat menapak
            if (_cc.isGrounded && _vy < 0f) _vy = -2f;
            _vy += gravitasi * dt;
            v.y = _vy;
            _cc.Move(v * dt);

            // Putar halus menghadap arah gerak
            if (arah.sqrMagnitude > 0.0001f)
            {
                Quaternion tuju = Quaternion.LookRotation(arah, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, tuju, Mathf.Min(1f, dt * lajuPutar));
            }
        }
    }
}
