"""Operation reuse benchmark, not a field-accuracy or reference-calibration claim."""
import argparse,io,json,statistics,time,tracemalloc
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from PIL import Image,ImageDraw
from src.vision.images import prepare_image,crop_image
from src.vision.models import ROI
from src.services.image_service import DecodedSource

def measure(optimized=False,runs=7):
    image=Image.new('RGB',(3000,2000),'white');ImageDraw.Draw(image).ellipse((500,200,1700,1400),outline='black',width=8)
    stream=io.BytesIO();image.save(stream,'PNG');prepared=prepare_image(stream.getvalue());rois=[ROI(x=.1,y=.1,width=.4,height=.6)]*6
    timings=[];hashes=[];tracemalloc.start()
    for run in range(runs):
        started=time.perf_counter()
        if optimized:
            with DecodedSource(prepared) as decoded:outputs=[decoded.crop(roi) for roi in rois]
        else:outputs=[crop_image(prepared,roi) for roi in rois]
        timings.append((time.perf_counter()-started)*1000)
        import hashlib
        hashes=[hashlib.sha256(data).hexdigest() for data in outputs]
    _,peak=tracemalloc.get_traced_memory();tracemalloc.stop()
    return {'case':'six_ROIs_same_6MP_image','optimized':optimized,'runs':runs,'cold_ms':timings[0],'warm_median_ms':statistics.median(timings[1:]),'p95_ms':sorted(timings)[-1],'python_peak_bytes':peak,'native_memory_note':'tracemalloc excludes native OpenCV/Pillow buffers','crop_hashes':hashes}
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--optimized',action='store_true');args=parser.parse_args();print(json.dumps(measure(args.optimized),indent=2))
