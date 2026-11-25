using MS.Kontrak;
using MS.Pemain;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

namespace MS.UI
{
    internal sealed class AnimasiMahasiswa : MonoBehaviour
    {
        GerakPemain pemain;
        IPenerimaAksi aksi;
        AnimationClip[] klip;
        PlayableGraph graf;
        AnimationPlayableOutput keluaran;
        AnimationClipPlayable aktif;
        int indeks = -1, pose;
        float poseHingga;

        internal void Pasang(GerakPemain gerak, AnimationClip[] sumber)
        {
            pemain = gerak;
            var kulit = pemain.GetComponentInChildren<SkinnedMeshRenderer>();
            if (kulit != null)
                HudKamar.PasangOpsional(() => pemain.gameObject.AddComponent<RambutMahasiswa>().Pasang(kulit), "rambut");
            klip = sumber;
            var animator = pemain.GetComponent<Animator>();
            if (animator == null) animator = pemain.gameObject.AddComponent<Animator>();
            animator.applyRootMotion = false;
            graf = PlayableGraph.Create("Animasi mahasiswa");
            keluaran = AnimationPlayableOutput.Create(graf, "Mahasiswa", animator);
            graf.Play();
        }

        void LateUpdate()
        {
            if (!graf.IsValid()) return;
            if (!ReferenceEquals(aksi, Layanan.Aksi))
            {
                if (aksi != null) aksi.AksiMulai -= SaatAksi;
                aksi = Layanan.Aksi;
                if (aksi != null) aksi.AksiMulai += SaatAksi;
            }
            int target = Layanan.Kendaraan?.NaikMotor == true ? 2 :
                Time.time < poseHingga || (pose != 0 && Layanan.Jam?.Sibuk == true)
                ? pose : pemain.KecepatanSaatIni > .1f ? 1 : 0;
            if (target != indeks)
            {
                indeks = target;
                if (aktif.IsValid()) graf.DestroyPlayable(aktif);
                aktif = AnimationClipPlayable.Create(graf, klip[target]);
                keluaran.SetSourcePlayable(aktif);
            }
            if (target < 2 && aktif.GetTime() >= klip[target].length)
                aktif.SetTime(aktif.GetTime() % klip[target].length);
        }

        void SaatAksi(string id)
        {
            pose = id == "tidur" || id == "tidurSiang" || id == "rebahan" ? 3 :
                id == "belajar" || id == "nugas" || id == "kuliah" || id == "santaiTaman" || id == "nongkrong" ? 2 : 0;
            poseHingga = Time.time + (pose == 0 ? 0 : 1f);
        }

        void OnDestroy()
        {
            if (aksi != null) aksi.AksiMulai -= SaatAksi;
            if (graf.IsValid()) graf.Destroy();
        }
    }
}
