from pathlib import Path
import bpy
from mathutils import Vector

root = Path(__file__).resolve().parents[2]
models = root / 'unity/MahasiswaSim3D/Assets/_Game/Models'
names = ['prop_kasur','prop_meja','prop_kompor','prop_ember','kar_mahasiswa',
         'prop_pohon','prop_lampu','prop_halte','prop_gerobak']
names += ['gedung_'+name for name in ('kos','kampus','warteg','warkop','minimarket',
          'perpus','klinik','warnet','fotokopi','laundry','kafe','bank','gor',
          'karier','tani','pasar','salon','polisi','rumah')]
names += ['prop_'+name for name in ('pohon_kelapa','pohon_pisang','lampu_lalin','jembatan',
          'bangku','lapak','saung','warung','pertamini','bendera','gapura','menara_air','motor')]
names.append('gedung_petak')
for name in names:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(models / (name+'.fbx')), use_image_search=False)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    assert len(meshes) == 1, (name, len(meshes))
    mesh = meshes[0]
    mesh.data.calc_loop_triangles()
    tris = len(mesh.data.loop_triangles)
    limit = 6000 if name.startswith('gedung') else 4000 if name.startswith('kar_') else 1500
    assert 0 < tris <= limit, (name, tris)
    assert len(mesh.data.materials) == 1, (name, len(mesh.data.materials))
    assert min(mesh.dimensions) > 0, (name, tuple(mesh.dimensions))
    assert abs(min((mesh.matrix_world @ Vector(v)).z for v in mesh.bound_box)) < .08, name
    print('OK', name, tris)
print('LULUS', len(names), 'FBX')
