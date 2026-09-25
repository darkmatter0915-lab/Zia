"""Pack generated transparent key poses into a predictable 3x2 runtime atlas.
Run with the directory holding the five named source PNGs. Cropping/packing only;
no background removal, painted additions or generated geometry.
"""
from pathlib import Path
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
source=Path(sys.argv[1]); out=Path(sys.argv[2]); out.mkdir(parents=True,exist_ok=True)
manifest=json.loads((out/'manifest.json').read_text()) if (out/'manifest.json').exists() else {}
for name in sys.argv[3:] or ['hero','guard','runner','seer','boss']:
    im=Image.open(source/(name+'.png')).convert('RGBA')
    alpha=np.array(im.getchannel('A'))
    labels,count=ndimage.label(alpha>128)
    objects=[]
    for label,region in enumerate(ndimage.find_objects(labels),1):
        if region is None: continue
        area=np.sum(labels[region]==label)
        if area<10000: continue
        y,x=region; objects.append((x.start,y.start,x.stop,y.stop,area))
    if len(objects)!=6: raise RuntimeError(f'{name}: expected 6 main silhouettes, found {len(objects)}')
    objects.sort(key=lambda p: (int((p[1]+p[3])/2/(im.height/2)),(p[0]+p[2])/2))
    # Common scale per character preserves differences between stance and crouch.
    bounds=[(max(0,x-6),max(0,y-6),min(im.width,r+6),min(im.height,b+6)) for x,y,r,b,_ in objects]
    factor=min(226/max(r-x for x,y,r,b in bounds),226/max(b-y for x,y,r,b in bounds))
    atlas=Image.new('RGBA',(768,512))
    for i,box in enumerate(bounds):
        frame=im.crop(box); frame=frame.resize((round(frame.width*factor),round(frame.height*factor)),Image.Resampling.LANCZOS)
        # 240 is the common foot pivot, 128 is the horizontal pivot.
        atlas.alpha_composite(frame,(i%3*256+128-frame.width//2,i//3*256+240-frame.height))
    atlas.save(out/(name+'.webp'),'WEBP',quality=91,method=6,exact=True)
    manifest[name]={'file':name+'.webp','width':768,'height':512,'cell':256,'columns':3,'frames':6,'pivot':[128,240],'sourceBoxes':bounds,'bytes':(out/(name+'.webp')).stat().st_size}
    print(name,manifest[name]['bytes'],bounds)
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
