using UnityEngine;

namespace MS.Dunia
{
    internal sealed class RodaKendaraan : MonoBehaviour
    {
        Transform depan, belakang;
        Vector3 posisiLalu;

        public void Siapkan()
        {
            foreach (var bagian in GetComponentsInChildren<Transform>(true))
            {
                if (bagian.name == "Roda_Depan") depan = bagian;
                if (bagian.name == "Roda_Belakang") belakang = bagian;
            }
        }

        void OnEnable() => posisiLalu = transform.position;

        void LateUpdate()
        {
            var delta = transform.position - posisiLalu;
            posisiLalu = transform.position;
            float jarak = Vector3.Dot(delta, transform.forward);
            if (Mathf.Abs(jarak) < .00001f || Mathf.Abs(jarak) > 2f) return;
            if (depan != null) depan.Rotate(Vector3.right, -jarak / .27f * Mathf.Rad2Deg, Space.Self);
            if (belakang != null) belakang.Rotate(Vector3.right, -jarak / .265f * Mathf.Rad2Deg, Space.Self);
        }
    }
}
