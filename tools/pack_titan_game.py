"""Pack the Titan Blender export for the synchronous Three.js factory (Python + Pillow)."""
import base64
import io
import json
import struct
import sys
from pathlib import Path

from PIL import Image
from headlamp_glass import split_front_glass

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public/models"


def encoded(fmt, values):
    return base64.b64encode(struct.pack(f"<{len(values)}{fmt}", *values)).decode("ascii")


def pack_mesh(mesh, textured):
    # Fixed-point metres, with a maximum rounding error of 0.031 mm per axis.
    coords = [round(v * 16384) for v in mesh.pop("positions")]
    mesh["positions"] = encoded("h", coords)
    mesh["normals"] = encoded("h", [round(n * 32767) for n in mesh["normals"]])
    mesh["indices"] = encoded("H", mesh["indices"])
    uvs = mesh.pop("uvs")
    if textured:
        mesh["uvs"] = encoded("f", uvs)
    axes = [coords[i::3] for i in range(3)]
    lo = [min(axis) / 16384 for axis in axes]
    hi = [max(axis) / 16384 for axis in axes]
    mesh["bounds"] = lo + hi


def pack_images(staging, model):
    texture_dir = PUBLIC / "cg150-textures"
    texture_dir.mkdir(exist_ok=True)
    pngs = {}
    for path in dict.fromkeys(model["textures"].values()):
        name = Path(path).name
        with Image.open(staging / "cg150-textures" / name) as original:
            image = original.convert("RGBA")
        if all(low == high for low, high in image.getextrema()):
            image = image.crop((0, 0, 1, 1))
        elif image.getextrema()[3] == (255, 255):
            image = image.convert("RGB")
        png = io.BytesIO()
        image.save(png, "PNG", optimize=True)
        pngs[Path(name).stem] = png.getvalue()
        output = (texture_dir / name).with_suffix(".webp")
        image.save(output, "WEBP", lossless=True, exact=True, method=6)
        for material, url in model["textures"].items():
            if url == path:
                model["textures"][material] = "/models/cg150-textures/" + output.name
    return pngs


def repack_glb(staging, pngs):
    # Blender can reuse the original packed EDF image even after Image.scale().
    # Replace its image views with the exact game pixels, preserving GLB materials.
    source = (staging / "cg150.glb").read_bytes()
    length, = struct.unpack_from("<I", source, 12)
    gltf = json.loads(source[20:20 + length])
    binary = memoryview(source)[28 + length:]
    replacements = {im["bufferView"]: pngs[im["name"]] for im in gltf["images"]}
    packed = bytearray()
    for index, view in enumerate(gltf["bufferViews"]):
        offset = view.get("byteOffset", 0)
        data = replacements.get(index, binary[offset:offset + view["byteLength"]])
        packed.extend(bytes(-len(packed) % 4))
        view.update(byteOffset=len(packed), byteLength=len(data))
        packed.extend(data)
    gltf["buffers"][0]["byteLength"] = len(packed)
    packed.extend(bytes(-len(packed) % 4))
    header = json.dumps(gltf, separators=(",", ":")).encode()
    header += b" " * (-len(header) % 4)
    with (PUBLIC / "cg150.glb").open("wb") as out:
        out.write(struct.pack("<4sIII4s", b"glTF", 2, 28 + len(header) + len(packed), len(header), b"JSON"))
        out.write(header)
        out.write(struct.pack("<I4s", len(packed), b"BIN\0"))
        out.write(packed)


def main(staging):
    model = json.loads((staging / "cg150-model.json").read_text())
    # The outer lens shares glass with the instrument cluster, ahead of the reflector.
    split_front_glass(model, "Steering", "Steering_Material13", .15, "HeadlampGlass")
    pngs = pack_images(staging, model)
    repack_glb(staging, pngs)
    for part in model["parts"]:
        for mesh in part["meshes"]:
            pack_mesh(mesh, mesh["material"] in model["textures"])
    (ROOT / "src/assets/cg150-model.json").write_text(json.dumps(model, separators=(",", ":")))


if __name__ == "__main__":
    main(Path(sys.argv[1]))
