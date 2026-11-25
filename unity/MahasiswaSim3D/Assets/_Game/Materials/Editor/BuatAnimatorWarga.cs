using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace MS.Materials.Editor
{
    public static class BuatAnimatorWarga
    {
        const string Folder = "Assets/_Game/Models/AnimasiWarga";

        [MenuItem("Mahasiswa Sim/Buat Animator Warga")]
        public static void Jalankan()
        {
            if (!AssetDatabase.IsValidFolder(Folder))
                AssetDatabase.CreateFolder("Assets/_Game/Models", "AnimasiWarga");
            string path = Folder + "/Warga.controller";
            if (AssetDatabase.LoadAssetAtPath<AnimatorController>(path) != null) return;

            var controller = AnimatorController.CreateAnimatorControllerAtPath(path);
            controller.AddParameter("Kecepatan", AnimatorControllerParameterType.Float);
            controller.AddParameter("Menoleh", AnimatorControllerParameterType.Trigger);
            var mesin = controller.layers[0].stateMachine;
            var diam = mesin.AddState("Idle");
            diam.motion = BuatKlip("Idle", "m_LocalScale.y", 1, 1.025f, 1, 1.7f, true);
            mesin.defaultState = diam;
            var jalan = mesin.AddState("Jalan");
            jalan.motion = BuatKlip("Jalan", "m_LocalPosition.y", 0, .075f, 0, .42f, true);
            var lihat = mesin.AddState("Menoleh");
            lihat.motion = BuatKlip("Menoleh", "localEulerAnglesRaw.y", 0, 23, 0, .8f, false);
            var mulai = Transisi(diam, jalan);
            mulai.AddCondition(AnimatorConditionMode.Greater, .1f, "Kecepatan");
            var berhenti = Transisi(jalan, diam);
            berhenti.AddCondition(AnimatorConditionMode.Less, .1f, "Kecepatan");
            var menoleh = Transisi(diam, lihat);
            menoleh.AddCondition(AnimatorConditionMode.If, 0, "Menoleh");
            var kembali = Transisi(lihat, diam);
            kembali.hasExitTime = true;
            kembali.exitTime = 1f;
            AssetDatabase.SaveAssets();
        }

        static AnimatorStateTransition Transisi(AnimatorState dari, AnimatorState ke)
        {
            var transisi = dari.AddTransition(ke);
            transisi.hasExitTime = false;
            transisi.duration = .12f;
            return transisi;
        }

        static AnimationClip BuatKlip(string nama, string properti, float awal, float tengah, float akhir, float durasi, bool loop)
        {
            var klip = new AnimationClip { name = nama };
            klip.SetCurve("Visual", typeof(Transform), properti,
                new AnimationCurve(new Keyframe(0, awal), new Keyframe(durasi * .5f, tengah), new Keyframe(durasi, akhir)));
            var pengaturan = AnimationUtility.GetAnimationClipSettings(klip);
            pengaturan.loopTime = loop;
            AnimationUtility.SetAnimationClipSettings(klip, pengaturan);
            AssetDatabase.CreateAsset(klip, Folder + "/" + nama + ".anim");
            return klip;
        }
    }
}
