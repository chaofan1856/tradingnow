# 金色像素占比质检：HSV 色相 30–55°、饱和度 >0.22、明度 >0.22 记为"金色像素"
import subprocess, sys, numpy as np
def frame_rgb(path):
    w,h = map(int, subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','csv=p=0',path],capture_output=True,text=True).stdout.strip().split(','))
    raw = subprocess.run(['ffmpeg','-v','error','-i',path,'-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
    return np.frombuffer(raw,np.uint8).reshape(h,w,3).astype(np.float32)/255
for p in sys.argv[1:]:
    a=frame_rgb(p); mx=a.max(2); mn=a.min(2); d=mx-mn+1e-6
    r,g,b=a[...,0],a[...,1],a[...,2]
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
    s=d/(mx+1e-6)
    gold=(h>=30)&(h<=55)&(s>0.22)&(mx>0.22)
    print(f"{p}: gold {gold.mean()*100:.2f}%")
