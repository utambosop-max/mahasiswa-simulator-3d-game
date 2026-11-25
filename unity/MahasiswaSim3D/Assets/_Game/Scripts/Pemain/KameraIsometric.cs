using UnityEngine;
using UnityEngine.InputSystem;

namespace MS.Pemain
{
    /// <summary>Kamera atas-miring mengikuti pemain (SmoothDamp). Q/R putar 45 derajat seperti web (KontrolKamera.tsx).</summary>
    public class KameraIsometric : MonoBehaviour
    {
        [SerializeField] Transform target;
        [SerializeField] float jarakDatar = 9f;    // TODO: samakan dengan offset kamera web (k.cam)
        [SerializeField] float tinggi = 9f;
        [SerializeField] float tinggiLihat = 0.8f; // web: lookAt y = 0.8
        [SerializeField] float waktuHalus = 0.25f;
        [SerializeField] float langkahPutar = 45f;
        [SerializeField] float waktuPutar = 0.2f;

        Vector3 _vel;
        float _sudut, _sudutTuju, _velSudut;
        float _jarakKini = -1f, _velJarak;
        readonly RaycastHit[] penghalang = new RaycastHit[16];
        static readonly float[] SudutAlternatif = { 45f, -45f, 90f, -90f, 135f, -135f, 180f };

        public void Putar(float derajat) { _sudutTuju += derajat; }
        public void PutarKiri() { Putar(-langkahPutar); }
        public void PutarKanan() { Putar(langkahPutar); }
        public void SetTarget(Transform t) { target = t; Lompat(); }

        void Start() { Lompat(); }

        /// <summary>Langsung pindah tanpa halus (spawn/teleport).</summary>
        public void Lompat()
        {
            if (target == null) return;
            _vel = Vector3.zero;
            _velSudut = 0;
            Vector3 fokus = target.position + Vector3.up * tinggiLihat;
            Vector3 posisi = HitungPosisi(_sudutTuju);
            float jarak = JarakBebas(fokus, posisi);
            if (jarak < Vector3.Distance(fokus, posisi))
            {
                float awal = _sudutTuju;
                foreach (float selisih in SudutAlternatif)
                {
                    float sudut = awal + selisih;
                    Vector3 kandidat = HitungPosisi(sudut);
                    float bebas = JarakBebas(fokus, kandidat);
                    if (bebas > jarak)
                    {
                        posisi = kandidat;
                        jarak = bebas;
                        _sudutTuju = sudut;
                    }
                    if (bebas >= Vector3.Distance(fokus, kandidat)) break;
                }
            }
            _sudut = _sudutTuju;
            _jarakKini = jarak; _velJarak = 0;
            transform.position = fokus + (posisi - fokus).normalized * jarak;
            transform.LookAt(fokus);
        }

        Vector3 HitungPosisi(float sudut)
        {
            float r = sudut * Mathf.Deg2Rad;
            return target.position + new Vector3(Mathf.Sin(r) * jarakDatar, tinggi, Mathf.Cos(r) * jarakDatar);
        }

        float JarakBebas(Vector3 fokus, Vector3 posisi)
        {
            Vector3 arah = posisi - fokus;
            float jarak = arah.magnitude;
            if (jarak < .01f) return jarak;
            int jumlah = Physics.SphereCastNonAlloc(fokus, .18f, arah / jarak, penghalang,
                jarak, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore);
            for (int i = 0; i < jumlah; i++)
            {
                var hit = penghalang[i];
                if (hit.transform.IsChildOf(target)) continue;
                jarak = Mathf.Min(jarak, Mathf.Max(.05f, hit.distance - .12f));
            }
            return jarak;
        }

        void LateUpdate()
        {
            var kb = Keyboard.current;
            if (kb != null)
            {
                if (kb.qKey.wasPressedThisFrame) PutarKiri();
                if (kb.rKey.wasPressedThisFrame) PutarKanan();
            }
            if (target == null) return;
            _sudut = Mathf.SmoothDampAngle(_sudut, _sudutTuju, ref _velSudut, waktuPutar);
            Vector3 fokus = target.position + Vector3.up * tinggiLihat;
            Vector3 posisi = Vector3.SmoothDamp(transform.position, HitungPosisi(_sudut), ref _vel, waktuHalus);
            // Jarak kamera dihaluskan: maju cepat (agar tidak tembus dinding), mundur pelan.
            // Sebelumnya kamera melompat maju-mundur tiap frame saat lewat tiang/pohon -> layar berkedip.
            float penuh = Vector3.Distance(fokus, posisi);
            float bebas = JarakBebas(fokus, posisi);
            if (_jarakKini <= 0f) _jarakKini = bebas;
            float waktu = bebas < _jarakKini ? 0.06f : 0.45f;
            _jarakKini = Mathf.SmoothDamp(_jarakKini, bebas, ref _velJarak, waktu);
            _jarakKini = Mathf.Min(_jarakKini, penuh);
            if (_jarakKini < penuh - 0.01f) posisi = fokus + (posisi - fokus) / penuh * _jarakKini;
            transform.position = posisi;
            transform.LookAt(fokus);
        }
    }
}
