"""Prepare the user's acceleration/coast recordings, preserving their timbre.
Originals are read-only. Remove DC, crossfade the loop seam and leave peak headroom.
"""
from pathlib import Path
import wave,array
root=Path(__file__).resolve().parents[1]
sources=Path('D:/mods/bikes/TODAY 300 PREPARADA JOTA')
for kind in ['on','off']:
    with wave.open(str(sources/(kind+'_high.wav')),'rb') as w:
        assert w.getsampwidth()==2 and w.getnchannels()==1
        rate=w.getframerate();samples=list(array.array('h',w.readframes(w.getnframes())))
    mean=sum(samples)/len(samples);samples=[v-mean for v in samples]
    n=min(int(rate*.06),len(samples)//8)
    seam=[samples[-n+i]*(1-i/(n-1))+samples[i]*i/(n-1) for i in range(n)]
    samples=samples[n:-n]+seam
    gain=24000/max(1,max(abs(x) for x in samples))
    pcm=array.array('h',[round(v*gain) for v in samples])
    out=root/'public'/'audio'/('sahara-'+kind+'-high.wav')
    with wave.open(str(out),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(pcm.tobytes())
    print(out.name,'seconds',round(len(pcm)/rate,3),'peak',max(abs(v) for v in pcm))
