import sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from model_common import box, cyl, mat, export, start


def karakter(nama, baju, rambut, ciri):
    start()
    bpy.context.preferences.filepaths.save_version = 0
    kulit = mat("kulit", "FFD7B5")
    pakaian = mat("pakaian", baju)
    gelap = mat("rambut", rambut)
    aksen = mat("aksen", "FFF1D7")
    mata = mat("mata", "3B2A20")
    for x in (-.14, .14):
        box("kaki", (.16, .22, .42), (x, 0, .21), gelap, .05)
    box("badan", (.5, .3, .45), (0, 0, .64), pakaian, .10)
    for x in (-.31, .31):
        box("lengan", (.14, .18, .36), (x, 0, .64), pakaian, .05)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=.36, location=(0, 0, 1.16))
    bpy.context.object.data.materials.append(kulit)
    box("rambut", (.66, .52, .16), (0, .02, 1.46), gelap, .07)
    for x in (-.13, .13):
        box("mata", (.06, .025, .08), (x, -.35, 1.17), mata, .015)
    if ciri == "celemek":
        box("celemek", (.38, .04, .32), (0, -.17, .63), aksen, .03)
    elif ciri == "peci":
        cyl("peci", .25, .16, (0, 0, 1.53), gelap, 12)
    elif ciri == "kacamata":
        for x in (-.13, .13):
            box("kacamata", (.16, .03, .10), (x, -.372, 1.17), gelap, .02)
        box("dasi", (.08, .03, .23), (0, -.17, .65), aksen, .01)
    elif ciri == "kerudung":
        box("kerudung", (.72, .52, .18), (0, .05, 1.49), pakaian, .08)
    export(nama, 4000)


karakter("kar_buKos", "BD7FA6", "513A36", "kerudung")
karakter("kar_mbakSri", "E99B77", "48352D", "celemek")
karakter("kar_bangUdin", "7FA98D", "3B2A20", "peci")
karakter("kar_pakDosen", "7A8FB6", "47414C", "kacamata")

start()
oren = mat("oranye", "ECA366")
krem = mat("krem", "FFF1D7")
gelap = mat("mata", "3B2A20")
box("badan", (.36, .65, .32), (0, 0, .27), oren, .12)
box("kepala", (.40, .34, .33), (0, -.37, .40), oren, .11)
for x in (-.13, .13):
    for y in (-.18, .18):
        box("kaki", (.10, .12, .20), (x, y, .10), oren, .03)
    box("telinga", (.11, .09, .13), (x, -.37, .59), oren, .02)
    box("mata", (.045, .025, .055), (x * .6, -.552, .43), gelap, .01)
box("moncong", (.18, .035, .09), (0, -.555, .32), krem, .02)
ekor = box("ekor", (.09, .09, .48), (0, .35, .40), oren, .03)
ekor.rotation_euler.x = -.55
export("kar_oyen", 4000)
