import os,glob,sys
from PIL import Image, ImageDraw
fs=sorted(glob.glob(sys.argv[1]+'/*.jpg'), key=lambda f: float(os.path.basename(f)[1:-4]))
out=sys.argv[2]; os.makedirs(out,exist_ok=True)
for f in glob.glob(out+'/*.jpg'): os.remove(f)
for k in range(0,len(fs),4):
    sheet=Image.new('RGB',(3840,2160))
    for j,f in enumerate(fs[k:k+4]):
        im=Image.open(f).resize((1920,1080)); d=ImageDraw.Draw(im)
        d.line([(0,880),(1920,880)],fill=(80,80,255),width=1); d.text((20,1050),os.path.basename(f),fill=(0,255,255))
        sheet.paste(im,((j%2)*1920,(j//2)*1080))
    sheet.resize((1920,1080)).save(f'{out}/s{k//4}.jpg',quality=88)
print(len(fs))
