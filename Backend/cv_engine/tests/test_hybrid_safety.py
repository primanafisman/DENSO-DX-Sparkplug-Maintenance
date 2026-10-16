import io
import numpy as np
import cv2

import pytest
from PIL import Image
from pydantic import ValidationError

from src.vision.hybrid import analyze_hybrid
from src.vision.hybrid_models import CalibrationInput
from src.vision.models import Profile
from tests.ocr_fixtures import seven_segment
from tests.test_hybrid_analog import calibration,dial


def test_missing_decimal_cannot_be_restored_from_profile():
    result=analyze_hybrid(seven_segment('0438'),Profile(kind='digital',unit='MPa',maximum=1,decimals=3))
    assert result['candidate']['value'] is None
    assert not result['confidence']['valid'] and result['uncertainty'] is None


def test_unsupported_analog_not_coerced_to_pressure_and_zero_is_not_error_value():
    result=analyze_hybrid(dial(),Profile(kind='analog',unit='mm',maximum=10))
    assert result['validation']['status']=='UNSUPPORTED'
    assert result['candidate']['value'] is None


def test_blank_low_quality_is_retake_not_estimated_pressure():
    stream=io.BytesIO();Image.new('RGB',(300,300),'white').save(stream,'PNG')
    result=analyze_hybrid(stream.getvalue(),Profile(kind='analog',unit='MPa',maximum=1))
    assert result['validation']['status']=='RETAKE_REQUIRED'
    assert result['raw_prediction'] is None

def test_blank_digital_remains_unreadable_even_when_ocr_claims_a_number():
    from tests.test_lcd_point_recovery import ConfidentOCR
    stream=io.BytesIO();Image.new('RGB',(300,150),'gray').save(stream,'PNG')
    result=analyze_hybrid(stream.getvalue(),Profile(kind='digital',unit='mm',maximum=100,decimals=3),text_ocr=ConfidentOCR('2.248'))
    assert result['candidate']['value'] is None and not result['confidence']['valid'],result

def test_smooth_gradient_without_digits_cannot_bypass_digital_quality_gate():
    gradient=np.tile(np.linspace(60,160,300,dtype=np.uint8),(150,1))
    ok,data=cv2.imencode('.png',gradient);assert ok
    result=analyze_hybrid(data.tobytes(),Profile(kind='digital',unit='mm',maximum=10000,decimals=0))
    assert not result['quality']['usable']
    assert result['candidate']['value'] is None and not result['confidence']['valid'],result


def test_template_registration_does_not_prove_identity_or_hide_label_conflict():
    class OCR:
        def read(self,_): return {'text':'OTHER GAUGE','spans':[]}
    class Registry:
        def all(self): return []
        def match_label(self,*args,**kwargs): return {'conflict':True,'level':'low','suggested_id':None,'raw_text':'OTHER GAUGE'}
    data=dial();record={**calibration(),'_template':data}
    result=analyze_hybrid(data,Profile(kind='analog',unit='MPa',maximum=1,decimals=3),record,OCR(),data,Registry(),'selected')
    assert result['raw_prediction']==pytest.approx(.455,abs=.004)
    assert result['validated_prediction'] is None and not result['confidence']['valid']
    assert result['validation']['status']=='EQUIPMENT_UNRESOLVED'


def test_auto_fallback_cannot_discard_nonstandard_numeric_calibration(monkeypatch):
    from tests.test_hybrid_auto_analog import auto_dial
    monkeypatch.setattr('src.vision.hybrid.read_calibrated_analog',lambda *args:{'value':None,'reason':'Registration incomplete','method':'template','overlay':{}})
    points=[{**p,'value':v} for p,v in zip(calibration()['scale_points'],[0,.05,.15,.3,.6,1])]
    record={**calibration(),'scale_points':points,'_template':auto_dial(.205)}
    result=analyze_hybrid(auto_dial(.455),Profile(kind='analog',unit='MPa',maximum=1),record)
    assert result['validated_prediction'] is None and result['raw_prediction'] is None


@pytest.mark.parametrize('case',['duplicate','reverse','pivot'])
def test_invalid_landmark_calibration_rejected(case):
    record={k:v for k,v in calibration().items() if k in ('pivot','scale_points','clockwise')}
    record.update(instrument_id='device',image_id='image',roi={'x':0,'y':0,'width':1,'height':1})
    if case=='duplicate': record['scale_points'][1]['value']=0
    if case=='reverse': record['scale_points']=record['scale_points'][::-1]
    if case=='pivot': record['pivot']={'x':.9,'y':.9}
    with pytest.raises(ValidationError): CalibrationInput.model_validate(record)
