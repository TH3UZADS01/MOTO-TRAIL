import wave, array, math
from pathlib import Path
for p in Path('public/audio').glob('*original.wav'):
 with wave.open(str(p),'rb') as w:
  print(p.name,w.getparams())
  d=array.array('h',w.readframes(w.getnframes())); ch=w.getnchannels();sr=w.getframerate()
  print('RMS per second:',[round(math.sqrt(sum(v*v for v in d[i*sr*ch:(i+1)*sr*ch])/max(1,len(d[i*sr*ch:(i+1)*sr*ch])))) for i in range(min(15,w.getnframes()//sr))])
