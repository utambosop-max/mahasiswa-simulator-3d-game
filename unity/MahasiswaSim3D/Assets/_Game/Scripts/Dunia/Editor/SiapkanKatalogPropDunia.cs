using System;
using UnityEditor;
using UnityEngine;

namespace MS.Dunia.Editor
{
    public static class SiapkanKatalogPropDunia
    {
        const string Folder = "Assets/_Game/Pihak3/PolyHaven/Katalog/Model";
        const string Hasil = "Assets/_Game/Models/Resources/KatalogPropDunia.asset";

        [MenuItem("Mahasiswa Sim/Siapkan katalog properti dunia")]
        public static void Siapkan()
        {
            var daftar = new[]
            {
                "SchoolDesk_01", "SchoolChair_01", "metal_office_desk", "dining_table", "painted_wooden_table",
                "modern_wooden_cabinet", "plastic_monobloc_chair_01", "wooden_bookshelf_worn", "wooden_display_shelves_01",
                "worn_metal_rack", "vintage_day_bed", "painted_wooden_bench", "wicker_basket_01", "potted_plant_02",
                "vintage_electric_kettle", "wooden_picnic_table", "brass_pot_01", "wooden_bowl_01", "plastic_bottle_gallon",
                "plastic_crate_01", "cardboard_box_01", "bleach_bottle", "metal_trash_can", "planter_pot_clay",
                "ceramic_vase_01", "wooden_bucket_01", "watering_can_metal_01", "cement_bag", "wooden_crate_01",
                "plastic_broom", "small_wooden_table_01", "painted_wooden_cabinet", "wooden_stool_01",
                "desk_lamp_arm_01", "island_tree_01", "tree_small_02", "old_bed_frame", "prop_payung"
            };
            var katalog = AssetDatabase.LoadAssetAtPath<KatalogPropDunia>(Hasil);
            if (katalog == null)
            {
                katalog = ScriptableObject.CreateInstance<KatalogPropDunia>();
                AssetDatabase.CreateAsset(katalog, Hasil);
            }
            var data = new SerializedObject(katalog);
            var prop = data.FindProperty("prop");
            prop.arraySize = daftar.Length;
            for (int i = 0; i < daftar.Length; i++)
            {
                string id = daftar[i];
                string jalur = id == "prop_payung" ? "Assets/_Game/Models/prop_payung.fbx" : $"{Folder}/{id}/{id}.fbx";
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(jalur);
                if (model == null) throw new InvalidOperationException("Prop dunia tidak tersedia: " + id);
                prop.GetArrayElementAtIndex(i).objectReferenceValue = model;
            }
            data.ApplyModifiedPropertiesWithoutUndo();
            AssetDatabase.SaveAssets();
        }
    }
}
