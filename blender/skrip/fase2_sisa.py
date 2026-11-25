"""Prop Kampung tambahan. Jalankan dengan Blender background dari akar repo."""
import bpy
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from model_common import start, mat, box, cyl, export

def ball(name, radius, loc, material):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius, location=loc)
    bpy.context.object.name = name
    bpy.context.object.data.materials.append(material)

def kios(name, w, d, h, wall_color, roof_color, open_front=False):
    start(); wall=mat('dinding',wall_color); roof=mat('atap',roof_color); dark=mat('pintu','6b4430')
    if open_front:
        box('meja',(w*.8,d*.38,.8),(0,-d*.12,.4),wall,0)
        for x in (-w*.43,w*.43):
            for y in (-d*.4,d*.4):box('tiang',(.09,.09,h-.2),(x,y,(h-.2)/2),dark,0)
    else:
        box('badan',(w,d,h-.35),(0,0,(h-.35)/2),wall,0)
        box('pintu',(.8,.04,1.8),(0,-d/2+.02,.9),dark,0)
    box('atap',(w+.25,d+.25,.3),(0,0,h-.15),roof,0)
    export(name,6000 if name.startswith('gedung') else 1500)

start(); trunk=mat('batang','a86b3c'); leaf=mat('daun','6cbf5a')
cyl('batang',.16,3.7,(0,0,1.85),trunk,8)
for dx,dy in ((1.1,0),(-1.1,0),(0,1.1),(0,-1.1)):
    ball('pelepah',.85,(dx,dy,3.85),leaf)
export('prop_pohon_kelapa',1500)

start(); trunk=mat('batang','80a055'); leaf=mat('daun','78c45b')
cyl('batang',.13,1.4,(0,0,.7),trunk,8)
for dx,dy in ((.55,0),(-.55,0),(0,.55),(0,-.55)):
    box('daun',(.95,.28,.07),(dx,dy,1.45),leaf,0)
export('prop_pohon_pisang',1500)

start(); metal=mat('tiang','606b78'); black=mat('rumah lampu','3b2a20'); red=mat('merah','e9605a'); yellow=mat('kuning','e9b949'); green=mat('hijau','5cc8a8')
cyl('tiang',.07,2.7,(0,0,1.35),metal,8);box('kepala',(.38,.26,.92),(0,-.04,2.3),black,0)
for z,c in ((2.6,red),(2.3,yellow),(2.0,green)):box('lampu',(.22,.03,.2),(0,-.185,z),c,0)
export('prop_lampu_lalin',1500)

start(); wood=mat('papan','a86b3c'); rail=mat('pagar','e9b949')
box('lantai',(6.9,7.5,.16),(0,0,.08),wood,0)
for x in (-3.3,3.3):
    box('pagar',(0.12,7.5,.7),(x,0,.55),rail,0)
export('prop_jembatan',1500)

start(); wood=mat('kayu','a86b3c'); dark=mat('penyangga','6b4430')
box('dudukan',(1.6,.5,.11),(0,0,.48),wood,0);box('sandaran',(1.6,.1,.58),(0,.25,.77),wood,0)
for x in (-.65,.65):box('kaki',(.12,.4,.46),(x,0,.23),dark,0)
export('prop_bangku',1500)

kios('prop_lapak',3,2.2,2.2,'fff6e5','e9605a',True)
kios('prop_saung',2.6,2.6,2.4,'a86b3c','e9b949',True)
kios('prop_warung',3,2.4,2.5,'fff1c4','6b4430',True)
kios('gedung_petak',5,4.5,3,'ffd6a5','e98a6b')

start(); red=mat('mesin','e9605a'); cream=mat('panel','fff6e5'); dark=mat('selang','3b2a20')
box('pompa',(.65,.52,1.55),(0,0,.775),red,0);box('angka',(.38,.04,.3),(0,-.285,1.1),cream,0)
cyl('selang',.04,.8,(.4,0,.85),dark,8);export('prop_pertamini',1500)

start(); white=mat('tiang','fff6e5'); red=mat('bendera merah','e9605a')
cyl('tiang',.055,5,(0,0,2.5),white,8)
box('merah',(1.1,.04,.34),(.55,0,4.65),red,0);box('putih',(1.1,.04,.34),(.55,0,4.31),white,0)
export('prop_bendera',1500)

start(); brick=mat('bata','e98a6b'); cream=mat('papan','fff6e5')
for x in (-1.65,1.65):box('tiang',(.4,.4,3),(x,0,1.5),brick,0)
box('palang',(3.7,.4,.5),(0,0,3.25),cream,0);export('prop_gapura',1500)

start(); metal=mat('kaki','606b78'); tank=mat('tangki','7fb3e0')
for x in (-.85,.85):
    for y in (-.85,.85):box('kaki',(.12,.12,9),(x,y,4.5),metal,0)
cyl('tangki',1.2,1.6,(0,0,9.8),tank,12);export('prop_menara_air',1500)

start(); body=mat('badan','e9605a'); dark=mat('roda','3b2a20'); seat=mat('jok','6b4430')
box('rangka',(.45,1.35,.48),(0,0,.55),body,0);box('jok',(.42,.62,.12),(0,.1,.94),seat,0)
for y in (-.65,.65):
    wheel=cyl('roda',.29,.13,(0,y,.29),dark,12);wheel.rotation_euler[1]=1.57079632679
box('stang',(.7,.1,.08),(0,-.55,1.2),dark,0);export('prop_motor',1500)
