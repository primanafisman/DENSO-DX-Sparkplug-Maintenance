import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient

def test_private_service_no_cloud_and_no_unauthenticated_upload(tmp_path):
    from src.api.main import create_app
    from src.config.settings import Settings
    app=create_app(Settings(internal_token='a'*32,model_directory=tmp_path/'absent'))
    with TestClient(app) as client:
        assert client.get('/internal/v1/health').status_code==401
        headers={'X-Internal-Token':'a'*32}
        health=client.get('/internal/v1/health',headers=headers).json()
        assert health['mode']=='LOCAL_CV' and not health['ocr']['weights_present']
        stream=io.BytesIO();Image.new('RGB',(300,150),'gray').save(stream,'PNG')
        photo=client.post('/internal/v1/photos',content=stream.getvalue(),headers={**headers,'Content-Type':'image/png'})
        assert photo.status_code==201
        assert photo.json()['source_width']==300
        assert client.post('/internal/v1/analysis-jobs',json={'image_id':photo.json()['image_id'],'use_ai':True,'items':[]},headers=headers).status_code==422

def test_missing_weights_never_constructs_a_downloading_ocr(monkeypatch,tmp_path):
    from src.vision.text_ocr import LocalTextOCR
    reader=LocalTextOCR(tmp_path)
    monkeypatch.setattr(type(reader),'installed',property(lambda _:True))
    stream=io.BytesIO();Image.new('RGB',(64,64),'white').save(stream,'PNG')
    result=reader.read(stream.getvalue())
    assert not result['available'] and reader.engine is None

def test_settings_find_bundled_models_after_workspace_move(monkeypatch,tmp_path):
    from src.config.settings import Settings
    from pathlib import Path
    expected=Path(__file__).resolve().parents[1]/'models'/'ocr'
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv('CV_INTERNAL_TOKEN','x'*32)
    monkeypatch.setenv('OCR_MODEL_DIR','')
    assert Settings.from_env().model_directory==expected
    monkeypatch.setenv('OCR_MODEL_DIR','cv_engine/models/ocr')
    assert Settings.from_env().model_directory==expected
