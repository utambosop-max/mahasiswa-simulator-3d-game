"""Buat kasur kos level 1 dan ekspor FBX untuk Unity."""

from pathlib import Path
from tempfile import TemporaryDirectory

import bpy
from mathutils import Vector


REPO = Path(__file__).resolve().parents[2]
FBX = REPO / "unity/MahasiswaSim3D/Assets/_Game/Models/prop_kasur.fbx"
BLEND = REPO / "blender/sumber/prop_kasur.blend"
NAMA = "prop_kasur"
MAKS_SEGITIGA = 1_500
PALET = ("9ad0ec", "fff6e5", "f7a8a8")


def rgb_srgb(kode):
    return tuple(int(kode[i:i + 2], 16) / 255 for i in (0, 2, 4))


def rgb_linear(kode):
    return tuple(
        v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
        for v in rgb_srgb(kode)
    )


def buat_material(lokasi_png):
    # Tiga jalur warna solid. UV setiap bagian menunjuk tepat ke pusat jalurnya.
    lebar_jalur = 4
    lebar = lebar_jalur * len(PALET)
    tinggi = 4
    gambar = bpy.data.images.new("palet_kasur", width=lebar, height=tinggi)
    gambar.colorspace_settings.name = "sRGB"
    baris = []
    for kode in PALET:
        baris.extend((*rgb_srgb(kode), 1.0) * lebar_jalur)
    gambar.pixels.foreach_set(baris * tinggi)
    gambar.filepath_raw = str(lokasi_png)
    gambar.file_format = "PNG"
    gambar.save()
    gambar.pack()
    gambar.filepath_raw = "//palet_kasur.png"

    bahan = bpy.data.materials.new("mat_kasur")
    bahan.diffuse_color = (*rgb_linear(PALET[0]), 1)
    nodes = bahan.node_tree.nodes
    principled = nodes.get("Principled BSDF")
    principled.inputs["Roughness"].default_value = 0.85
    citra = nodes.new("ShaderNodeTexImage")
    citra.image = gambar
    citra.interpolation = "Closest"
    bahan.node_tree.links.new(citra.outputs["Color"], principled.inputs["Base Color"])
    return bahan


def kotak_bulat(judul, ukuran, posisi, bevel, bahan, indeks_warna):
    bpy.ops.mesh.primitive_cube_add(size=1, location=posisi)
    objek = bpy.context.object
    objek.name = judul
    objek.dimensions = ukuran
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    bulat = objek.modifiers.new("Sudut lembut", "BEVEL")
    bulat.width = bevel
    bulat.segments = 3
    bpy.ops.object.modifier_apply(modifier=bulat.name)
    for bidang in objek.data.polygons:
        bidang.use_smooth = True
    normal = objek.modifiers.new("Normal berbobot", "WEIGHTED_NORMAL")
    bpy.ops.object.modifier_apply(modifier=normal.name)

    objek.data.materials.append(bahan)
    uv = objek.data.uv_layers.active
    tengah_warna = (indeks_warna + 0.5) / len(PALET)
    for titik_uv in uv.data:
        titik_uv.uv = (tengah_warna, 0.5)
    return objek


def buat_model(bahan):
    # Sisi depan di Blender adalah -Y. Bantal ada di belakang.
    alas = kotak_bulat("alas", (1.30, 1.90, 0.18), (0, 0, 0.09), 0.07, bahan, 0)
    bantal = kotak_bulat("bantal", (0.85, 0.42, 0.14), (0, 0.65, 0.249), 0.06, bahan, 1)
    selimut = kotak_bulat("selimut_lipat", (1.00, 0.50, 0.09), (0, -0.55, 0.224), 0.04, bahan, 2)

    for bagian in (alas, bantal, selimut):
        bagian.select_set(True)
    bpy.context.view_layer.objects.active = alas
    bpy.ops.object.join()
    alas.name = NAMA
    alas.data.name = NAMA
    # Terapkan translasi alas ke mesh agar pivot tepat di tengah bawah.
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return alas


def periksa(objek):
    mesh = objek.data
    mesh.calc_loop_triangles()
    segitiga = len(mesh.loop_triangles)
    assert 0 < segitiga <= MAKS_SEGITIGA, f"Jumlah segitiga: {segitiga}"
    assert len(mesh.materials) == 1, "Model harus memakai satu material"
    sudut_dunia = [objek.matrix_world @ Vector(pos) for pos in objek.bound_box]
    bawah = [min(pos[sumbu] for pos in sudut_dunia) for sumbu in range(3)]
    atas = [max(pos[sumbu] for pos in sudut_dunia) for sumbu in range(3)]
    ukuran = tuple(a - b for a, b in zip(atas, bawah))
    assert all(abs(a - b) < 0.001 for a, b in zip(ukuran, (1.30, 1.90, 0.319))), (
        f"Ukuran keliru: {ukuran}, transformasi: {objek.matrix_world}"
    )
    assert objek.matrix_world.translation.length < 0.0001, "Pivot bergeser"
    assert abs(bawah[2]) < 0.0001, f"Jarak dari lantai: {bawah[2]:.6f} m"
    assert all(abs(atas[sumbu] + bawah[sumbu]) < 0.0001 for sumbu in (0, 1))
    u = {round(uv.uv.x, 3) for uv in mesh.uv_layers.active.data}
    assert u == {0.167, 0.5, 0.833}, f"Jalur warna UV salah: {u}"
    posisi_bagian = {0.5: [], 0.833: []}
    for loop in mesh.loops:
        jalur = round(mesh.uv_layers.active.data[loop.index].uv.x, 3)
        if jalur in posisi_bagian:
            posisi = objek.matrix_world @ mesh.vertices[loop.vertex_index].co
            posisi_bagian[jalur].append(posisi.y)
    assert min(posisi_bagian[0.5]) > 0, "Bantal harus di belakang"
    assert max(posisi_bagian[0.833]) < 0, "Selimut harus di depan"
    print(f"{NAMA}: {segitiga} segitiga, ukuran {ukuran}, satu material, pivot lantai")


def uji_impor():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.ops.import_scene.fbx(filepath=str(FBX), use_image_search=False)
    (objek,) = tuple(bpy.context.scene.objects)
    assert objek.name == NAMA and objek.type == "MESH"
    periksa(objek)
    bahan = objek.data.materials[0]
    (citra,) = tuple(node.image for node in bahan.node_tree.nodes if node.type == "TEX_IMAGE")
    assert citra.packed_file and tuple(citra.size) == (12, 4)
    for indeks, kode in enumerate(PALET):
        awal = (2 * citra.size[0] + 4 * indeks + 2) * 4
        warna = "".join(f"{round(c * 255):02x}" for c in citra.pixels[awal:awal + 3])
        assert warna == kode, f"Palet FBX #{warna}, seharusnya #{kode}"
    print("Impor ulang FBX lulus. Palet tertanam dan terbaca dari FBX.")


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    satuan = bpy.context.scene.unit_settings
    satuan.system = "METRIC"
    satuan.scale_length = 1.0
    BLEND.parent.mkdir(parents=True, exist_ok=True)
    FBX.parent.mkdir(parents=True, exist_ok=True)

    with TemporaryDirectory() as sementara:
        bahan = buat_material(Path(sementara) / "palet_kasur.png")
        objek = buat_model(bahan)
        periksa(objek)
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=str(BLEND), relative_remap=False)
        bpy.ops.export_scene.fbx(
            filepath=str(FBX),
            use_selection=True,
            object_types={"MESH"},
            axis_forward="-Z",
            axis_up="Y",
            global_scale=1.0,
            apply_unit_scale=True,
            apply_scale_options="FBX_SCALE_UNITS",
            bake_space_transform=True,
            path_mode="COPY",
            embed_textures=True,
            bake_anim=False,
            use_triangles=True,
        )
        uji_impor()


if __name__ == "__main__":
    main()
