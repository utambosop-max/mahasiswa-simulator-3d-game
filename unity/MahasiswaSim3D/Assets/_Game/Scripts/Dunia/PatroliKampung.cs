using UnityEngine;

namespace MS.Dunia
{
    internal sealed class PatroliKampung : MonoBehaviour
    {
        Vector3[] jalur;
        float laju, tinggi, ayun, jeda;
        int tujuan;
        bool hewan;

        public void Pasang(Vector3[] titik, float laju, bool hewan)
        {
            if (titik == null || titik.Length < 2) return;
            jalur = titik;
            this.laju = laju;
            this.hewan = hewan;
            tinggi = titik[0].y;
            tujuan = 1;
            transform.position = titik[0];
            transform.rotation = Quaternion.LookRotation(titik[1]-titik[0]);
        }

        void Update()
        {
            if (jalur == null) return;
            float dt = Time.deltaTime;
            if (jeda > 0)
            {
                jeda -= dt;
                return;
            }
            var asal = transform.position;
            asal.y = tinggi;
            var target = jalur[tujuan];
            var arah = target - asal;
            if (arah.sqrMagnitude > .0001f)
                transform.rotation = Quaternion.RotateTowards(transform.rotation,Quaternion.LookRotation(arah),dt*245f);
            var baru = Vector3.MoveTowards(asal,target,laju*dt);
            if ((baru-target).sqrMagnitude < .0025f)
            {
                tujuan = (tujuan+1)%jalur.Length;
                if (hewan) jeda = tujuan%2==0 ? 2f : .65f;
            }
            if (hewan)
            {
                ayun += dt*11f;
                baru.y += Mathf.Abs(Mathf.Sin(ayun))*.027f;
            }
            transform.position = baru;
        }
    }
}
