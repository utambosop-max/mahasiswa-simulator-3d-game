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

