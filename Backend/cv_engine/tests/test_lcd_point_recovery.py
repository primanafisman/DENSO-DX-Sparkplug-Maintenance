import cv2,numpy as np
import pytest
from threading import RLock
from types import SimpleNamespace
from src.vision.hybrid_digital import _read_lcd_line,read_local_digital
from src.vision.models import Profile
from tests.ocr_fixtures import seven_segment

class DigitsOnly:
    def read_line(self,image):return {'raw_text':'2248','ocr_score':.999}

class ConfidentOCR:
    """An OCR dependency that disagrees with the independently drawn pixels."""
    def __init__(self,text):
        self.text=text;self.engine=self;self.lock=RLock()
        self.use_det=self.use_cls=self.use_rec=True
    def read_line(self,image):return {'raw_text':self.text,'ocr_score':.999}
    def __call__(self,image,**kwargs):return SimpleNamespace(txts=[self.text],scores=[.999])
    def update_params(self,**kwargs):
        for key,value in kwargs.items():setattr(self,key,value)
    def read_offline(self,data):
        return {'available':True,'text':self.text,'spans':[{'text':self.text,'ocr_score':.999,
            'roi':{'x':.1,'y':.1,'width':.8,'height':.8}}]}

def row(raw):return cv2.imdecode(np.frombuffer(seven_segment(raw),np.uint8),cv2.IMREAD_COLOR)

def test_local_ocr_omitted_point_is_recovered_from_visible_pixels():
    result=_read_lcd_line(row('2.248'),Profile(kind='digital',unit='mm',maximum=100,decimals=3),DigitsOnly())
    assert result is not None and result['candidate']['value']==2.248,result

@pytest.mark.parametrize('raw',['2248','22.48','2.2.48','-2.248'])
def test_precision_setting_cannot_supply_or_move_a_missing_point_or_sign(raw):
    result=_read_lcd_line(row(raw),Profile(kind='digital',unit='mm',minimum=-100,maximum=100,decimals=3),DigitsOnly())
    assert result is None,result

@pytest.mark.parametrize('visible,ocr_text,decimals',[
    ('12.70','1.270',3),('2.2248','2.248',3),('2.2248','2.22248',5),
])
def test_embedded_ocr_decimal_must_match_visible_position_and_digit_count(visible,ocr_text,decimals):
    result=_read_lcd_line(row(visible),Profile(kind='digital',unit='mm',maximum=100,decimals=decimals),ConfidentOCR(ocr_text))
    assert result is None,result

@pytest.mark.parametrize('visible,ocr_text,decimals',[
    ('2.248','22.48',2),('2248','2.248',3),('2.2.48','2.248',3),
    ('12.70','1.270',3),('2.2248','2.248',3),('2.2248','2.22248',5),
])
def test_general_ocr_cannot_bypass_disagreement_with_visible_lcd(visible,ocr_text,decimals):
    result=read_local_digital(seven_segment(visible),
        Profile(kind='digital',unit='mm',maximum=100,decimals=decimals),ConfidentOCR(ocr_text))
    assert not result['accepted'] and result['candidate']['value'] is None,result

def test_complete_narrow_one_digit_does_not_prevent_correct_decimal_validation():
    result=_read_lcd_line(row('12.70'),Profile(kind='digital',unit='mm',maximum=100,decimals=2),ConfidentOCR('12.70'))
    assert result is not None and result['candidate']['raw_text']=='12.70',result

def test_integer_profile_cannot_erase_a_visible_decimal_in_generic_ocr_fallback():
    result=read_local_digital(seven_segment('2.248'),
        Profile(kind='digital',unit='mm',maximum=10000,decimals=0),ConfidentOCR('2248'))
    assert not result['accepted'] and result['candidate']['value'] is None,result

@pytest.mark.parametrize('visible,ocr_text', [('2248','2.248'),('22.48','2.248'),('2.2.48','2.248')])
def test_small_crop_upscaling_cannot_supply_or_move_a_decimal(visible,ocr_text):
    image=cv2.resize(row(visible),None,fx=.5,fy=.5,interpolation=cv2.INTER_AREA)
    ok,data=cv2.imencode('.png',image);assert ok
    result=read_local_digital(data.tobytes(),Profile(kind='digital',unit='mm',maximum=100,decimals=3),ConfidentOCR(ocr_text))
    assert not result['accepted'] and result['candidate']['value'] is None,result
