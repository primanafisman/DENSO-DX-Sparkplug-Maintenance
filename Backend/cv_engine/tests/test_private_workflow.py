import time
from pathlib import Path
from fastapi.testclient import TestClient
from src.api.main import create_app
from src.config.settings import Settings
from tests.ocr_fixtures import seven_segment
from tests.test_hybrid_auto_analog import auto_dial

def test_real_private_job_reads_synthetic_digital_without_cloud_or_listener(tmp_path):
    app=create_app(Settings(internal_token='z'*32,model_directory=tmp_path/'missing'))
    headers={'X-Internal-Token':'z'*32}
    with TestClient(app) as client:
        photo=client.post('/internal/v1/photos',headers={**headers,'Content-Type':'image/png'},content=seven_segment('0.438'))
        assert photo.status_code==201
        item={'client_id':'digital','roi':{'x':0,'y':0,'width':1,'height':1},'profile':{'kind':'digital','unit':'MPa','minimum':0,'maximum':1,'decimals':3,'tolerance':.01}}
        response=client.post('/internal/v1/analysis-jobs',headers=headers,json={'image_id':photo.json()['image_id'],'items':[item]})
        assert response.status_code==202
        for _ in range(300):
            job=client.get('/internal/v1/analysis-jobs/'+response.json()['job_id'],headers=headers).json()
            if job['status'] in ('completed','failed','expired'):break
            time.sleep(.01)
        assert job['status']=='completed'
        assert job['results'][0]['candidate']['value']==.438
        assert job['results'][0]['processing_method']=='LOCAL_CV'
        assert job['results'][0]['confidence']['valid']
        assert client.post('/internal/v1/photos/'+photo.json()['image_id']+'/crop',headers=headers,json=item['roi']).status_code==200
