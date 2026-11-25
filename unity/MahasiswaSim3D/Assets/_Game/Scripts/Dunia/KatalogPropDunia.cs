using System;
using UnityEngine;

namespace MS.Dunia
{
    public sealed class KatalogPropDunia : ScriptableObject
    {
        [SerializeField] GameObject[] prop;

        internal static KatalogPropDunia Muat() => Resources.Load<KatalogPropDunia>("KatalogPropDunia");

        internal GameObject Ambil(string id)
            => prop == null ? null : Array.Find(prop, item => item != null && item.name == id);
    }
}
