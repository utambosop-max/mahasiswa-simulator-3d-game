"""Ekspor perabot kamar lanjutan dengan satu atlas warna untuk seluruh set."""
from pathlib import Path
import random

import bpy

OUT = Path(__file__).resolve().parents[2] / "unity/MahasiswaSim3D/Assets/_Game/Models/Resources/Kamar"
WARNA = {
    "wol": (.11, .21, .22), "sarung": (.22, .39, .43), "putih": (.84, .85, .80),
    "kayu": (.36, .22, .12), "besi": (.07, .09, .10), "plastik": (.77, .80, .78),
    "lampu": (.92, .76, .35), "anyam": (.45, .34, .22), "aksen": (.61, .50, .32),
}
INDEKS = {nama: i for i, nama in enumerate(WARNA)}


def kotak(nama, posisi, ukuran, warna, radius=.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=posisi)
    benda = bpy.context.object
    benda.name = nama
    benda.dimensions = ukuran
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = benda.modifiers.new("Tepi membulat", "BEVEL")
    bevel.width = radius
    bevel.segments = 2
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    indeks = INDEKS[warna]
    for loop in benda.data.uv_layers.active.data:
        u, v = loop.uv
        loop.uv = ((indeks % 3 + .08 + .84*u)/3, (indeks // 3 + .08 + .84*v)/3)
    return benda


def kasur():
    kotak("Dipan berlapis kain", (0, 0, .22), (2.04, 1.22, .25), "wol", .07)
    kotak("Kepala dipan", (-1.01, 0, .49), (.13, 1.26, .94), "wol", .065)
    kotak("Spring bed", (0, 0, .445), (1.91, 1.19, .225), "putih", .065)
    kotak("Lis kasur", (0, 0, .47), (1.923, 1.20, .025), "aksen", .01)
    kotak("Selimut", (.36, 0, .564), (1.21, 1.18, .064), "sarung", .035)
    for y in (-.28, .28):
        kotak("Bantal", (-.68, y, .606), (.36, .47, .12), "putih", .055)
    for x in (-.83, .83):
        for y in (-.46, .46):
            kotak("Kaki solid", (x, y, .052), (.12, .13, .104), "kayu", .015)


def meja():
    kotak("Papan meja", (0, 0, .738), (1.52, .71, .072), "kayu", .03)
    for y in (-.285,.285):
        kotak("Rangka besi", (-.62, y, .362), (.044,.05,.69), "besi")
    kotak("Panel samping", (-.62, 0, .35), (.042,.54,.53), "besi")
    kotak("Laci bertingkat", (.48,.03,.34), (.41,.60,.66), "kayu")
    for z in (.18,.37,.56):
        kotak("Muka laci", (.48,-.281,z), (.37,.024,.16), "kayu", .011)
        kotak("Tarikan laci", (.48,-.305,z+.025), (.15,.04,.025), "besi", .008)
    kotak("Pelapis meja", (-.17,-.04,.779), (.67,.38,.012), "wol", .008)
    kotak("Buku catatan", (-.33,-.023,.799), (.29,.21,.028), "putih", .007)


def ac():
    kotak("Rumah AC", (0, 0, .16), (1.18,.30,.30), "plastik", .072)
    kotak("Saluran angin", (0,-.149,.079), (1.01,.047,.086), "besi", .018)
    for z in (.061,.079,.097):
        kotak("Bilah arah udara", (0,-.178,z), (.95,.055,.008), "plastik", .003)
    kotak("Jendela indikator", (.37,-.150,.191), (.13,.03,.045), "besi", .009)
    kotak("Indikator menyala", (.398,-.168,.19), (.025,.006,.011), "lampu", .002)


def karpet():
    kotak("Karpet tenun", (0,0,.017), (2.25,1.46,.033), "wol", .014)
    for y in (-.61,.61):
        kotak("Garis tepi", (0,y,.036), (2.03,.028,.008), "aksen", .003)
    for x in (-.995,.995):
        kotak("Garis sudut", (x,0,.036), (.028,1.23,.008), "aksen", .003)
    for x in (-.85,0,.85):
        kotak("Pola belah ketupat", (x,0,.037), (.327,.327,.01), "sarung", .003).rotation_euler.z = .785398


def lorong():
    kotak("Tikar anyam", (0,0,.011), (1.52,.78,.021), "anyam", .009)
    for x in (-.66,.66):
        kotak("Pita tepi", (x,0,.025), (.08,.76,.01), "aksen", .003)


def ekspor(nama, hias):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    hias()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.join()
    bpy.context.object.name = nama
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    bpy.ops.export_scene.fbx(filepath=str(OUT/(nama+".fbx")), use_selection=True,
        object_types={"MESH"}, axis_forward="-Z", axis_up="Y", bake_space_transform=True, bake_anim=False)


def atlas():
    sisi = 192
    rng = random.Random(551)
    img = bpy.data.images.new("Atlas perabot kamar", width=sisi, height=sisi)
    swatches = list(WARNA.values())
    pixels = []
    for y in range(sisi):
        for x in range(sisi):
            i = (y//64)*3 + x//64
            butir = rng.uniform(.92, 1.08)
            if i in (0, 1, 7):
                butir *= .89 if (x+y) % 3 == 0 else 1.045
            if i == 3:
                butir *= 1.07 if (y//2) % 5 == 0 else .96
            pixels.extend((*[min(1,max(0,k*butir)) for k in swatches[i]], 1))
    img.pixels.foreach_set(pixels)
    img.file_format = "JPEG"
    img.save(filepath=str(OUT/"warna.jpg"))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for nama, bentuk in (("spring_bed",kasur), ("meja_belajar",meja), ("ac",ac), ("karpet",karpet), ("tikar",lorong)):
        ekspor(nama,bentuk)
    atlas()
