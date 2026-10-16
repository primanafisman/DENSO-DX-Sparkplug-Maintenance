import base64,copy,threading,time,uuid
from concurrent.futures import ThreadPoolExecutor
from fastapi import HTTPException
from ..vision.images import crop_image
from ..vision.hybrid import analyze_hybrid
from ..vision.discovery import discover_image
from ..vision.hybrid_discovery import hybrid_gauge_rois
from ..adapters.equipment_snapshot import EquipmentSnapshot
from .image_service import DecodedSource

class AnalysisService:
    def __init__(self,settings,images,ocr):self.settings=settings;self.images=images;self.ocr=ocr;self.jobs={};self.lock=threading.RLock();self.pool=ThreadPoolExecutor(max_workers=1,thread_name_prefix='local-cv');self.closed=False
    def expire(self):
        now=time.time()
        for key,job in list(self.jobs.items()):
            if job['expires_at']<now:self.jobs.pop(key,None)
    def discover(self,key,request):
        with DecodedSource(self.images.get(key)) as decoded:return discover_image(decoded.prepared,EquipmentSnapshot(request.instruments),self.ocr,request.area,gauge_detector=hybrid_gauge_rois)
    def submit(self,request):
        prepared=self.images.get(request.image_id)
        for item in request.items:
            for roi in (item.roi,item.label_roi):
                if roi and min(roi.width*prepared.source_width,roi.height*prepared.source_height)<32:raise ValueError('ROI too small.')
        with self.lock:
            self.expire()
            if self.closed:raise HTTPException(503,'Worker stopping.')
            if sum(j['status'] in ('queued','running') for j in self.jobs.values())>=self.settings.max_jobs:raise HTTPException(429,'Queue full; retry later.')
            key=str(uuid.uuid4());job={'job_id':key,'status':'queued','processed':0,'total':len(request.items),'results':[],'expires_at':time.time()+self.settings.ttl_seconds};self.jobs[key]=job
            self.pool.submit(self.run,key,prepared,request)
            return copy.deepcopy(job)
    def run(self,key,prepared,request):
        with self.lock:
            job=self.jobs.get(key)
            if not job or self.closed:return
            job['status']='running'
        with DecodedSource(prepared) as decoded:self.process_items(job,decoded.prepared,request)

    def process_items(self,job,prepared,request):
        registry=EquipmentSnapshot(request.instruments)
        for item in request.items:
            with self.lock:
                if job['status']!='running' or time.time()>job['expires_at']:job['status']='expired';return
            try:
                crop=crop_image(prepared,item.roi);label=crop_image(prepared,item.label_roi) if item.label_roi else None
                calibration=copy.deepcopy(item.calibration)
                if calibration:
                    calibration['_template']=base64.b64decode(calibration.pop('template_base64'),validate=True)
                asset=registry.get(item.instrument_id) or {}
                result=analyze_hybrid(crop,item.profile,calibration,self.ocr,label,registry,item.instrument_id,request.area,asset.get('instrument_type','other'))
                result.update({'client_id':item.client_id,'analysis_id':str(uuid.uuid4()),'roi':item.roi.model_dump(),'label_roi':item.label_roi.model_dump() if item.label_roi else None,'source_hash':prepared.source_hash,'selected_id':item.instrument_id,'processing_method':'LOCAL_CV'})
            except Exception:
                result={'client_id':item.client_id,'analysis_id':str(uuid.uuid4()),'error':{'code':'ROI_PROCESSING_FAILED','message':'ROI could not be read. Review crop and profile.'},'candidate':{'readable':False,'value':None},'validated_prediction':None,'confidence':{'valid':False,'level':'low'}}
            with self.lock:
                if self.closed or job['status']!='running':return
                job['results'].append(result);job['processed']+=1
        with self.lock:
            if job['status']=='running':job['status']='completed'
    def get(self,key):
        with self.lock:
            self.expire();job=self.jobs.get(key)
            if job is None:raise HTTPException(410,'Job expired or worker restarted; upload again.')
            return copy.deepcopy(job)
    def close(self):
        with self.lock:
            self.closed=True
            for job in self.jobs.values():
                if job['status'] in ('queued','running'):job['status']='failed'
        self.pool.shutdown(wait=False,cancel_futures=True)
