from pathlib import Path
import bpy
from mathutils import Vector
import shutil

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'unity/MahasiswaSim3D/Assets/_Game/Models'
SRC=ROOT/'blender/sumber'
OUT.mkdir(parents=True,exist_ok=True); SRC.mkdir(parents=True,exist_ok=True)

def mat(name,hex):
 m=bpy.data.materials.new(name); m.diffuse_color=tuple(int(hex[i:i+2],16)/255 for i in (0,2,4))+(1,); return m

def box(name,size,loc,material,bevel=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name; o.dimensions=size; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Rounded','BEVEL'); mod.width=min(bevel,min(size)/3); mod.segments=2; bpy.ops.object.modifier_apply(modifier=mod.name)
 o.data.materials.append(material); return o

def cyl(name,r,depth,loc,material,vertices=10):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc); o=bpy.context.object; o.name=name; o.data.materials.append(material); return o

def export(name,limit):
 parts=[o for o in bpy.context.scene.objects if o.type=='MESH']; bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join(); o=parts[0]; o.name=name; o.data.name=name
 bpy.context.scene.cursor.location=(0,0,0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR'); o.data.calc_loop_triangles(); tris=len(o.data.loop_triangles)
 assert tris<=limit,(name,tris)
 colors=[tuple(m.diffuse_color) for m in o.data.materials]
 atlas=bpy.data.images.new('palet_'+name,width=4*len(colors),height=4)
 atlas.pixels.foreach_set([v for _ in range(4) for rgba in colors for _ in range(4) for v in rgba])
 texture=OUT/('palet_'+name+'.png')
 atlas.filepath_raw=str(texture);atlas.file_format='PNG';atlas.save()
 shutil.copy2(texture,SRC/texture.name);atlas.pack()
 uv=o.data.uv_layers.active or o.data.uv_layers.new()
 for face in o.data.polygons:
  u=(face.material_index+.5)/len(colors)
  for loop in face.loop_indices:uv.data[loop].uv=(u,.5)
  face.material_index=0
 palette=bpy.data.materials.new('palet_'+name);palette.use_nodes=True
 tex=palette.node_tree.nodes.new('ShaderNodeTexImage');tex.image=atlas;tex.interpolation='Closest'
 palette.node_tree.links.new(tex.outputs['Color'],palette.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
 o.data.materials.clear();o.data.materials.append(palette)
 bpy.ops.wm.save_as_mainfile(filepath=str(SRC/(name+'.blend')))
 bpy.ops.export_scene.fbx(filepath=str(OUT/(name+'.fbx')),use_selection=True,object_types={'MESH'},axis_forward='-Z',axis_up='Y',bake_space_transform=True,path_mode='RELATIVE',embed_textures=False,bake_anim=False)
 print(name,tris,tuple(round(v,3) for v in o.dimensions))

def start():bpy.ops.wm.read_factory_settings(use_empty=True)

start(); wood=mat('kayu','a86b3c'); blue=mat('biru','9ad0ec'); cream=mat('krem','fff6e5'); pink=mat('selimut','f7a8a8')
for x in (-.55,.55):
 for y in (-.82,.82):box('kaki',(.13,.13,.27),(x,y,.135),wood)
box('rangka',(1.38,2.04,.14),(0,0,.32),wood);box('matras',(1.3,1.9,.24),(0,0,.51),blue,.07);box('bantal',(.85,.42,.14),(0,.65,.7),cream);box('selimut',(1.1,.55,.08),(0,-.55,.67),pink);export('prop_kasur',1500)

start(); wood=mat('kayu','a86b3c'); cream=mat('krem','fde8c8')
box('permukaan',(1.6,.8,.09),(0,0,.755),wood)
for x in (-.68,.68):
 for y in (-.3,.3):box('kaki',(.09,.09,.71),(x,y,.355),wood)
box('laci',(.42,.52,.16),(.42,0,.64),cream);export('prop_meja',1500)

start(); gray=mat('abu','8a8f99'); coral=mat('bata','e98a6b'); dark=mat('gelap','3b2a20')
box('meja dapur',(1,.9,.8),(0,0,.4),coral);box('kompor',(.78,.54,.13),(0,0,.865),gray)
for x in (-.22,.22):cyl('tungku',.12,.025,(x,0,.944),dark)
export('prop_kompor',1500)

start(); blue=mat('biru','7fb3e0'); dark=mat('gelap','3b2a20')
cyl('ember',.3,.45,(0,0,.225),blue,12);cyl('bib ir',.31,.035,(0,0,.46),dark,12);export('prop_ember',1500)

start(); skin=mat('kulit','ffd7b5'); hair=mat('rambut','3b2a20'); shirt=mat('baju','7cc6a4'); dark=mat('sepatu','6b4430')
box('badan',(.52,.31,.48),(0,0,.75),shirt,.12)
for x in (-.15,.15):box('kaki',(.16,.2,.48),(x,0,.3),dark,.06)
for x in (-.34,.34):box('lengan',(.16,.2,.44),(x,0,.75),shirt,.07)
bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.36,location=(0,0,1.18));bpy.context.object.data.materials.append(skin)
box('rambut',(.66,.55,.17),(0,-.03,1.47),hair,.08)
export('kar_mahasiswa',4000)

import json
def building(b):
 start()
 w,d,h=float(b['w']),float(b['d']),float(b['tinggi'])
 wall=mat('dinding',b.get('warna','#fde8c8').lstrip('#'))
 roof=mat('atap',b.get('atap','#e98a6b').lstrip('#'))
 accent=mat('aksen',(b.get('aksen') or '#7fb3e0').lstrip('#'))
 dark=mat('pintu','6b4430')
 body_h=h*.76
 box('massa gedung',(w,d,body_h),(0,0,body_h/2),wall,0)
 box('atap datar',(w,d,h-body_h),(0,0,(h+body_h)/2),roof,0)
 box('pintu utama',(min(1.25,w*.22),.045,min(2.2,body_h*.7)),(0,-d/2+.0225,min(2.2,body_h*.7)/2),dark,0)
 floors=2 if b.get('lantai',1)>1 or h>6 else 1
 for floor in range(floors):
  z=body_h*(floor+.52)/floors
  for x in (-w*.3,w*.3):box('jendela',(.9,.035,.75),(x,-d/2+.0175,z),accent,0)
 if b['id']=='kampus':
  for x in (-w*.37,w*.37):box('pilar',(.36,.4,body_h*.85),(x,-d/2+.2,body_h*.425),wall,0)
 elif b['id']=='warteg':box('etalase',(w*.4,.08,1.3),(w*.2,-d/2+.04,1.25),accent,0)
 elif b['id']=='warkop':box('kanopi',(w*.7,.65,.12),(0,-d/2+.325,body_h*.7),roof,0)
 if b.get('papan'):box('papan nama',(min(w*.72,6),.07,.5),(0,-d/2+.035,body_h-.38),accent,0)
 export('gedung_'+b['id'],6000)

data=json.loads((ROOT/'unity/MahasiswaSim3D/Assets/_Game/Data/dunia.json').read_text(encoding='utf-8'))
for b in data['bangunan']:
 if not b['id'].startswith('rumah'):building(b)
building({'id':'rumah','w':6,'d':6,'tinggi':4.5,'warna':'#ffd6a5','atap':'#e98a6b'})

start(); trunk=mat('batang','a86b3c'); leaf=mat('daun','4f9a45')
cyl('batang',.17,2.2,(0,0,1.1),trunk,8)
for z,r in ((2.0,.85),(2.6,.73),(3.15,.54)):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r,location=(0,0,z));bpy.context.object.data.materials.append(leaf)
export('prop_pohon',1500)

start(); pole=mat('tiang','606b78'); lamp=mat('lampu','fff1c4')
cyl('tiang',.085,4.1,(0,0,2.05),pole,8);box('lengan',(1.0,.12,.12),(.5,0,4.06),pole,0);box('kepala',(.5,.32,.2),(.9,0,3.96),lamp,0);export('prop_lampu',1500)

start(); frame=mat('rangka','6b7b8d'); roof=mat('atap','7fb3e0')
for x in (-1.35,1.35):
 for y in (-.55,.55):box('tiang',(.09,.09,2.45),(x,y,1.225),frame,0)
box('atap',(3.1,1.45,.16),(0,0,2.52),roof,0);box('bangku',(1.7,.5,.13),(0,0,.68),frame,0);export('prop_halte',1500)

start(); wood=mat('kayu','a86b3c'); canvas=mat('kain','e98a6b'); black=mat('roda','3b2a20')
box('badan',(1.5,.82,1.1),(0,0,1.08),wood,0);box('atap',(1.7,1.05,.14),(0,0,1.9),canvas,0)
for x in (-.55,.55):
 wheel=cyl('roda',.2,.09,(x,0,.2),black,10);wheel.rotation_euler[0]=1.57079632679
box('gagang',(.65,.12,.1),(1.04,0,1.25),wood,0);export('prop_gerobak',1500)
