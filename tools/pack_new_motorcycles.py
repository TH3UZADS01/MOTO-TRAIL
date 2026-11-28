import bpy,json,base64,struct,sys
from pathlib import Path
root=Path('D:/PROJETOS/MOTOTRAIL')
sys.path.insert(0,str(root/'tools'))
from articulation_parts import correct_articulation
for id in ['twister','r1200gs']:
 if '--' in sys.argv and id not in sys.argv[sys.argv.index('--')+1:]:continue
 bpy.ops.wm.open_mainfile(filepath=str(root/'assets'/id/f'{id}.blend'))
 tex=root/'public/models'/f'{id}-textures';tex.mkdir(exist_ok=True)
 data={'materials':{},'textures':{},'parts':[]}
 for mat in bpy.data.materials:
  if not mat.use_nodes:continue
  bs=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if not bs:continue
  c=bs.inputs['Base Color'].default_value
  data['materials'][mat.name]={'color':list(c[:3]),'roughness':bs.inputs['Roughness'].default_value,'metalness':bs.inputs['Metallic'].default_value}
  links=bs.inputs['Base Color'].links
  if links and links[0].from_node.type=='TEX_IMAGE':
   im=links[0].from_node.image
   filename=str(len(data['textures']))+'.png';im.filepath_raw=str(tex/filename);im.file_format='PNG';im.save()
   data['textures'][mat.name]='/models/'+id+'-textures/'+filename
 def game(p):return [p.x,p.z,-p.y]
 def pack(values,fmt):return base64.b64encode(struct.pack('<'+fmt*len(values),*values)).decode()
 for name in ['Body','Steering','FrontSuspension','RearWheel','FrontWheel']:
  g=bpy.data.objects[name];meshes=[]
  for o in g.children:
   if o.type!='MESH':continue
   m=o.data;m.calc_loop_triangles();uv=m.uv_layers.active;records={}
   for t in m.loop_triangles:
    mat=m.materials[t.material_index].name
    rec=records.setdefault(mat,{'p':[],'n':[],'uv':[],'i':[],'unique':{}})
    for li in t.loops:
     p=o.matrix_local@m.vertices[m.loops[li].vertex_index].co
     n=o.matrix_local.to_3x3()@m.corner_normals[li].vector
     coords=game(p);normal=game(n);u=list(uv.data[li].uv) if uv else [0,0]
     key=tuple(round(x,6) for x in coords+normal+u)
     if key not in rec['unique']:
      rec['unique'][key]=len(rec['p'])//3;rec['p']+=coords;rec['n']+=[round(max(-1,min(1,x))*32767) for x in normal];rec['uv']+=u
     rec['i'].append(rec['unique'][key])
   for mat,r in records.items():
    meshes.append({'material':mat,'positions':pack(r['p'],'f'),'normals':pack(r['n'],'h'),'uvs':pack(r['uv'],'f'),'indices':pack(r['i'],'I')})
  data['parts'].append({'name':name,'parent':g.parent.name if g.parent else None,'position':game(g.location),'meshes':meshes})
 correct_articulation(id,data)
 (root/'src/assets'/f'{id}-model.json').write_text(json.dumps(data,separators=(',',':')))
