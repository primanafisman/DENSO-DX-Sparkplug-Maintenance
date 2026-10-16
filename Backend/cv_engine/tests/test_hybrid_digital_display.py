"""Display evidence and safety contracts for Option 2; no provider calls."""
import io
import importlib
import importlib.util

import cv2
import numpy as np
import pytest
from PIL import Image,ImageDraw

from src.vision.hybrid_digital import read_local_digital
from src.vision.images import prepare_image,crop_image
from src.vision.models import Profile,ROI
from tests.ocr_fixtures import seven_segment


def housed_display(text='12.70', angle=0, second=None):
    """Literal LCD row in a dark bezel, photographed on a lighter background."""
    screen=Image.open(io.BytesIO(seven_segment(text))).convert('RGB')
    width,height=screen.size
    panel=Image.new('RGB',(width+30,height+30),'#17201d')
    panel.paste(screen,(15,15))
    if angle:
        panel=panel.rotate(angle,expand=True,resample=Image.Resampling.BICUBIC,fillcolor='#d8d8d8')
    source=Image.new('RGB',(1000,650),'#d8d8d8')
    source.paste(panel,(80,75))
    if second:
        other=Image.open(io.BytesIO(seven_segment(second))).convert('RGB')
        bezel=Image.new('RGB',(other.width+30,other.height+30),'#17201d')
        bezel.paste(other,(15,15)); source.paste(bezel,(490,410))
    stream=io.BytesIO();source.save(stream,'PNG');return stream.getvalue()


def framed_led(text):
    screen=Image.open(io.BytesIO(seven_segment(text,led=True))).convert('RGB')
    frame=Image.new('RGB',(900,600),'#aaaaaa');frame.paste(screen,(200,200))
    stream=io.BytesIO();frame.save(stream,'PNG');return stream.getvalue()


def test_upright_digit_row_in_rotated_lcd_housing_is_read_from_visible_display_bounds():
    result=read_local_digital(housed_display(angle=12),Profile(kind='digital',unit='mm',maximum=100,decimals=2))
    assert result['accepted'],result
    assert result['candidate']['value']==12.70
    assert result['candidate']['raw_text']=='12.70'
    assert result['rectification_used'] is True
    assert result['probability_correct'] is None


def test_separate_display_candidates_are_not_silently_reduced_to_first_value():
    result=read_local_digital(housed_display(second='15.96'),Profile(kind='digital',unit='mm',maximum=100,decimals=2))
    assert not result['accepted']
    assert result['candidate']['value'] is None
    assert result.get('display_count')==2,result


def test_a_malformed_accepted_segment_result_without_value_is_rejected(monkeypatch):
    monkeypatch.setattr('src.vision.hybrid_digital.read_digital',lambda *args:{
        'accepted':True,'candidate':{'readable':True,'kind':'digital','value':None,'raw_text':'','unit':'mm','reason':''},
        'method':'seven-segment-v1','variants':[],'probability_correct':None})
    result=read_local_digital(seven_segment('12.70'),Profile(kind='digital',unit='mm',maximum=100))
    assert not result['accepted'],result
    assert result['candidate']['value'] is None


def test_visible_unit_conflict_blocks_otherwise_valid_segments():
    class OCR:
        def read_offline(self,_):
            return {'available':True,'text':'mm','spans':[{'text':'mm','ocr_score':.999,
                'roi':{'x':.8,'y':.7,'width':.15,'height':.2}}]}
        def read(self,_):
            raise AssertionError('Hybrid display recognition must prefer the offline OCR method')
    result=read_local_digital(seven_segment('0.438'),Profile(kind='digital',unit='MPa',maximum=1,decimals=3),OCR())
    assert not result['accepted'],result
    assert result['candidate']['value'] is None


def test_missing_decimal_still_abstains_after_display_rectification():
    result=read_local_digital(housed_display('1270',angle=12),Profile(kind='digital',unit='mm',maximum=100,decimals=2))
    assert not result['accepted']
    assert result['candidate']['value'] is None


def test_display_proposals_include_all_digits_and_the_visible_decimal():
    module_name='src.vision.hybrid_display'
    assert importlib.util.find_spec(module_name) is not None,'Local LCD crop helper is required'
    helper=importlib.import_module(module_name)
    prepared=prepare_image(housed_display(angle=12))
    proposals=helper.propose_digital_displays(prepared,[])
    assert len(proposals)==1,proposals
    assert proposals[0]['kind_hint']=='digital'
    assert proposals[0]['requires_review'] is True
    # The entire rotated 12.70 row is within these independently known bounds.
    roi=proposals[0]['roi']
    assert roi['x']<.12 and roi['x']+roi['width']>.4
    assert roi['y']<.16 and roi['y']+roi['height']>.28


def test_observed_decimal_count_belongs_to_the_located_display_not_other_text():
    from src.vision.hybrid_display import propose_digital_displays
    prepared=prepare_image(housed_display('2.248'))
    row={'text':'2.248','ocr_score':.99,'roi':{'x':.11,'y':.15,'width':.28,'height':.1}}
    proposal=propose_digital_displays(prepared,[row])[0]
    assert proposal['observed_decimals']==3
    outside={**row,'text':'12.70','roi':{'x':.7,'y':.8,'width':.2,'height':.1}}
    # Visible 2.248 now supplies its own format. Unrelated/wrong OCR cannot
    # override it or create a second phantom display on blank background.
    proposals=propose_digital_displays(prepared,[outside])
    assert len(proposals)==1,proposals
    assert proposals[0]['observed_decimals']==3
    assert propose_digital_displays(prepared,[{**row,'text':'12.70','ocr_score':.4}])[0]['observed_decimals']==3


def test_blank_rectangle_is_not_a_digital_display():
    module_name='src.vision.hybrid_display'
    assert importlib.util.find_spec(module_name) is not None,'Local LCD crop helper is required'
    helper=importlib.import_module(module_name)
    image=np.full((600,900,3),220,np.uint8)
    cv2.rectangle(image,(150,200),(600,350),(15,15,15),-1)
    cv2.rectangle(image,(165,215),(585,335),(150,170,160),-1)
    ok,data=cv2.imencode('.png',image)
    assert ok
    assert helper.propose_digital_displays(prepare_image(data.tobytes()),[])==[]


def test_a_complete_signed_display_retains_the_visible_minus_sign():
    result=read_local_digital(housed_display('-12.70',angle=12),
        Profile(kind='digital',unit='mm',minimum=-100,maximum=100,decimals=2))
    assert result['accepted'],result
    assert result['candidate']['raw_text']=='-12.70'
    assert result['candidate']['value']==-12.70


def test_recognition_only_adapter_restores_backend_flags_when_inference_fails():
    import threading
    from src.vision.hybrid_digital import _OfflineReader
    class Engine:
        use_det=True;use_cls=True;use_rec=True
        def __call__(self,image,**kwargs):
            self.update_params(**kwargs)
            raise RuntimeError('Controlled inference failure')
        def update_params(self,**kwargs):
            for key,value in kwargs.items():setattr(self,key,value)
    class Backend:
        lock=threading.RLock();engine=Engine()
        def read_offline(self,_):return {'available':True,'text':'','spans':[]}
    backend=Backend()
    assert _OfflineReader(backend).read_line(np.zeros((50,150,3),np.uint8)) is None
    assert backend.engine.use_det and backend.engine.use_cls and backend.engine.use_rec


def test_repeat_view_and_unit_check_reuse_only_this_read_offline_ocr_output():
    from src.vision.hybrid_digital import _OfflineReader
    class Backend:
        calls=0
        def read_offline(self,_):
            self.calls+=1
            return {'available':True,'text':str(self.calls),'spans':[],'warnings':[],'probability_correct':None}
    backend=Backend();adapter=_OfflineReader(backend)
    first=adapter.read(b'unchanged pixels');second=adapter.read(b'unchanged pixels')
    assert first['text']==second['text']=='1'
    assert backend.calls==1
    # A new user read does not reuse the previous request's output.
    assert _OfflineReader(backend).read(b'unchanged pixels')['text']=='2'


def test_failed_line_inference_does_not_poison_the_next_read():
    import threading
    from types import SimpleNamespace
    from src.vision.hybrid_digital import _OfflineReader
    class Engine:
        use_det=True;use_cls=True;use_rec=True;calls=0
        def __call__(self,image,**kwargs):
            self.calls+=1;self.update_params(**kwargs)
            if self.calls==1:raise RuntimeError('Controlled first-call failure')
            return SimpleNamespace(txts=('12.70',),scores=(.999,))
        def update_params(self,**kwargs):
            for key,value in kwargs.items():setattr(self,key,value)
    class Backend:
        lock=threading.RLock();engine=Engine()
        def read_offline(self,_):return {'available':True,'text':'','spans':[]}
    backend=Backend();adapter=_OfflineReader(backend);pixels=np.zeros((50,150,3),np.uint8)
    assert adapter.read_line(pixels) is None
    assert adapter.read_line(pixels)['raw_text']=='12.70'
    assert backend.engine.use_det and backend.engine.use_cls and backend.engine.use_rec


def test_visible_unit_conflict_also_blocks_recognition_only_value(monkeypatch):
    import threading
    from types import SimpleNamespace
    class Engine:
        use_det=True;use_cls=True;use_rec=True
        def __call__(self,image,**kwargs):
            self.update_params(**kwargs)
            return SimpleNamespace(txts=('12.70',),scores=(.999,))
        def update_params(self,**kwargs):
            for key,value in kwargs.items():setattr(self,key,value)
    class Backend:
        lock=threading.RLock();engine=Engine()
        def read_offline(self,_):
            return {'available':True,'text':'mm','spans':[{'text':'mm','ocr_score':.999,
                'roi':{'x':.8,'y':.7,'width':.15,'height':.2}}]}
    # Exercise the recognition-only fallback after the segment decoder abstains.
    monkeypatch.setattr('src.vision.hybrid_digital.read_digital',lambda data,profile:{'accepted':False,
        'candidate':{'readable':False,'kind':'digital','value':None,'unit':profile.unit,'raw_text':'','reason':''},
        'method':'seven-segment-v1','variants':[],'probability_correct':None})
    monkeypatch.setattr('src.vision.hybrid_digital.decode_lcd_line',lambda _:None)
    result=read_local_digital(housed_display(),Profile(kind='digital',unit='MPa',maximum=100,decimals=2),Backend())
    assert result['method']=='local-lcd-line-v1',result
    assert not result['accepted'] and result['candidate']['value'] is None


@pytest.mark.parametrize('raw', ['-0.438','-12.70'])
def test_led_discovery_retains_the_complete_measured_leading_minus(raw):
    from src.vision.hybrid_display import propose_digital_displays
    proposals=propose_digital_displays(prepare_image(framed_led(raw)),[])
    assert len(proposals)==1,proposals
    roi=proposals[0]['roi']
    # Literal fixture minus occupies x=224..256 and y=262..270.
    assert roi['x']*900<224,proposals
    assert (roi['x']+roi['width'])*900>256
    assert roi['y']*600<262 and (roi['y']+roi['height'])*600>270


@pytest.mark.parametrize('raw,value,decimals', [('-0.438',-.438,3),('-12.70',-12.70,2)])
@pytest.mark.parametrize('minimum',[-100,0])
def test_negative_led_whole_photo_and_proposed_crop_never_become_positive(raw,value,decimals,minimum):
    from src.vision.hybrid_display import propose_digital_displays
    data=framed_led(raw);prepared=prepare_image(data)
    proposals=propose_digital_displays(prepared,[])
    assert len(proposals)==1,proposals
    cropped=crop_image(prepared,ROI.model_validate(proposals[0]['roi']))
    for view in (data,cropped):
        result=read_local_digital(view,Profile(kind='digital',unit='mm',minimum=minimum,maximum=100,decimals=decimals))
        if minimum==0:
            assert not result['accepted'] and result['candidate']['value'] is None,result
        else:
            assert result['accepted'],result
            assert result['candidate']['value']==value and result['candidate']['raw_text']==raw,result


def test_a_visible_clipped_leading_bar_is_an_abstention_not_positive_value():
    image=Image.open(io.BytesIO(framed_led('-0.438')))
    # Only the right edge of the minus remains visible at the crop's left edge.
    stream=io.BytesIO();image.crop((253,200,650,340)).save(stream,'PNG')
    result=read_local_digital(stream.getvalue(),Profile(kind='digital',unit='mm',minimum=-100,maximum=100,decimals=3))
    assert not result['accepted'] and result['candidate']['value'] is None,result


def test_dim_disconnected_row_grid_cannot_discard_a_clipped_negative_sign():
    from tests.ocr_fixtures import STROKES
    image=Image.new('RGB',(288,136),(5,10,5));draw=ImageDraw.Draw(image)
    shapes={'a':(8,0,40,8),'b':(40,10,48,40),'c':(40,56,48,88),'d':(8,88,40,96),
            'e':(0,56,8,88),'f':(0,10,8,40),'g':(8,44,40,52)}
    x=16
    for char in '-0.4':
        if char=='.':draw.ellipse((x,106,x+7,113),fill=(70,140,30));x+=16
        else:
            for segment in STROKES[char]:
                a,b,c,d=shapes[segment];draw.rectangle((x+a,18+b,x+c,18+d),fill=(70,140,30))
            x+=64
    stream=io.BytesIO();image.crop((55,0,240,136)).save(stream,'PNG')
    result=read_local_digital(stream.getvalue(),Profile(kind='digital',unit='mm',minimum=0,maximum=600,decimals=1))
    assert not result['accepted'] and result['candidate']['value'] is None,result


def test_a_dim_green_status_mark_does_not_replace_black_lcd_punctuation_evidence():
    image=Image.open(io.BytesIO(seven_segment('12.70'))).convert('RGB')
    ImageDraw.Draw(image).rectangle((300,18,305,68),fill=(70,140,30))
    stream=io.BytesIO();image.save(stream,'PNG')
    result=read_local_digital(stream.getvalue(),Profile(kind='digital',unit='mm',maximum=600,decimals=2))
    assert result['accepted'] and result['candidate']['value']==12.70,result


@pytest.mark.parametrize('background',[(5,10,5),(10,25,10)])
def test_a_complete_dim_minus_below_digit_brightness_is_not_dropped(background):
    from tests.ocr_fixtures import STROKES
    image=Image.new('RGB',(288,136),background);draw=ImageDraw.Draw(image)
    shapes={'a':(8,0,40,8),'b':(40,10,48,40),'c':(40,56,48,88),'d':(8,88,40,96),
            'e':(0,56,8,88),'f':(0,10,8,40),'g':(8,44,40,52)}
    x=16
    for char in '-0.4':
        fill=(50,100,20) if char=='-' else (70,140,30)
        if char=='.':draw.ellipse((x,106,x+7,113),fill=fill);x+=16
        else:
            for segment in STROKES[char]:
                a,b,c,d=shapes[segment];draw.rectangle((x+a,18+b,x+c,18+d),fill=fill)
            x+=64
    stream=io.BytesIO();image.save(stream,'PNG')
    result=read_local_digital(stream.getvalue(),Profile(kind='digital',unit='mm',minimum=0,maximum=600,decimals=1))
    assert not result['accepted'] and result['candidate']['value'] is None,result


@pytest.mark.parametrize('visible_text',['0.438 mm','0.438mm','0.438\u00a0mm'])
def test_unit_attached_to_numeric_ocr_span_still_blocks_wrong_profile(visible_text):
    class OCR:
        def read_offline(self,_):
            return {'available':True,'text':visible_text,'spans':[{'text':visible_text,'ocr_score':.999,
                'roi':{'x':.1,'y':.1,'width':.8,'height':.5}}]}
    result=read_local_digital(seven_segment('0.438'),Profile(kind='digital',unit='MPa',maximum=1,decimals=3),OCR())
    assert not result['accepted'] and result['candidate']['value'] is None,result


@pytest.mark.parametrize('visible_text',['0.438 MPa','0.438MPa'])
def test_attached_unit_matching_profile_does_not_create_a_conflict(visible_text):
    class OCR:
        def read_offline(self,_):
            return {'available':True,'text':visible_text,'spans':[{'text':visible_text,'ocr_score':.999,
                'roi':{'x':.1,'y':.1,'width':.8,'height':.5}}]}
    result=read_local_digital(seven_segment('0.438'),Profile(kind='digital',unit='MPa',maximum=1,decimals=3),OCR())
    assert result['accepted'] and result['candidate']['value']==.438,result


@pytest.mark.parametrize('source,raw,value',[('-0.438','0.438',.438),('0438','0.438',.438)])
def test_original_led_punctuation_vetoes_a_downstream_positive_or_inserted_decimal(source,raw,value,monkeypatch):
    # The original pixels must veto even a malformed downstream decoder success.
    monkeypatch.setattr('src.vision.hybrid_digital._read_view',lambda data,profile,*args,**kwargs:{'accepted':True,
        'candidate':{'readable':True,'kind':'digital','value':value,'unit':profile.unit,'raw_text':raw,'reason':''},
        'method':'seven-segment-v1','variants':[],'probability_correct':None})
    result=read_local_digital(framed_led(source),Profile(kind='digital',unit='mm',maximum=100,decimals=3))
    assert not result['accepted'] and result['candidate']['value'] is None,result


def test_original_sign_veto_applies_even_when_display_discovery_abstains(monkeypatch):
    monkeypatch.setattr('src.vision.hybrid_digital.display_candidates',lambda image:[])
    monkeypatch.setattr('src.vision.hybrid_digital._read_view',lambda data,profile,*args,**kwargs:{'accepted':True,
        'candidate':{'readable':True,'kind':'digital','value':.438,'unit':profile.unit,'raw_text':'0.438','reason':''},
        'method':'seven-segment-v1','variants':[],'probability_correct':None})
    result=read_local_digital(seven_segment('-0.438',led=True),
        Profile(kind='digital',unit='mm',maximum=100,decimals=3))
    assert not result['accepted'] and result['candidate']['value'] is None,result
