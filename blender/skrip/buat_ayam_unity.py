"""Model ayam kampung kecil dengan material terpisah."""
from pathlib import Path

import bpy
from mathutils import Vector

parts=[]
materials={}

def bahan(nama,warna):
    mat=bpy.data.materials.new(nama)
    mat.diffuse_color=(*warna,1)
    materials[nama]=mat

def bulat(nama,pos,skala,warna,condong=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=pos)
    o=bpy.context.object
    o.name=nama
    o.scale=skala
    o.rotation_euler.x=condong
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    o.data.materials.append(materials[warna])
    parts.append(o)

def batang(nama,a,b,radius,warna,ujung=None):
    arah=Vector(b)-Vector(a)
    if ujung is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=radius,depth=arah.length,location=(Vector(a)+Vector(b))*.5)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=radius,radius2=ujung,depth=arah.length,location=(Vector(a)+Vector(b))*.5)
    o=bpy.context.object
    o.name=nama
    o.rotation_mode="QUATERNION"
    o.rotation_quaternion=arah.to_track_quat("Z","Y")
    o.data.materials.append(materials[warna])
    parts.append(o)

bpy.ops.wm.read_factory_settings(use_empty=True)
bahan("Bulu",(.55,.32,.16))
bahan("Sayap",(.44,.22,.09))
bahan("Ekor",(.22,.18,.12))
bahan("Jengger",(.68,.075,.05))
bahan("Paruh",(.76,.48,.13))
bahan("Mata",(.063,.034,.021))
bulat("Badan ayam",(0,.02,.28),(.13,.235,.17),"Bulu")
bulat("Leher",(0,-.135,.36),(.088,.114,.142),"Bulu",-.26)
bulat("Kepala",(0,-.205,.482),(.072,.083,.073),"Bulu")
for x in (-.121,.121):
    bulat("Sayap",(x,.045,.307),(.039,.169,.095),"Sayap",.09)
for x in (-.06,.06):
    bulat("Mata",(x,-.231,.504),(.019,.017,.019),"Mata")
    batang("Kaki",(x,.013,.18),(x,.015,.047),.012,"Paruh")
    for tambah in (-.017,.01,.032):
        batang("Jari",(x,.015,.041),(x+tambah,-.043,.023),.007,"Paruh")
batang("Paruh",(0,-.265,.467),(0,-.355,.439),.030,"Paruh",.002)
for i in range(4):
    bulat("Jengger",(0,-.25+i*.026,.542+(i%2)*.014),(.019,.021,.039),"Jengger",.16)
for x in (-.065,0,.065):
    bulat("Bulu ekor",(x,.206,.42),(.037,.079,.173),"Ekor",-.52)
bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.object.join()
o=bpy.context.object
o.name="Ayam kampung"
bpy.context.scene.cursor.location=(0,0,0)
bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
folder=Path(__file__).resolve().parents[2]/"unity/MahasiswaSim3D/Assets/_Game/Models/Resources/Satwa"
folder.mkdir(parents=True,exist_ok=True)
warna=[tuple(mat.diffuse_color) for mat in o.data.materials]
atlas=bpy.data.images.new("Warna bulu",width=8*len(warna),height=4)
atlas.pixels.foreach_set([nilai for _ in range(4) for rgba in warna for _ in range(8) for nilai in rgba])
atlas.file_format="JPEG"
atlas.save(filepath=str(folder/"warna.jpg"))
uv=o.data.uv_layers.active or o.data.uv_layers.new()
for muka in o.data.polygons:
    for loop in muka.loop_indices:
        uv.data[loop].uv=((muka.material_index+.5)/len(warna),.5)
    muka.material_index=0
o.data.materials.clear()
o.data.materials.append(bpy.data.materials.new("Bulu ayam"))
bpy.ops.export_scene.fbx(filepath=str(folder/"ayam.fbx"),use_selection=True,object_types={"MESH"},
    axis_forward="-Z",axis_up="Y",bake_anim=False,bake_space_transform=True)
