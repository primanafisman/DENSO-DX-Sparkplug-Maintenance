"""Local CPU text OCR. Images are NumPy arrays, never URLs or uploaded files."""
import importlib.util
import threading
from pathlib import Path

import cv2
import numpy as np


def join_lines(spans):
    """Join fragments on the same visual line without merging different labels."""
    rows=[]
    for span in sorted(spans,key=lambda s:(s['roi']['y'],s['roi']['x'])):
        box=span['roi']
        center=box['y']+box['height']/2
        row=next((r for r in rows if abs(center-r['center'])<.4*min(box['height'],r['height'])),None)
        if row is None:
            row={'center':center,'height':box['height'],'spans':[]}
            rows.append(row)
        row['spans'].append(span)
    return '\n'.join(' '.join(s['text'] for s in sorted(r['spans'],key=lambda s:s['roi']['x'])) for r in rows)


class LocalTextOCR:
    def __init__(self,model_directory=None):
        self.model_directory=Path(model_directory or Path(__file__).resolve().parent.parent/'data'/'ocr-models')
        self.engine=None
        self.lock=threading.RLock()

    @property
    def installed(self):
        return importlib.util.find_spec('rapidocr') is not None and importlib.util.find_spec('onnxruntime') is not None

    def read_offline(self,data):
        return self.read(data,offline=True)

    def read_upright(self,data):
        """Read a geometrically rectified display without guessing a 180° flip."""
        return self.read(data,offline=True,upright=True)

    def read(self,data,*,offline=True,upright=False):
        offline=True  # No network/model download is allowed in this service.
        if not self.installed:
            return {'available':False,'text':'','spans':[],'method':'RapidOCR CPU unavailable',
                    'warnings':['OCR teks lokal belum dipasang; input label manual atau jalankan setup OCR.']}
        try:
            with self.lock:
                if self.engine is None:
                    local_models={}
                    if offline:
                        paths={'Det.model_path':'PP-OCRv6_det_small.onnx',
                               'Rec.model_path':'PP-OCRv6_rec_small.onnx',
                               'Cls.model_path':'ch_ppocr_mobile_v2.0_cls_mobile.onnx'}
                        if not all((self.model_directory/name).is_file() for name in paths.values()):
                            return {'available':False,'text':'','spans':[],
                                    'method':'local OCR weights unavailable; network disabled',
                                    'warnings':['Model OCR lokal belum tersedia; Option 2 tidak mengunduh otomatis.'],
                                    'probability_correct':None}
                        local_models={key:str(self.model_directory/name) for key,name in paths.items()}
                    from rapidocr import RapidOCR
                    self.engine=RapidOCR(params={'Global.model_root_dir':str(self.model_directory),
                        'Global.log_level':'error','EngineConfig.onnxruntime.intra_op_num_threads':2,
                        'EngineConfig.onnxruntime.inter_op_num_threads':1,'Global.max_side_len':1600,**local_models})
                image=cv2.imdecode(np.frombuffer(data,dtype=np.uint8),cv2.IMREAD_COLOR)
                if image is None:
                    raise ValueError('invalid image')
                if upright:
                    flags=(self.engine.use_det,self.engine.use_cls,self.engine.use_rec)
                    try:
                        output=self.engine(image,use_det=True,use_cls=False,use_rec=True)
                    finally:
                        self.engine.update_params(use_det=flags[0],use_cls=flags[1],use_rec=flags[2])
                else:
                    output=self.engine(image)
                height,width=image.shape[:2]
                spans=[]
                if output.txts is not None and output.boxes is not None:
                    for text,score,box in list(zip(output.txts,output.scores,output.boxes))[:80]:
                        if not text.strip():
                            continue
                        bounds=np.asarray(box)
                        x,y=np.maximum(bounds.min(axis=0),0)
                        x2,y2=np.minimum(bounds.max(axis=0),[width,height])
                        spans.append({'text':text[:300],'ocr_score':round(float(score),4),
                                      'roi':{'x':float(x/width),'y':float(y/height),'width':float((x2-x)/width),'height':float((y2-y)/height)}})
                return {'available':True,'text':join_lines(spans), 'spans':spans,
                        'method':'RapidOCR CPU printed text; handwriting requires review','warnings':[],
                        'probability_correct':None}
        except Exception:
            # Do not expose dependency paths, request URLs or local image contents in errors.
            return {'available':False,'text':'','spans':[],'method':'RapidOCR CPU unavailable',
                    'warnings':['OCR teks lokal gagal; periksa instalasi/model dan gunakan input manual.']}
