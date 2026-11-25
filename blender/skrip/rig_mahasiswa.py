"""Tambahkan rig sederhana pada model mahasiswa, ekspor ulang FBX berwarna."""
from pathlib import Path
from math import sin, tau, pi
import bpy

root = Path(__file__).resolve().parents[2]
source = root / 'blender/sumber/kar_mahasiswa.blend'
target = root / 'unity/MahasiswaSim3D/Assets/_Game/Models/kar_mahasiswa.fbx'
bpy.ops.wm.open_mainfile(filepath=str(source))
mesh = bpy.data.objects['kar_mahasiswa']
old = bpy.data.objects.get('RigMahasiswa')
if old: bpy.data.objects.remove(old, do_unlink=True)
for group in list(mesh.vertex_groups): mesh.vertex_groups.remove(group)
for mod in list(mesh.modifiers):
    if mod.type == 'ARMATURE': mesh.modifiers.remove(mod)

data = bpy.data.armatures.new('RigMahasiswa')
rig = bpy.data.objects.new('RigMahasiswa', data)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')

def bone(name, head, tail, parent=None):
    b = data.edit_bones.new(name)
    b.head, b.tail = head, tail
    if parent: b.parent = data.edit_bones[parent]

bone('Akar',(0,0,.02),(0,0,.55))
bone('Badan',(0,0,.55),(0,0,1.03),'Akar')
bone('Kepala',(0,0,1.03),(0,0,1.48),'Badan')
bone('LenganKiri',(-.27,0,.94),(-.36,0,.56),'Badan')
bone('LenganKanan',(.27,0,.94),(.36,0,.56),'Badan')
bone('KakiKiri',(-.15,0,.55),(-.15,0,.06),'Akar')
bone('KakiKanan',(.15,0,.55),(.15,0,.06),'Akar')
bpy.ops.object.mode_set(mode='OBJECT')

groups = {name: mesh.vertex_groups.new(name=name) for name in ('Akar','Badan','Kepala','LenganKiri','LenganKanan','KakiKiri','KakiKanan')}
neighbors = [[] for _ in mesh.data.vertices]
for edge in mesh.data.edges:
    a, b = edge.vertices
    neighbors[a].append(b)
    neighbors[b].append(a)
remaining = set(range(len(neighbors)))
while remaining:
    pending = [remaining.pop()]
    part = []
    while pending:
        index = pending.pop()
        part.append(index)
        for other in neighbors[index]:
            if other in remaining:
                remaining.remove(other)
                pending.append(other)
    x = sum(mesh.data.vertices[i].co.x for i in part) / len(part)
    z = sum(mesh.data.vertices[i].co.z for i in part) / len(part)
    if z >= 1.02: name = 'Kepala'
    elif z < .53: name = 'KakiKiri' if x < 0 else 'KakiKanan'
    elif x < -.25: name = 'LenganKiri'
    elif x > .25: name = 'LenganKanan'
    else: name = 'Badan'
    groups[name].add(part, 1, 'REPLACE')
mesh.parent = rig
modifier = mesh.modifiers.new('Rig', 'ARMATURE')
modifier.object = rig
bpy.context.scene.render.fps = 30
rig.animation_data_create()
for name in ('Idle', 'Jalan', 'Duduk', 'Tidur'):
    old_action = bpy.data.actions.get(name)
    if old_action:
        bpy.data.actions.remove(old_action)
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data.action = action
    for frame in range(1, 32, 5):
        wave = sin(tau * (frame - 1) / 30)
        for joint in rig.pose.bones:
            joint.rotation_mode = 'XYZ'
            joint.rotation_euler = (0, 0, 0)
            if name == 'Jalan':
                joint.rotation_euler.x = {'KakiKiri': .4, 'KakiKanan': -.4,
                    'LenganKiri': .28, 'LenganKanan': -.28}.get(joint.name, 0) * wave
            elif name == 'Idle' and joint.name == 'Badan':
                joint.rotation_euler.x = .025 * wave
            elif name == 'Duduk' and joint.name.startswith('Kaki'):
                joint.rotation_euler.x = pi / 2
            elif name == 'Tidur' and joint.name == 'Akar':
                joint.rotation_euler.x = -pi / 2
            joint.keyframe_insert(data_path='rotation_euler', frame=frame)
rig.animation_data.action = None
for joint in rig.pose.bones:
    joint.rotation_euler = (0, 0, 0)
bpy.context.scene.frame_set(1)
bpy.context.preferences.filepaths.save_version = 0
bpy.context.scene.cursor.location = (0,0,0)
bpy.ops.wm.save_as_mainfile(filepath=str(source))
bpy.ops.object.select_all(action='DESELECT')
mesh.select_set(True); rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.fbx(filepath=str(target), use_selection=True, object_types={'MESH','ARMATURE'},
    axis_forward='-Z', axis_up='Y', add_leaf_bones=False,
    path_mode='RELATIVE', embed_textures=False, bake_anim=True,
    bake_anim_use_all_actions=True, bake_anim_use_nla_strips=False)
print('RIG_OK', len(mesh.data.vertices), len(data.bones), target)
