// Visual motor: saat naik, motor parkir disembunyikan & model motor menempel di bawah pemain.
// Saat turun, motor parkir dipindah ke posisi pemain. Kecepatan & bensin diatur GerakPemain lewat Kehidupan.
using MS.Inti;
using UnityEngine;

namespace MS.Pemain
{
    public class MotorPemain : MonoBehaviour
    {
        [Tooltip("Motor yang diparkir di dunia (punya TitikInteraksi naikMotor).")] public GameObject motorParkir;
        [Tooltip("Model motor yang ikut pemain saat dinaiki (anak pemain).")] public GameObject motorNaik;

        Kehidupan hidup;

        void Start()
        {
            hidup = GameInti.Instans != null ? GameInti.Instans.Hidup : null;
            if (hidup != null) hidup.Berubah += Terapkan;
            Terapkan();
        }

        void OnDestroy() { if (hidup != null) hidup.Berubah -= Terapkan; }

        bool tadiNaik;
        void Terapkan()
        {
            bool naik = hidup != null && hidup.NaikMotor;
            if (tadiNaik && !naik && motorParkir != null)
            {
                // Parkir di samping kanan pemain, menghadap arah yang sama
                motorParkir.transform.SetPositionAndRotation(transform.position + transform.right * 0.9f, transform.rotation);
            }
            if (motorParkir != null) motorParkir.SetActive(!naik);
            if (motorNaik != null) motorNaik.SetActive(naik);
            tadiNaik = naik;
        }
    }
}
