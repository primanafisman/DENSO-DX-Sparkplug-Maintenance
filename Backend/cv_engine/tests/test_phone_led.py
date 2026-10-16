"""Phone monitor regression: measured upright LED must not be rotated by OCR."""
import io
from pathlib import Path
from types import SimpleNamespace

import cv2
import numpy as np
import pytest
from PIL import Image

from src.vision.hybrid import analyze_hybrid
from src.vision.hybrid_digital import _OfflineReader
from src.vision.models import Profile
from src.vision.text_ocr import LocalTextOCR
from tests.test_hybrid_digital_display import framed_led


def test_upright_ocr_keeps_detection_and_restores_engine_flags_on_failure(monkeypatch):
    class Engine:
        use_det=True;use_cls=True;use_rec=True
        def __call__(self,image,**flags):
            assert flags=={'use_det':True,'use_cls':False,'use_rec':True}
            self.use_cls=False
            raise RuntimeError('recognizer failed')
        def update_params(self,**flags):
            for key,value in flags.items():setattr(self,key,value)
    reader=LocalTextOCR();reader.engine=Engine()
    monkeypatch.setattr(LocalTextOCR,'installed',property(lambda self:True))
    _,encoded=cv2.imencode('.png',np.zeros((50,200,3),np.uint8))
    result=reader.read_upright(encoded.tobytes())
    assert not result['available']
    assert reader.engine.use_det and reader.engine.use_cls and reader.engine.use_rec


def test_upright_cache_is_separate_from_normal_label_ocr(monkeypatch):
    class Engine:
        use_det=True;use_cls=True;use_rec=True
        def __call__(self,image,**flags):
            self.update_params(**flags)
            return SimpleNamespace(txts=('0.405' if not self.use_cls else '50h0',),
                scores=(.999,),boxes=(np.array([[5,5],[190,5],[190,45],[5,45]]),))
        def update_params(self,**flags):
            for key,value in flags.items():setattr(self,key,value)
    reader=LocalTextOCR();reader.engine=Engine()
    monkeypatch.setattr(LocalTextOCR,'installed',property(lambda self:True))
    _,encoded=cv2.imencode('.png',np.zeros((50,200,3),np.uint8));data=encoded.tobytes()
    adapter=_OfflineReader(reader)
    assert adapter.read(data)['text']=='50h0'
    assert adapter.read_upright(data)['text']=='0.405'
    assert adapter.read(data)['text']=='50h0'
    assert reader.engine.use_cls


@pytest.mark.parametrize('pixels,visible_unit',[('0405','MPa'),('-0.405','MPa'),('0.4.05','MPa'),('0.405','mm')])
def test_upright_ocr_cannot_override_original_dot_sign_or_unit(monkeypatch,pixels,visible_unit):
    class OCR:
        def read_offline(self,_):
            return {'available':True,'spans':[{'text':visible_unit,'ocr_score':.999,
                'roi':{'x':.8,'y':.7,'width':.15,'height':.1}}]}
        def read_upright(self,_):
            return {'available':True,'spans':[{'text':'0.405','ocr_score':.999,
                'roi':{'x':.1,'y':.1,'width':.8,'height':.8}}]}
    # Force the new OCR fallback; even a confident hallucination cannot supply
    # a point or discard a minus from the original independently measured row.
    monkeypatch.setattr('src.vision.hybrid_digital.read_digital',lambda *args:{
        'accepted':False,'method':'test-abstention','candidate':{'readable':False,'value':None,'raw_text':'','unit':'MPa'}})
    monkeypatch.setattr('src.vision.hybrid_digital.led_tokens',lambda _:None)
    monkeypatch.setattr('src.vision.hybrid_digital.led_grid_tokens',lambda _:None)
    monkeypatch.setattr('src.vision.hybrid_digital.decode_lcd_line',lambda _:None)
    result=analyze_hybrid(framed_led(pixels),Profile(kind='digital',unit='MPa',minimum=0,maximum=1,decimals=3),text_ocr=OCR())
    assert result['candidate']['value'] is None and not result['confidence']['valid'],result


def test_phone_led_rectification_reads_0405_without_orientation_flip():
    source=Path.home()/'Downloads'/'WhatsApp Image 2026-10-15 at 08.27.58.jpeg'
    if not source.exists():pytest.skip('Private operator phone screenshot not packaged')
    stream=io.BytesIO()
    with Image.open(source) as image:image.convert('RGB').crop((44,555,676,981)).save(stream,'PNG')
    ocr=LocalTextOCR(__import__('os').environ.get('OCR_MODEL_DIR'))
    result=analyze_hybrid(stream.getvalue(),Profile(kind='digital',unit='MPa',minimum=0,maximum=1,decimals=3),text_ocr=ocr)
    assert result['confidence']['valid'] and result['candidate']['value']==.405,result
    assert result['local_ocr']['green_punctuation']
    assert result['local_ocr']['rectification_used']
