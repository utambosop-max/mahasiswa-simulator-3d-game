import sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from model_common import box, cyl, mat, export, start


start()
kain = mat('kain', '77B8D2')
besi = mat('besi', '534653')
cyl('batang', .017, .93, (0, 0, .47), besi, 10)
bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=.58, radius2=.045, depth=.22, location=(0, 0, .91))
bpy.context.object.data.materials.append(kain)
export('prop_payung', 1500)

start()
ember = mat('ember', '87CBB6')
cyl('ember', .25, .36, (0, 0, .18), ember, 12)
for i, warna in enumerate(('F5A990', 'F6D286', '8DA8D7')):
    kain = mat('baju', warna)
    potong = box('baju', (.27, .25, .09), (0, 0, .34 + i * .07), kain, .035)
    potong.rotation_euler.z = i * .6
export('prop_ember_cucian', 1500)

start()
badan = mat('badan', '925E42')
gelap = mat('kaki', '503A31')
box('badan', (.12, .22, .075), (0, 0, .07), badan, .03)
box('kepala', (.075, .07, .05), (0, -.125, .06), gelap, .015)
for arah in (-1, 1):
    for y in (-.07, 0, .07):
        kaki = box('kaki', (.085, .013, .019), (arah * .075, y, .012), gelap, 0)
        kaki.rotation_euler.z = arah * .3
    box('antena', (.013, .09, .013), (arah * .028, -.184, .075), gelap, 0)
export('prop_kecoa', 1500)
