"""Karakter mahasiswa ORISINAL bergaya PSX low-poly yang tetap lucu & cerah (permintaan pemilik 25 Nov 2026).

Ciri gaya PSX: sudut tajam (tanpa bevel), sedikit segi (low poly ± 600 segitiga), shading datar (flat),
tekstur palet kecil dengan filter Closest (piksel terlihat). Ciri lucu: kepala besar chibi, mata besar
dengan kilau, pipi merona, warna pastel cerah. Tidak meniru karakter dari game mana pun.

Jalankan:  blender -b -P blender/skrip/kar_mahasiswa_psx.py
Hasil:     unity/.../Models/kar_mahasiswa_psx.fbx + palet, blender/sumber/kar_mahasiswa_psx.blend,
           blender/sumber/pratinjau_kar_mahasiswa_psx.png
"""
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from model_common import SRC, box, cyl, export, mat, start  # noqa: E402

NAMA = "kar_mahasiswa_psx"


def ico(nama, r, loc, material, sub=1, skala=(1, 1, 1)):
    """Bola low-poly bersegi (icosphere) → kesan PSX."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc)
    o = bpy.context.object
    o.name = nama
    o.scale = skala
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    return o


def datar():
    """Semua permukaan flat shading (ciri PSX)."""
    for o in bpy.context.scene.objects:
        if o.type == "MESH":
            for p in o.data.polygons:
                p.use_smooth = False


start()
# Palet cerah (ART_BIBLE): krem kulit, mint, biru langit, oranye lembut, cokelat rambut
kulit = mat("kulit", "FFD9B8")
rambut = mat("rambut", "4A3326")
hoodie = mat("hoodie", "8ED9C0")      # hijau mint
celana = mat("celana", "5D79B8")      # biru denim
tas = mat("tas", "F6A55E")            # oranye lembut
putih = mat("putih", "FFFBF2")
mata_hitam = mat("mata", "2B1E17")
pipi = mat("pipi", "F7A3A3")
sandal = mat("sandal", "E86A5C")

# --- Kaki & sandal (pendek, chibi) ---
for x in (-0.11, 0.11):
    box("kaki", (0.13, 0.15, 0.28), (x, 0, 0.17), celana, 0)
    box("sandal", (0.16, 0.22, 0.05), (x, -0.02, 0.025), sandal, 0)

# --- Badan hoodie (trapesium sederhana lewat kotak + kantong) ---
box("badan", (0.42, 0.28, 0.34), (0, 0, 0.48), hoodie, 0)
box("kantong", (0.26, 0.03, 0.09), (0, -0.15, 0.43), putih, 0)
box("tali_hoodie_k", (0.025, 0.02, 0.10), (-0.05, -0.15, 0.58), putih, 0)
box("tali_hoodie_n", (0.025, 0.02, 0.10), (0.05, -0.15, 0.58), putih, 0)

# --- Lengan + tangan bulat (tanpa jari, seperti mainan) ---
for s in (-1, 1):
    lengan = box("lengan", (0.11, 0.13, 0.28), (s * 0.27, 0, 0.49), hoodie, 0)
    lengan.rotation_euler.y = s * math.radians(8)
    ico("tangan", 0.065, (s * 0.29, 0, 0.33), kulit, 1)

# --- Tas ransel ---
box("ransel", (0.32, 0.12, 0.30), (0, 0.19, 0.50), tas, 0)
box("tutup_ransel", (0.30, 0.13, 0.07), (0, 0.19, 0.64), tas, 0)
for x in (-0.14, 0.14):
    box("tali_ransel", (0.04, 0.30, 0.03), (x, 0.03, 0.64), tas, 0)

# --- Kepala besar (± 45% tinggi badan) ---
ico("kepala", 0.31, (0, 0, 0.93), kulit, 2, skala=(1.0, 0.92, 0.95))
# Rambut: tudung low-poly di atas + poni bersudut
ico("rambut_atas", 0.345, (0, 0.035, 1.0), rambut, 2, skala=(1.02, 0.97, 0.8))
for i, x in enumerate((-0.16, -0.05, 0.06, 0.17)):
    poni = box("poni", (0.12, 0.06, 0.12), (x, -0.25, 1.06 - (i % 2) * 0.025), rambut, 0)
    poni.rotation_euler.x = math.radians(-15)

# --- Wajah: mata besar + kilau, pipi merona, mulut senyum kecil ---
for x in (-0.11, 0.11):
    box("mata", (0.085, 0.03, 0.115), (x, -0.275, 0.92), mata_hitam, 0)
    box("kilau", (0.03, 0.02, 0.035), (x + 0.018, -0.29, 0.95), putih, 0)
    box("pipi", (0.07, 0.02, 0.035), (x * 1.55, -0.262, 0.84), pipi, 0)
mulut = box("mulut", (0.06, 0.02, 0.018), (0, -0.282, 0.83), mata_hitam, 0)

datar()
export(NAMA, 1500)  # anggaran prop/karakter ringan PSX (KonvensiModel: maks karakter 4000)

# --- Pratinjau PNG untuk pemilik (Workbench, flat, latar krem) ---
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "FLAT"
scene.display.shading.color_type = "TEXTURE"
scene.render.resolution_x, scene.render.resolution_y = 720, 720
scene.world = bpy.data.worlds.new("latar")
scene.world.color = (1.0, 0.95, 0.87)
cam_data = bpy.data.cameras.new("kamera")
cam = bpy.data.objects.new("kamera", cam_data)
scene.collection.objects.link(cam)
cam.location = (1.6, -2.4, 1.35)
target = bpy.data.objects.new("target", None)
scene.collection.objects.link(target)
target.location = (0, 0, 0.6)
ikut = cam.constraints.new("TRACK_TO")  # kamera selalu menatap karakter
ikut.target = target
ikut.track_axis = "TRACK_NEGATIVE_Z"
ikut.up_axis = "UP_Y"
cam_data.lens = 50
scene.display.shading.background_type = "WORLD"
scene.camera = cam
scene.render.filepath = str(SRC / ("pratinjau_" + NAMA + ".png"))
bpy.ops.render.render(write_still=True)
print("pratinjau", scene.render.filepath)
