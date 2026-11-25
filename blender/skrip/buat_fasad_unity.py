"""Buat model eksterior yang mengikuti tata letak dunia Unity."""
import json
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / "unity/MahasiswaSim3D/Assets/_Game"
OUT = GAME / "Models/Resources/Fasad"
BAGIAN = {
    "Plester": (0, 0),
    "Lis": (1, 0),
    "Bata": (2, 0),
    "Beton": (3, 0),
    "Atap": (0, 1),
    "Panel": (1, 1),
    "Besi": (2, 1),
    "Aksen": (3, 1),
    "Papan": (0, 2),
}

ATAP_SENG = {"warteg", "warkop", "fotokopi", "laundry", "tani", "pasar", "gor", "warnet"}
KANOPI = {"warteg", "warkop", "kafe", "salon", "klinik", "minimarket", "pasar"}
GEDUNG_UMUM = {"kampus", "karier", "bank", "polisi", "perpus", "klinik", "gor"}
VARIASI = {
    "kos": (4, .43), "kampus": (7, .43), "warteg": (2, .78), "warkop": (2, .72),
    "minimarket": (3, .60), "perpus": (5, .48), "klinik": (4, .57), "warnet": (2, .37),
    "fotokopi": (2, .53), "laundry": (3, .45), "kafe": (4, .70), "bank": (3, .48),
    "gor": (4, .33), "karier": (3, .49), "tani": (2, .52), "pasar": (5, .67),
    "salon": (2, .62), "polisi": (3, .49)
}

class Fasad:
    def __init__(self):
        self.solid = ([], [], [])
        self.kaca = ([], [], [])

    def bentuk(self, vertices, sisi, bahan):
        verts, faces, uv = self.kaca if bahan == "Kaca" else self.solid
        awal = len(verts)
        verts.extend(vertices)
        for face in sisi:
            faces.append(tuple(awal + i for i in face))
            uv.append(bahan)

    def kotak(self, pusat, ukuran, bahan):
        x, y, z = pusat
        a, b, c = (v * .5 for v in ukuran)
        if min(a, b, c) <= 0:
            return
        vertices = [(x+dx*a, y+dy*b, z+dz*c) for dx, dy, dz in (
            (-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1))]
        self.bentuk(vertices, ((3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)), bahan)

    def atap(self, w, d, z, tinggi, limas):
        a, b = w*.5, d*.5
        if limas:
            v = [(-a,-b,z), (a,-b,z), (a,b,z), (-a,b,z), (-a*.67,0,z+tinggi), (a*.67,0,z+tinggi)]
            self.bentuk(v, ((3,2,1,0),(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)), "Atap")
        else:
            self.kotak((0,0,z+.10),(w,d,.20),"Atap")
            for sisi in (-1,1):
                self.kotak((sisi*(a-.07),0,z+.23),(.14,d,.28),"Lis")
        self.kotak((0,-b-.015,z-.08),(w,.10,.13),"Besi")

    def jendela(self, x, y, z, w, h, teralis):
        self.kotak((x,y+.035,z),(w,.09,h),"Kaca")
        for sisi in (-1,1):
            self.kotak((x+sisi*w*.5,y,z),(.075,.16,h+.13),"Besi")
            self.kotak((x,y,z+sisi*h*.5),(w,.16,.075),"Besi")
        self.kotak((x,y-.024,z),(.055,.115,h),"Besi")
        self.kotak((x,y-.06,z-h*.5-.075),(w+.24,.33,.086),"Lis")
        if teralis:
            for porsi in (-.31,.31):
                self.kotak((x+w*porsi,y-.096,z),(.03,.05,h),"Besi")

    def buat_objek(self, id):
        for nama, (verts, faces, layout) in (("Fasad",self.solid),("Kaca",self.kaca)):
            if not faces: continue
            mesh = bpy.data.meshes.new(nama)
            mesh.from_pydata(verts, [], faces)
            mesh.update()
            mat = bpy.data.materials.new(nama)
            mesh.materials.append(mat)
            uv = mesh.uv_layers.new()
            for face, bahan in zip(mesh.polygons, layout):
                x,y = BAGIAN.get(bahan,(0,0))
                for indeks, loop in enumerate(face.loop_indices):
                    u,v = ((0,0),(1,0),(1,1),(0,1))[indeks]
                    uv.data[loop].uv = ((x+(u*.948+.026))/4,(y+(v*.948+.026))/4)
            item = bpy.data.objects.new(nama,mesh)
            bpy.context.collection.objects.link(item)
            item.select_set(True)
        target = OUT / id / (id + ".fbx")
        target.parent.mkdir(parents=True,exist_ok=True)
        bpy.ops.export_scene.fbx(filepath=str(target), axis_forward="-Z",axis_up="Y",
            bake_space_transform=True,use_selection=True,object_types={"MESH"},bake_anim=False)

def buat(b):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    id = b["id"]
    w,d,h = (b[k] for k in ("w","d","tinggi"))
    rumah = b["jenis"] == "rumah"
    y = -d*.5
    limas = rumah or bool(b.get("atapLimas")) and id not in ATAP_SENG
    tinggi_atap = (min(1.42,h*.26) if rumah else min(1.85,h*.19)) if limas else .45
    badan = h-tinggi_atap
    lantai = max(1, min(3, round(badan/3.1)))
    per_lantai = badan/lantai
    n, lebar_jendela = VARIASI.get(id, (2+(int(id[5:])%3 if rumah else 0),.40))
    f = Fasad()
    f.kotak((0,0,.22),(w,d,.44),"Bata")
    f.kotak((0,d*.5-.09,badan*.5),(w,.18,badan),"Plester")
    for sisi in (-1,1):
        f.kotak((sisi*(w*.5-.09),0,badan*.5),(.18,d,badan),"Plester")
        f.kotak((sisi*(w*.5-.19),y-.08,badan*.5),(.32,.45,badan),"Lis")
    for tingkat in range(lantai):
        alas = tingkat*per_lantai
        lajur = n + (tingkat == 0 and n % 2 == 0)
        bidang = (w-.75)/lajur
        for indeks in range(lajur):
            x = (indeks-(lajur-1)*.5)*bidang
            masuk = tingkat==0 and indeks==lajur//2
            bukaan = min(bidang*.84,1.52 if masuk else bidang*lebar_jendela)
            tinggi = min(per_lantai-.38,2.32 if masuk else per_lantai*.50)
            bawah = alas + (.20 if masuk else per_lantai*.32)
            atas = bawah+tinggi
            for sisi in (-1,1):
                lebar=(bidang-bukaan)*.5+.02
                f.kotak((x+sisi*(bidang+bukaan)/4,y+.10,alas+per_lantai*.5),
                    (lebar,.26,per_lantai),"Plester")
            f.kotak((x,y+.10,(alas+bawah)*.5),(bukaan,.26,bawah-alas),"Bata" if tingkat==0 else "Plester")
            sisa=alas+per_lantai-atas
            f.kotak((x,y+.10,atas+sisa*.5),(bukaan,.26,sisa),"Plester")
            if masuk:
                f.kotak((x,y+.052,bawah+tinggi*.5),(bukaan,.11,tinggi),"Panel")
                for sisi in (-1,1):
                    f.kotak((x+sisi*bukaan*.50,y-.034,bawah+tinggi*.5),(.10,.17,tinggi+.06),"Besi")
                f.kotak((x+bukaan*.32,y-.086,bawah+tinggi*.47),(.07,.077,.19),"Besi")
                f.kotak((x,y-.24,.106),(min(bidang,bukaan+.37),.56,.19),"Beton")
            else:
                f.jendela(x,y,bawah+tinggi*.5,bukaan,tinggi,rumah or id in {"kos","polisi","bank"})
        f.kotak((0,y-.068,alas+per_lantai-.11),(w,.28,.14),"Lis")
    f.atap(w+.46,d+.45,badan,tinggi_atap,limas)
    if not rumah:
        tinggi_papan = min(per_lantai-.27,badan-.52)
        lebar_papan = min(6.5,w*.79)
        f.kotak((0,y-.20,tinggi_papan),(lebar_papan,.12,.51),"Aksen")
        f.kotak((0,y-.268,tinggi_papan),(lebar_papan*.96,.024,.43),"Papan")
    if id in KANOPI or rumah or id=="kos":
        tinggi_kanopi=min(2.65,per_lantai-.15)
        f.kotak((0,y-.41,tinggi_kanopi),(w*.81,.8,.145),"Atap")
        if id not in {"salon","klinik"}:
            for x in (-w*.37,w*.37):
                f.kotak((x,y-.71,tinggi_kanopi*.5),(.07,.07,tinggi_kanopi),"Besi")
    meter_x=w*.445
    f.kotak((meter_x,y-.19,1.42),(.24,.18,.32),"Besi")
    f.kotak((meter_x,y-.20,2.20),(.032,.04,1.40),"Besi")
    if id in GEDUNG_UMUM or id in {"minimarket","kos","warnet"}:
        f.kotak((w*.34,y-.29,badan-.82),(.79,.45,.48),"Lis")
        for bilah in range(3):
            f.kotak((w*.34,y-.535,badan-.94+bilah*.11),(.61,.036,.031),"Besi")
    f.buat_objek(id)

if __name__ == "__main__":
    dunia = json.loads((GAME / "Data/dunia.json").read_text(encoding="utf-8"))
    for bangunan in dunia["bangunan"]:
        buat(bangunan)
