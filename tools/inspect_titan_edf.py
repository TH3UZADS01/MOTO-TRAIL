"""Read-only investigation of the supplied PiBoSo EDF variant."""
from pathlib import Path
import struct,zlib,json
b=Path(r'D:/mods/bikes/titan150luquine/model.edf').read_bytes()
u=lambda o:struct.unpack_from('<I',b,o)[0]
o=4
for block in range(4):
 print('BLOCK',block,'offset',o,'bounds',struct.unpack_from('<6f',b,o));o+=24
 nm=u(o);o+=4;print('materials',nm);o+=nm*56
 nv=u(o);o+=4;print('verts',nv,'start',o);o+=nv*72
 nt=u(o);o+=4;print('tris',nt,'start',o);o+=nt*12
 nn=u(o);o+=4;print('nodes',nn)
 for i in range(nn):
  base=o;name=b[o:o+100].split(b'\0')[0].decode();o+=232
  kind=u(o);nc=u(o+4);o+=8;children=struct.unpack_from('<'+'I'*nc,b,o);o+=nc*4
  ng=u(o);o+=4;groups=[]
  for j in range(ng):groups.append(struct.unpack_from('<6I',b,o));o+=24
  o+=32
  print('node',i,name,base,'kind',kind,'children',children,'groups',groups)
 nx=u(o) if u(o)<100 else 0; o+=4 if nx else 0;print('textures',nx)
 for i in range(nx):
  name=b[o:o+100].split(b'\0')[0].decode();kind,w,h=struct.unpack_from('<3I',b,o+100);size=u(o+132)
  raw=zlib.decompress(b[o+144:o+144+size],-15)
  print('tex',name,kind,w,h,size,len(raw));o+=144+size
 print('NEXT',o,b[o:o+40].hex())

