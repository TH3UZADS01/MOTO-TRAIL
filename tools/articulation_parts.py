import base64
import json
from array import array
from collections import defaultdict
from pathlib import Path

def unpack(encoded, kind):
    values = array(kind)
    values.frombytes(base64.b64decode(encoded))
    return values

def components(mesh, offset):
    positions = unpack(mesh['positions'], 'f')
    indices = unpack(mesh['indices'], 'I')
    points = list(zip(*[iter(positions)] * 3))
    # Weld UV and normal seams for connectivity only. Render vertices stay intact.
    parent = list(range(len(points)))
    by_position = {}
    for i, point in enumerate(points):
        parent[i] = by_position.setdefault(tuple(round(v, 5) for v in point), i)
    def root(i):
        while i != parent[i]:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    for a, b, c in zip(*[iter(indices)] * 3):
        parent[root(b)] = root(a)
        parent[root(c)] = root(a)
    islands = defaultdict(list)
    for i in indices:
        islands[root(i)].append(i)
    for faces in islands.values():
        axes = list(zip(*(points[i] for i in set(faces))))
        lo = tuple(min(axis) + d for axis, d in zip(axes, offset))
        hi = tuple(max(axis) + d for axis, d in zip(axes, offset))
        yield lo, hi, faces

def destination(model, part, material, lo, hi):
    x, y, z = [(a + b) / 2 for a, b in zip(lo, hi)]
    if model == 'twister' and part == 'Steering':
        # Cap, ring and the separate letters on either side of the tank.
        if abs(x) < .19 and .79 < y < .90 and .10 < z < .23:
            return 'Body'
    if model == 'r1200gs':
        if part == 'Steering' and material == 'object_13' and abs(x) > .28 and y < 1:
            return 'Body'
        if part == 'Body' and material in ('object_14', 'object_15'):
            if .21 < abs(x) < .32 and 1.12 < y < 1.21 and .22 < z < .33:
                return 'Steering'
    return part

def subset(mesh, faces, translation):
    originals = list(dict.fromkeys(faces))
    lookup = {old: new for new, old in enumerate(originals)}
    result = {'material': mesh['material']}
    for key, kind, stride in [('positions','f',3), ('normals','h',3), ('uvs','f',2)]:
        src = unpack(mesh[key], kind)
        values = array(kind)
        for old in originals:
            start = old * stride
            if key == 'positions':
                values.extend(src[start+j] + translation[j] for j in range(3))
            else:
                values.extend(src[start:start+stride])
        result[key] = base64.b64encode(values.tobytes()).decode()
    indices = array('I', (lookup[i] for i in faces))
    result['indices'] = base64.b64encode(indices.tobytes()).decode()
    return result

def correct_articulation(model, data):
    parts = {p['name']: p for p in data['parts']}
    moved = []
    for part in ('Body','Steering'):
        source = parts[part]
        retained = []
        for mesh in source['meshes']:
            by_part = defaultdict(list)
            for lo, hi, faces in components(mesh, source['position']):
                target = destination(model, part, mesh['material'], lo, hi)
                by_part[target].extend(faces)
            if len(by_part) == 1 and part in by_part:
                retained.append(mesh)
                continue
            for target, faces in by_part.items():
                delta = [a-b for a,b in zip(source['position'],parts[target]['position'])]
                piece = subset(mesh, faces, delta)
                if target == part:
                    retained.append(piece)
                else:
                    moved.append((target, piece))
        source['meshes'] = retained
    for target, mesh in moved:
        parts[target]['meshes'].append(mesh)

if __name__ == '__main__':
    for model in ('twister','r1200gs'):
        path = Path(__file__).resolve().parents[1] / 'src/assets' / (model+'-model.json')
        data = json.loads(path.read_bytes())
        correct_articulation(model, data)
        path.write_text(json.dumps(data,separators=(',',':')), encoding='utf-8')
