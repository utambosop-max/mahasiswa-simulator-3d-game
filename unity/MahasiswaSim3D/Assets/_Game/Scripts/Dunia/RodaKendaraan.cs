using UnityEngine;

namespace MS.Dunia
{
    internal sealed class RodaKendaraan : MonoBehaviour
    {
        readonly System.Collections.Generic.List<Transform> roda = new();
        float radius;
        Vector3 posisiLalu;

        public void Siapkan(float radius = .235f)
        {
            this.radius = radius;
            roda.Clear();
            foreach (var bagian in GetComponentsInChildren<Transform>(true))
                if (bagian.name.StartsWith("Roda_", System.StringComparison.Ordinal)) roda.Add(bagian);
        }

        void OnEnable() => posisiLalu = transform.position;

        void LateUpdate()
        {
            var delta = transform.position - posisiLalu;
            posisiLalu = transform.position;
            float jarak = Vector3.Dot(delta, transform.forward);
            if (Mathf.Abs(jarak) < .00001f || Mathf.Abs(jarak) > 2f) return;
            foreach (var ban in roda)
                ban.Rotate(Vector3.right, -jarak / radius * Mathf.Rad2Deg, Space.Self);
        }
    }
}
