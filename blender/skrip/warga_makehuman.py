"""Buat FBX mahasiswa dari aset sistem MPFB (CC0) melalui Blender.
blender -b --factory-startup --python warga_makehuman.py -- <mpfb/src> <aset-sistem>
"""
import gzip
from math import sin, cos, pi
from pathlib import Path
import sys

import bpy
import addon_utils
from mathutils import Vector

source, assets = map(Path, sys.argv[sys.argv.index("--") + 1:])
sys.path.insert(0, str(source))
# A source checkout is enabled for this Blender process only.
extension_path_user = bpy.utils.extension_path_user
try:
    bpy.utils.extension_path_user = lambda package: str(assets / ".mpfb")
    addon_utils.enable("mpfb", default_set=True)
finally:
    bpy.utils.extension_path_user = extension_path_user
from mpfb.services.humanservice import HumanService
from mpfb.services.targetservice import TargetService
from mpfb.services.exportservice import ExportService

output = Path(__file__).resolve().parents[2] / "unity/MahasiswaSim3D/Assets/_Game/Models/Resources/Penampilan"
output.mkdir(parents=True, exist_ok=True)
textures = output / "Tekstur"
textures.mkdir(exist_ok=True)

presets = [
    ("mahasiswa", True, .47, .52, .49, "male_casualsuit03", "short01"),
    ("mahasiswi", False, .46, .47, .48, "female_casualsuit01", "bob01"),
    ("bima", True, .49, .56, .55, "male_casualsuit05", "short01"),
    ("sari", False, .45, .42, .43, "female_casualsuit01", "long01"),
    ("ratna", False, .61, .56, .44, "female_elegantsuit01", "bob01"),
    ("yanti", False, .55, .61, .43, "female_elegantsuit01", "bob01"),
    ("hendra", True, .64, .54, .51, "male_elegantsuit01", "short01"),
    ("alya", False, .49, .48, .53, "female_casualsuit01", "bob01"),
    ("tari", False, .45, .53, .47, "female_casualsuit01", "long01"),
    ("keira", False, .44, .44, .55, "female_casualsuit01", "bob01"),
    ("dina", False, .46, .50, .43, "female_casualsuit01", "long01"),
    ("reno", True, .51, .45, .54, "male_casualsuit06", "short01"),
]

bones = {"pelvis": "Hips", "spine_01": "Spine", "spine_02": "Chest",
         "spine_03": "UpperChest", "neck_01": "Neck", "head": "Head"}
limbs = {"clavicle": "Shoulder", "upperarm": "UpperArm", "lowerarm": "LowerArm",
         "hand": "Hand", "thigh": "UpperLeg", "calf": "LowerLeg", "foot": "Foot", "ball": "Toes"}

def texture(obj, name, diffuse):
    diffuse = Path(diffuse)
    target = textures / (name + ".png")
    if not target.exists():
        image = bpy.data.images.load(str(diffuse), check_existing=True)
        if max(image.size) > 1024:
            ratio = 1024 / max(image.size)
            image.scale(*(round(n * ratio) for n in image.size))
        image.file_format = "PNG"
        image.save(filepath=str(target))
    mat = bpy.data.materials.new(name)
    obj.data.materials.clear()
    obj.data.materials.append(mat)

def asset(body, folder, name, kind, material, diffuse=None):
    path = assets / folder / name
    item = HumanService.add_mhclo_asset(str(path / (name + ".mhclo")), body, asset_type=kind,
                                      material_type="GAMEENGINE", subdiv_levels=0, import_subrig=False)
    item.name = material
    if diffuse is None:
        diffuse = next(image for image in path.glob("*.png") if not image.stem.endswith(("_normal", "_ao")))
    texture(item, material, diffuse)
    return item

def blend(body, name, group, targets):
    files = source / "mpfb/data/targets" / group
    if not body.data.shape_keys:
        body.shape_key_add(name="Basis")
    result = body.shape_key_add(name=name, from_mix=False)
    result.value = 0.0
    for filename in targets:
        with gzip.open(files / (filename + ".target.gz"), "rt") as compressed:
            for line in compressed:
                if not line.strip() or line.startswith("#"):
                    continue
                index, x, y, z = line.split()
                delta = Vector((float(x), -float(z), float(y))) * .1
                vertex = int(index)
                result.data[vertex].co += delta

def headscarf(body, rig, tone):
    # Smooth wrapped cloth follows the head above the opening and the chest below.
    head = rig.data.bones["head"]
    scalp = max(v.co.z for v in body.data.vertices if abs(v.co.x) < .12)
    center = head.head_local
    rings = [
        (.002, .002, .009, 0), (.054, .064, -.008, 0),
        (.090, .098, -.035, .35), (.105, .102, -.072, .82),
        (.117, .105, -.135, 1.05), (.131, .108, -.191, .84),
        (.121, .108, -.236, .26), (.141, .120, -.271, 0),
        (.199, .161, -.303, 0), (.224, .174, -.345, 0),
    ]
    count = 37
    points, faces = [], []
    for row, (width, depth, z, gap) in enumerate(rings):
        for col in range(count):
            angle = gap + (2 * pi - 2 * gap) * col / (count - 1)
            fold = .003 * sin(angle * 7 + z * 15) * min(1, width * 10)
            points.append((center.x + (width + fold) * sin(angle),
                           center.y + .006 - (depth + fold) * cos(angle),
                           scalp + z + .009 * sin(angle * 3) * (row / len(rings))))
            if row and col:
                current = row * count + col
                faces.append((current, current - 1, current - 1 - count, current - count))
    mesh = bpy.data.meshes.new("Lipatan kain")
    mesh.from_pydata(points, [], faces)
    mesh.update()
    kain = bpy.data.objects.new("Hijab", mesh)
    bpy.context.collection.objects.link(kain)
    kain.parent = rig
    cranial = kain.vertex_groups.new(name="head")
    shoulder = kain.vertex_groups.new(name="spine_03")
    for row in range(len(rings)):
        weight = max(0, min(1, (8 - row) / 3))
        indices = list(range(row * count, (row + 1) * count))
        cranial.add(indices, weight, "REPLACE")
        shoulder.add(indices, 1 - weight, "REPLACE")
    deform = kain.modifiers.new("Deformasi kain", "ARMATURE")
    deform.object = rig
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    mesh.materials.append(bpy.data.materials.new("hijab_" + tone))

def generate(spec):
    ident, male, age, weight, height, outfit, hair = spec
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    macro = TargetService.get_default_macro_info_dict()
    macro.update(gender=float(male), age=age, weight=weight, height=height,
                 race={"asian": .86, "caucasian": .04, "african": .10})
    body = HumanService.create_human(macro_detail_dict=macro)
    TargetService.bake_targets(body)
    body.name = "Tubuh"
    gender = "male" if male else "female"
    cohort = "middleage" if age >= .60 else "young"
    skin = "kulit_" + cohort + "_" + gender
    skin_dir = assets / "skins" / (cohort + "_asian_" + gender)
    texture(body, skin, next(skin_dir.glob("*.png")))
    rig = HumanService.add_builtin_rig(body, "game_engine")
    rig.name = "Humanoid"
    asset(body, "clothes", outfit, "Clothes", "baju_" + outfit)
    asset(body, "eyes", "low-poly", "Eyes", "mata", assets / "eyes/materials/brown_eye.png")
    asset(body, "eyebrows", "eyebrow002", "Eyebrows", "alis")
    asset(body, "eyelashes", "eyelashes01", "Eyelashes", "bulu_mata")
    styles = ("short01", "bob01", "long01") if ident.startswith("mahasiswa") or ident == "mahasiswi" else (hair,)
    # Multiple selectable hairstyles for players must not mask the scalp.
    if ident in ("ratna", "alya", "yanti"):
        headscarf(body, rig, ident)
    else:
        for style in styles:
            asset(body, "hair", style, "Hair", "rambut_" + style)
    blend(body, "WajahLebar", "head", ["head-scale-horiz-incr"])
    blend(body, "WajahSempit", "head", ["head-scale-horiz-decr"])
    blend(body, "Kedip", "expression/units/asian", ["eye-left-closure", "eye-right-closure"])
    blend(body, "Bicara", "expression/units/asian", ["mouth-open"])
    blend(body, "Senyum", "expression/units/asian", ["mouth-corner-puller"])
    ExportService.bake_modifiers_remove_helpers(body, bake_masks=True, bake_subdiv=False,
                                                remove_helpers=True, also_proxy=True)
    for shape in body.data.shape_keys.key_blocks:
        shape.value = 0
    renamed = dict(bones)
    for short, long in (("l", "Left"), ("r", "Right")):
        renamed.update({stem + "_" + short: long + part for stem, part in limbs.items()})
    for b in rig.data.bones:
        if b.name in renamed:
            b.name = renamed[b.name]
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for child in rig.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.fbx(filepath=str(output / (ident + ".fbx")), use_selection=True,
                             add_leaf_bones=False, bake_anim=False, use_mesh_modifiers=False,
                             axis_forward="-Z", axis_up="Y")
    print("EKSPOR", ident, flush=True)

for preset in presets:
    generate(preset)
