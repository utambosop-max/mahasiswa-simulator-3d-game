"""Model luar ruang dan atlas ringkas untuk Unity."""
from collections import defaultdict
from math import cos, sin, pi
from pathlib import Path

import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parents[2] / "unity/MahasiswaSim3D/Assets/_Game/Models/Resources/Kendaraan"
PALET = {
    "Cat": ((.84,.85,.82), 0., .74),
    "Ban": ((.075,.079,.074), 0., .19),
    "Logam": ((.49,.50,.47), .76, .57),
    "Jok": ((.12,.117,.103), 0., .28),
    "Kaca": ((.22,.30,.31), .21, .88),
    "Lampu": ((.93,.85,.62), .07, .64),
    "Rem": ((.62,.10,.07), 0., .69),
    "Kayu": ((.46,.285,.171), 0., .22),
    "Bodi gelap": ((.16,.17,.16), .08, .27),
}


class Kendaraan:
    def __init__(self):
        self.kelompok = defaultdict(lambda: ([], [], []))
        self.pusat = {}

    def bentuk(self, titik, sisi, warna, bagian):
        vertices, faces, sel = self.kelompok[bagian]
        i = len(vertices)
        vertices.extend(titik)
        for muka in sisi:
            faces.append(tuple(i + k for k in muka))
            sel.append(warna)

    def kotak(self, pusat, ukuran, warna, bagian="Rangka"):
        x, y, z = pusat
        a, b, c = (v * .5 for v in ukuran)
        vertices = [(x+a*dx,y+b*dy,z+c*dz) for dx,dy,dz in (
            (-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1))]
        self.bentuk(vertices, ((3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)), warna, bagian)

    def tabung(self, a, b, radius, warna, bagian="Rangka", segmen=10):
        a, b = Vector(a), Vector(b)
        arah = (b-a).normalized()
        u = arah.cross(Vector((0,0,1)))
        if u.length_squared < .001:
            u = arah.cross(Vector((1,0,0)))
        u.normalize()
        v = arah.cross(u)
        vertices = [pusat+radius*(u*cos(i*2*pi/segmen)+v*sin(i*2*pi/segmen))
                    for pusat in (a,b) for i in range(segmen)]
        sisi = [(i,(i+1)%segmen,(i+1)%segmen+segmen,i+segmen) for i in range(segmen)]
        sisi += [tuple(reversed(range(segmen))),tuple(range(segmen,2*segmen))]
        self.bentuk(vertices, sisi, warna, bagian)

    def panel(self, irisan, warna, bagian="Cat"):
        vertices = []
        for y, lebar, bawah, atas in irisan:
            x, h = lebar*.5, atas-bawah
            vertices.extend((px,y,pz) for px,pz in (
                (-x*.76,bawah),(x*.76,bawah),(x,bawah+.24*h),(x,atas-.20*h),
                (x*.73,atas),(-x*.73,atas),(-x,atas-.20*h),(-x,bawah+.24*h)))
        sisi = [tuple(range(8))]
        for i in range(0,len(vertices)-8,8):
            for j in range(8):
                k=(j+1)%8
                sisi.append((i+j,i+j+8,i+k+8,i+k))
        sisi.append(tuple(range(len(vertices)-1,len(vertices)-9,-1)))
        self.bentuk(vertices, sisi, warna, bagian)

    def roda(self, nama, pusat, radius, tebal, jari_jari=True):
        x,y,z = pusat
        self.pusat[nama] = pusat
        n, potong = 24, 8
        vertices = [(x+cos(j*2*pi/potong)*tebal*.5,
                     y+cos(i*2*pi/n)*(radius+sin(j*2*pi/potong)*tebal*.44),
                     z+sin(i*2*pi/n)*(radius+sin(j*2*pi/potong)*tebal*.44))
                    for i in range(n) for j in range(potong)]
        faces = [(i*potong+j,i*potong+(j+1)%potong,((i+1)%n)*potong+(j+1)%potong,((i+1)%n)*potong+j)
                 for i in range(n) for j in range(potong)]
        self.bentuk(vertices,faces,"Ban",nama)
        self.tabung((x-tebal*.53,y,z),(x+tebal*.53,y,z),radius*.26,"Logam",nama)
        if jari_jari:
            for i in range(12):
                sudut=i*pi/6
                ujung=(x,y+cos(sudut)*radius*.86,z+sin(sudut)*radius*.86)
                self.tabung((x,y,z),ujung,.011,"Logam",nama,5)

    def ekspor(self, nama):
        bahan = bpy.data.materials.new("Detail kendaraan")
        cat = bpy.data.materials.new("Cat bodi")
        peran = list(PALET)
        for bagian, (vertices,sisi,warna) in self.kelompok.items():
            poros = Vector(self.pusat.get(bagian,(0,0,0)))
            mesh = bpy.data.meshes.new(bagian)
            mesh.from_pydata([Vector(p)-poros for p in vertices], [], sisi)
            mesh.update()
            mesh.materials.append(cat if bagian == "Cat" else bahan)
            uv = mesh.uv_layers.new()
            for muka, peranan in zip(mesh.polygons,warna):
                if bagian.startswith("Roda_"):
                    muka.use_smooth = True
                index = peran.index(peranan)
                for i, loop in enumerate(muka.loop_indices):
                    u,v = ((.19,.19),(.81,.19),(.81,.81),(.19,.81))[i%4]
                    uv.data[loop].uv = ((index%4+u)/4,(index//4+v)/4)
            objek = bpy.data.objects.new(bagian,mesh)
            bpy.context.collection.objects.link(objek)
            objek.location = poros
            objek.select_set(True)
        folder = OUT / nama
        folder.mkdir(parents=True, exist_ok=True)
        bpy.ops.export_scene.fbx(filepath=str(folder / (nama+".fbx")), use_selection=True,
            axis_forward="-Z", axis_up="Y", bake_space_transform=True, object_types={"MESH"}, bake_anim=False)


def motor():
    k=Kendaraan()
    for nama, y, r in (("Roda_Depan",-.69,.235),("Roda_Belakang",.62,.229)):
        k.roda(nama,(0,y,r+.046),r,.085)
        for i in range(8):
            a=(i+.7)*pi/10
            b=(i+1.7)*pi/10
            k.tabung((0,y+cos(a)*.283,r+.045+sin(a)*.283),
                (0,y+cos(b)*.283,r+.045+sin(b)*.283),.051,"Cat","Cat",8)
    k.panel(((-.59,.17,.47,.69),(-.47,.37,.44,.94),(-.32,.29,.37,.79),(-.17,.18,.31,.57)),"Cat")
    k.panel(((-.09,.20,.37,.48),(.08,.31,.38,.62),(.34,.40,.39,.72),(.66,.29,.43,.68),(.79,.19,.46,.63)),"Cat")
    k.panel(((.04,.19,.67,.74),(.18,.31,.66,.79),(.55,.29,.66,.79),(.72,.17,.64,.72)),"Jok","Rangka")
    k.tabung((0,-.27,.37),(0,.46,.34),.062,"Logam")
    k.kotak((0,.06,.34),(.31,.32,.26),"Bodi gelap")
    for sisi in (-1,1):
        x=sisi
        k.tabung((x*.095,-.69,.28),(x*.088,-.44,.91),.033,"Logam")
        k.tabung((x*.109,.61,.28),(x*.132,.39,.63),.026,"Logam")
        k.tabung((x*.106,-.04,.31),(x*.273,-.04,.31),.025,"Ban")
        k.tabung((x*.04,-.45,.97),(x*.34,-.39,1.04),.025,"Logam")
        k.tabung((x*.23,-.41,1.03),(x*.37,-.38,1.052),.031,"Ban")
        k.tabung((x*.23,-.43,1.035),(x*.37,-.49,1.26),.011,"Logam")
        k.kotak((x*.38,-.492,1.263),(.14,.035,.065),"Kaca")
    k.tabung((.16,.00,.25),(.20,.48,.30),.034,"Logam")
    k.tabung((.20,.34,.30),(.20,.80,.34),.062,"Logam")
    k.kotak((0,-.582,.856),(.253,.058,.126),"Lampu")
    k.kotak((0,.794,.617),(.22,.055,.077),"Rem")
    k.kotak((0,.83,.50),(.23,.035,.091),"Bodi gelap")
    return k


def angkot():
    k=Kendaraan()
    k.panel(((-1.77,1.32,.37,1.22),(-1.50,1.68,.31,1.72),(-.71,1.72,.31,1.88),
        (1.38,1.72,.31,1.88),(1.68,1.58,.38,1.74)),"Cat")
    for x in (-.868,.868):
        for y in (-.56,.17,.85):
            k.kotak((x,y,1.40),(.043,.58,.48),"Kaca")
        k.kotak((x,-.01,.88),(.044,2.91,.066),"Lampu")
        k.kotak((x,-1.31,1.44),(.13,.18,.09),"Kaca")
    k.kotak((0,-1.53,1.53),(1.30,.07,.34),"Kaca")
    k.kotak((0,1.688,1.42),(1.26,.036,.38),"Kaca")
    k.kotak((0,-1.785,.45),(1.33,.12,.12),"Bodi gelap")
    for i in (-1,1):
        k.kotak((i*.52,-1.795,.67),(.27,.07,.14),"Lampu")
        k.kotak((i*.64,1.716,.70),(.13,.07,.24),"Rem")
        for bagian, y in (("Depan",-1.08),("Belakang",1.05)):
            k.roda(f"Roda_{bagian}_{i}",(i*.78,y,.295),.245,.15,False)
    return k


def gerobak():
    k=Kendaraan()
    k.kotak((0,0,.68),(.78,1.64,.68),"Kayu")
    k.kotak((0,0,1.05),(.91,1.77,.09),"Logam")
    for x in (-.39,.39):
        for y in (-.77,.77):
            k.tabung((x,y,.99),(x,y,1.98),.023,"Kayu")
        k.kotak((x,-.20,1.42),(.032,.98,.43),"Kaca")
    k.kotak((0,-.73,1.42),(.74,.044,.43),"Kaca")
    k.kotak((0,-.06,1.93),(1.06,2.00,.12),"Cat","Cat")
    k.kotak((0,-1.0,1.85),(.97,.057,.19),"Rem")
    for x in (-.48,.48):
        k.roda(f"Roda_{x}",(x,.32,.31),.27,.061)
    k.kotak((0,-.76,.26),(.08,.08,.49),"Logam")
    k.tabung((-.36,.93,1.02),(.36,.93,1.02),.021,"Logam")
    return k


def atlas():
    folder=OUT / "atlas"
    folder.mkdir(parents=True, exist_ok=True)
    for nama, ekstensi in (("warna","jpg"),("pbr","png")):
        gambar = bpy.data.images.new(nama, width=128, height=128, alpha=nama=="pbr")
        if nama == "pbr":
            gambar.colorspace_settings.name = "Non-Color"
        pixels = []
        for y in range(128):
            for x in range(128):
                sel = y//32*4+x//32
                warna,metal,licin = list(PALET.values())[sel] if sel < len(PALET) else ((.5,.5,.5),0,.25)
                if nama=="pbr":
                    pixels.extend((metal,1,metal,licin))
                else:
                    tekstur = ((x*11+y*7)%13-6)*.0017
                    pixels.extend((*[max(0,min(1,c+tekstur)) for c in warna],1))
        gambar.pixels.foreach_set(pixels)
        gambar.file_format = "PNG" if nama=="pbr" else "JPEG"
        gambar.save(filepath=str(folder/(nama+"."+ekstensi)))


if __name__=="__main__":
    for nama, buat in (("motor_bebek",motor),("angkot",angkot),("gerobak",gerobak)):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        buat().ekspor(nama)
    atlas()
