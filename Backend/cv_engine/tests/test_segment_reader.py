import io
from PIL import Image,ImageDraw
import cv2,numpy as np
import pytest
from src.vision.segment_reader import decode_lcd_line
from tests.ocr_fixtures import seven_segment

class OverconfidentDigitsOCR:
    def read_offline(self,_):
        return {'available':True,'text':'23','spans':[{'text':'23','ocr_score':.999,
            'roi':{'x':.3,'y':.1,'width':.5,'height':.8}}]}

def pixels(data):
    return cv2.imdecode(np.frombuffer(data,np.uint8),cv2.IMREAD_COLOR)

def test_clipped_minus_never_becomes_positive_after_geometry_padding():
    image=Image.open(io.BytesIO(seven_segment('-23'))).convert('RGB')
    data=io.BytesIO();image.crop((48,0,image.width,image.height)).save(data,'PNG')
    assert decode_lcd_line(pixels(data.getvalue())) is None
    from src.vision.hybrid_digital import read_local_digital
    from src.vision.models import Profile
    result=read_local_digital(data.getvalue(),Profile(kind='digital',unit='mm',minimum=-100,maximum=100,decimals=0))
    assert not result['accepted'] and result['candidate']['value'] is None
    result=read_local_digital(data.getvalue(),Profile(kind='digital',unit='mm',minimum=-100,maximum=100,decimals=0),OverconfidentDigitsOCR())
    assert not result['accepted'] and result['candidate']['value'] is None

@pytest.mark.parametrize('first',['1','4','5','8','9'])
def test_partial_leading_digit_is_not_dropped_from_complete_neighbours(first):
    image=Image.open(io.BytesIO(seven_segment(first+'23'))).convert('RGB')
    ImageDraw.Draw(image).rectangle((0,65,79,135),fill='#bdc9c4')
    data=io.BytesIO();image.save(data,'PNG')
    assert decode_lcd_line(pixels(data.getvalue())) is None
    from src.vision.hybrid_digital import read_local_digital
    from src.vision.models import Profile
    result=read_local_digital(data.getvalue(),Profile(kind='digital',unit='mm',maximum=1000,decimals=0))
    assert not result['accepted'] and result['candidate']['value'] is None
    result=read_local_digital(data.getvalue(),Profile(kind='digital',unit='mm',maximum=1000,decimals=0),OverconfidentDigitsOCR())
    assert not result['accepted'] and result['candidate']['value'] is None

@pytest.mark.parametrize('raw',['2.248','2.242','-2.248'])
def test_complete_lcd_digits_keep_observed_sign_and_decimal(raw):
    from src.vision.hybrid_digital import read_local_digital
    from src.vision.models import Profile
    result=read_local_digital(seven_segment(raw),Profile(kind='digital',unit='mm',minimum=-100,maximum=100,decimals=3))
    assert result['accepted'] and result['candidate']['raw_text']==raw

def glare_lcd(housed=False,raw='123'):
    image=np.array(Image.open(io.BytesIO(seven_segment(raw))).convert('RGB'))
    dark=image[:,:,0]<70
    xx=np.indices(dark.shape)[1]
    image[:]=160
    image[:,48:72]=255
    image[dark]=20
    image[dark & (xx<80)]=180
    source=Image.fromarray(image)
    if housed:
        panel=Image.new('RGB',(source.width+30,166),'#17201d')
        panel.paste(source,(15,15))
        source=Image.new('RGB',(max(500,panel.width+60),250),'#d8d8d8')
        source.paste(panel,(30,40))
    data=io.BytesIO();source.save(data,'PNG')
    return data.getvalue()

@pytest.mark.parametrize('raw',['123','12333333'])
def test_glare_row_alternatives_retain_the_complete_leading_digit(raw):
    from src.vision.hybrid_display import numeric_line_crops
    readings=[decode_lcd_line(row['image']) for row in numeric_line_crops(pixels(glare_lcd(raw=raw)))]
    assert any(r is not None and r['raw_text']==raw for r in readings),readings

@pytest.mark.parametrize('housed',[False,True])
@pytest.mark.parametrize('ocr',[None,OverconfidentDigitsOCR()])
@pytest.mark.parametrize('raw',['123','12333333'])
def test_glare_cannot_turn_complete_row_into_shortened_value(housed,ocr,raw):
    from src.vision.hybrid_digital import read_local_digital
    from src.vision.models import Profile
    result=read_local_digital(glare_lcd(housed,raw),Profile(kind='digital',unit='mm',maximum=150 if raw=='123' else 99999999,decimals=0),ocr)
    if result['accepted']:
        assert result['candidate']['raw_text']==raw and result['candidate']['value']==int(raw),result
    else:
        assert result['candidate']['value'] is None,result

def test_small_lcd_discovery_retains_review_proposal_without_native_crop_error():
    from src.vision.hybrid_display import propose_digital_displays,display_candidates
    from src.vision.images import prepare_image
    row=Image.open(io.BytesIO(seven_segment('12.70'))).convert('RGB')
    row=row.resize((round(row.width*20/row.height),20),Image.Resampling.LANCZOS)
    panel=Image.new('RGB',(row.width+8,28),'#17201d');panel.paste(row,(4,4))
    source=Image.new('RGB',(500,250),'#d8d8d8');source.paste(panel,(30,40))
    data=io.BytesIO();source.save(data,'PNG');prepared=prepare_image(data.getvalue())
    assert len(display_candidates(pixels(prepared.jpeg)))==1
    proposals=propose_digital_displays(prepared,[])
    assert len(proposals)==1 and proposals[0]['requires_review'] is True
