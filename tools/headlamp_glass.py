"""Isolate a lens from a material shared with other glass on the same bike."""


def split_front_glass(model, part_name, material, front_z, lens):
    meshes = next(part["meshes"] for part in model["parts"] if part["name"] == part_name)
    source = next(mesh for mesh in meshes if mesh["material"] == material)
    positions = source["positions"]
    outputs = []
    for front, name in [(False, material), (True, lens)]:
        mesh = {"material": name, "indices": [], "positions": [], "normals": []}
        if "uvs" in source:
            mesh["uvs"] = []
        vertices = {}
        for a, b, c in zip(*[iter(source["indices"])] * 3):
            sides = [positions[3 * i + 2] > front_z for i in (a, b, c)]
            if any(sides) != all(sides):
                raise ValueError(f"Glass boundary cuts a triangle of {material}")
            if sides[0] != front:
                continue
            for i in (a, b, c):
                if i not in vertices:
                    vertices[i] = len(vertices)
                    for attr, stride in [("positions", 3), ("normals", 3), ("uvs", 2)]:
                        if attr in mesh:
                            mesh[attr].extend(source[attr][i * stride:(i + 1) * stride])
                mesh["indices"].append(vertices[i])
        if not vertices:
            raise ValueError(f"Missing glass geometry for {name}")
        outputs.append(mesh)
    index = meshes.index(source)
    meshes[index:index + 1] = outputs
    model["materials"][lens] = model["materials"][material].copy()
    if material in model.get("textures", {}):
        model["textures"][lens] = model["textures"][material]
