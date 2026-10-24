import hmac,io
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI,Request,Depends,HTTPException
from fastapi.responses import Response,JSONResponse
from fastapi.exceptions import RequestValidationError
from PIL import Image
from ..config.settings import Settings
from ..contracts.requests import JobRequest,DiscoveryRequest
from ..contracts.responses import PhotoMetadata,EngineJob
from ..vision.models import ROI
from ..vision.hybrid import VERSION as ALGORITHM_VERSION
from ..vision.text_ocr import LocalTextOCR
from ..services.image_service import ImageService
from ..services.analysis_service import AnalysisService

MODEL_FILES=('PP-OCRv6_det_small.onnx','PP-OCRv6_rec_small.onnx','ch_ppocr_mobile_v2.0_cls_mobile.onnx')
def create_app(settings,ocr=None):
    reader=ocr or LocalTextOCR(settings.model_directory);images=ImageService(settings);analyses=AnalysisService(settings,images,reader)
    def weights_present():return all((Path(settings.model_directory)/name).is_file() for name in MODEL_FILES)
    @asynccontextmanager
    async def lifespan(app):
        if weights_present() and getattr(reader,'installed',False):
            blank=io.BytesIO();Image.new('RGB',(64,64),'white').save(blank,'PNG');reader.read_offline(blank.getvalue())
        yield
        analyses.close();images.close()
    app=FastAPI(title='Private local CV engine',docs_url=None,redoc_url=None,openapi_url=None,lifespan=lifespan)
    app.state.images=images;app.state.analyses=analyses
    async def private(request:Request):
        token=request.headers.get('X-Internal-Token','')
        if not hmac.compare_digest(token,settings.internal_token):raise HTTPException(401,'Internal authentication required.')
    @app.exception_handler(RequestValidationError)
    async def invalid(request,error):return JSONResponse(status_code=422,content={'code':'VALIDATION_ERROR','message':'Check internal request fields.'})
    @app.exception_handler(Exception)
    async def safe_error(request,error):return JSONResponse(status_code=500,content={'code':'ENGINE_ERROR','message':'Engine could not complete the request.'})
    @app.get('/internal/v1/health',dependencies=[Depends(private)])
    def health():return {'status':'up','mode':'LOCAL_CV','algorithm_version':ALGORITHM_VERSION,'ocr':{'packages_present':bool(getattr(reader,'installed',False)),'weights_present':weights_present(),'initialized':getattr(reader,'engine',None) is not None},'workers':1}
    @app.post('/internal/v1/photos',status_code=201,response_model=PhotoMetadata,dependencies=[Depends(private)])
    async def upload(request:Request):
        if request.headers.get('content-type','').split(';')[0] not in ('image/jpeg','image/png','image/webp'):raise HTTPException(415,'Use JPEG, PNG or WebP.')
        data=bytearray()
        async for chunk in request.stream():
            data.extend(chunk)
            if len(data)>15*1024*1024:raise HTTPException(413,'Upload exceeds 15 MiB.')
        try:return images.put(bytes(data))
        except ValueError:raise HTTPException(422,'Image invalid, too small or above 20 MP.')
    @app.post('/internal/v1/photos/{image_id}/discovery',dependencies=[Depends(private)])
    def discover(image_id:str,request:DiscoveryRequest):return analyses.discover(image_id,request)
    @app.post('/internal/v1/photos/{image_id}/crop',dependencies=[Depends(private)])
    def crop(image_id:str,roi:ROI):
        try:return Response(images.crop(image_id,roi),media_type='image/jpeg')
        except ValueError:raise HTTPException(422,'ROI must cover at least 32×32 source pixels.')
    @app.post('/internal/v1/analysis-jobs',status_code=202,response_model=EngineJob,dependencies=[Depends(private)])
    def submit(request:JobRequest):
        try:return analyses.submit(request)
        except ValueError:raise HTTPException(422,'ROI must cover at least 32×32 source pixels.')
    @app.get('/internal/v1/analysis-jobs/{job_id}',response_model=EngineJob,dependencies=[Depends(private)])
    def poll(job_id:str):return analyses.get(job_id)
    return app

def app_factory():return create_app(Settings.from_env())
