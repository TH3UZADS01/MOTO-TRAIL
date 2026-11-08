"""Rebuild edited CC0 recordings, mono 22050 Hz, without extra dependencies."""
from pathlib import Path
import wave,array,math,shutil
root=Path(__file__).resolve().parent.parent
originals=root/'tools/audio-originals';originals.mkdir(exist_ok=True)
for p in (root/'public/audio').glob('*-original.wav'):
 shutil.move(str(p),str(originals/p.name))
def read(name):
 with wave.open(str(originals/(name+'-original.wav')),'rb') as w:
  sr=w.getframerate();ch=w.getnchannels();a=array.array('h',w.readframes(w.getnframes()))
  return [sum(a[i:i+ch])/ch/32768 for i in range(0,len(a),ch)],sr
def edit(source,out,start,end,loop=True):
 a,sr=read(source);a=a[int(start*sr):int(end*sr)];mean=sum(a)/len(a);a=[x-mean for x in a]
 # Low pass before downsampling, then linear resampling.
 prev=0.;filtered=[]
 for x in a:
  prev+=.55*(x-prev);filtered.append(prev)
 a=[filtered[min(int(i*sr/22050),len(filtered)-1)] for i in range(int(len(filtered)*22050/sr))]
 if loop:
  n=min(int(.12*22050),len(a)//5)
  seam=[a[-n+i]*(1-i/(n-1))+a[i]*(i/(n-1)) for i in range(n)]
  a=a[n:-n]+seam
 else:
  n=min(400,len(a)//4)
  for i in range(n):a[i]*=i/n;a[-1-i]*=i/n
 peak=max(abs(v) for v in a);gain=.72/max(peak,.0001)
 pcm=array.array('h',[int(max(-1,min(1,x*gain))*32767) for x in a])
 with wave.open(str(root/'public/audio'/out),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes(pcm.tobytes())
 print(out,len(a)/22050)
edit('engine','engine-idle.wav',3.3,5.2)
edit('engine','engine-load.wav',8.6,10.2)
edit('moped','moped-idle.wav',.9,2.2)
edit('moped','moped-load.wav',2.8,4.1)
edit('wind','wind.wav',5,17)
a,sr=read('horn');onset=next(i for i,v in enumerate(a) if abs(v)>.12)/sr
edit('horn','horn.wav',max(0,onset-.02),onset+.35,False)
