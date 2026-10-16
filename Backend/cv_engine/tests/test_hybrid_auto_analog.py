import io
import math

import cv2
import numpy as np
import pytest
from PIL import Image,ImageDraw,ImageFont

from src.vision.hybrid_auto_analog import read_auto_analog


def test_six_observed_majors_survive_an_unrelated_wide_mark():
    from src.vision.hybrid_auto_analog import select_six_ticks
    ticks=[]
    for n in range(21):
        major=n%4==0
        ticks.append(dict(angle=(150+13.5*n)%360, width=2.5 if major else .75,
                          strength=.6 if major else .3,long_trace=0,inner_support=.3))
    ticks.append(dict(angle=229, width=5.5,strength=.5,long_trace=0,inner_support=.3))
    chosen, info=select_six_ticks(ticks)
    assert len(chosen)==6
    assert [round(t['angle'],1) for t in chosen]==[150,204,258,312,6,60]


def test_repeating_identical_ring_does_not_invent_six_main_marks():
    from src.vision.hybrid_auto_analog import select_six_ticks
    ticks=[dict(angle=n*20,width=2,strength=.6,long_trace=0,inner_support=.3) for n in range(18)]
    assert select_six_ticks(ticks)[0] is None


@pytest.mark.parametrize('count',[7,8,9])
def test_complete_ring_with_thin_subdivisions_has_no_unique_open_scale_gap(count):
    from src.vision.hybrid_auto_analog import select_six_ticks
    ticks=[]
    for n in range(count*5):
        major=n%5==0
        ticks.append(dict(angle=n*360/(count*5),width=3 if major else .75,
                          strength=.6 if major else .3,long_trace=0,inner_support=.3))
    assert select_six_ticks(ticks)[0] is None


class ScaleOCR:
    def __init__(self,mirror=False): self.mirror=mirror
    def read(self,_):
        spans=[]
        for n in range(6):
            value=n/5;angle=math.radians(135+270*value)
            x=(360+190*math.cos(angle))/720;y=(360+190*math.sin(angle))/720
            if self.mirror:x=1-x
            spans.append({'text':str(value),'ocr_score':.95,'roi':dict(x=x-.03,y=y-.02,width=.06,height=.04)})
        return {'available':True,'text':'0 0.2 0.4 0.6 0.8 1','spans':spans}


def auto_dial(value=.455,sweep=270,shadow=False,tilt=False,competing=False,half_major=False):
    image=Image.new('RGB',(720,720),'#e0e0e0');draw=ImageDraw.Draw(image)
    draw.ellipse((55,55,665,665),fill='white',outline='#333333',width=6)
    def xy(v,r):
        a=math.radians(135+sweep*v)
        return (360+r*math.cos(a),360+r*math.sin(a))
    for n in range(51):
        v=n/50
        major=n%(5 if half_major else 10)==0
        draw.line((*xy(v,232 if major else 247),*xy(v,265)),fill='black',width=14 if major else 4)
    for n in range(6):
        v=n/5;x,y=xy(v,190)
        draw.text((x-22,y-17),str(v),fill='black',font=ImageFont.load_default(size=28))
    draw.line((360,360,*xy(value,225)),fill='#909090',width=8)
    a=math.radians(135+sweep*value+180)
    draw.line((360,360,360+75*math.cos(a),360+75*math.sin(a)),fill='black',width=27)
    if competing: draw.line((360,360,*xy(.8,225)),fill='black',width=8)
    draw.ellipse((312,312,408,408),fill='#252525')
    draw.ellipse((337,337,383,383),fill='#45a7cd')
    draw.line((360,360,*xy(.12,221)),fill='#009a35',width=10)
    array=np.asarray(image).copy()
    if shadow:
        light=np.linspace(.40,1.,720)[None,:,None]
        array=np.clip(array*light,0,255).astype(np.uint8)
    if tilt:
        array=cv2.warpAffine(array,np.float32([[1,.13,-46],[0,.85,54]]),(720,720),borderValue=(224,224,224))
    stream=io.BytesIO();Image.fromarray(array).save(stream,'JPEG',quality=96)
    return stream.getvalue()


@pytest.mark.parametrize('sweep',[225,270])
@pytest.mark.parametrize('value',[.205,.455,.775])
def test_auto_major_scale_geometry_does_not_require_a_saved_template(value,sweep):
    result=read_auto_analog(auto_dial(value,sweep),None)
    assert result['value']==pytest.approx(value,abs=.012),result
    assert result['overlay']['pivot'] and len(result['overlay']['scale_points'])==6
    assert result['calibration_source']=='per-photo major strokes; profile 0-1 MPa'


@pytest.mark.parametrize('shadow,tilt',[(True,False),(False,True),(True,True)])
def test_shadow_and_moderate_tilt_preprocess_preserves_reading(shadow,tilt):
    result=read_auto_analog(auto_dial(.455,shadow=shadow,tilt=tilt),None)
    assert result['value']==pytest.approx(.455,abs=.015),result
    assert result['preprocessing']['applied']


def test_two_black_needles_are_still_ambiguous_after_preprocessing():
    assert read_auto_analog(auto_dial(competing=True),None)['value'] is None


def test_one_broad_short_pointer_is_not_two_competing_needles():
    image = Image.open(io.BytesIO(auto_dial(.44)))
    draw = ImageDraw.Draw(image)
    # G36-style wide pointer, ending before the outer scale marks.
    a = math.radians(135 + 270 * .44)
    draw.line((360, 360, 360 + 200 * math.cos(a), 360 + 200 * math.sin(a)), fill='black', width=25)
    stream = io.BytesIO(); image.save(stream, 'PNG')
    result = read_auto_analog(stream.getvalue())
    assert result['value'] == pytest.approx(.44, abs=.012), result


def test_unequal_length_black_pointers_are_not_validated_by_stronger_ray():
    from src.vision.hybrid import analyze_hybrid
    from src.vision.models import Profile
    image=Image.open(io.BytesIO(auto_dial(.44)))
    draw=ImageDraw.Draw(image)
    def endpoint(value,r):
        a=math.radians(135+270*value)
        return (360+r*math.cos(a),360+r*math.sin(a))
    draw.line((360,360,*endpoint(.44,230)),fill='white',width=18)
    draw.line((360,360,*endpoint(.44,185)),fill='black',width=25)
    draw.line((360,360,*endpoint(.75,225)),fill='black',width=8)
    stream=io.BytesIO();image.save(stream,'PNG')
    result=analyze_hybrid(stream.getvalue(),Profile(kind='analog',unit='MPa',minimum=0,maximum=1),text_ocr=ScaleOCR())
    assert result['validated_prediction'] is None
    assert not result['confidence']['valid']


def test_long_counterweight_in_open_scale_gap_is_not_the_measuring_tip():
    image=Image.open(io.BytesIO(auto_dial(.405)))
    draw=ImageDraw.Draw(image)
    a=math.radians(135+270*.405+180)
    draw.line((360,360,360+185*math.cos(a),360+185*math.sin(a)),fill='black',width=14)
    stream=io.BytesIO();image.save(stream,'PNG')
    result=read_auto_analog(stream.getvalue(),ScaleOCR().read(b''))
    assert result['value']==pytest.approx(.405,abs=.012),result


def test_scale_with_thick_half_major_subdivisions_keeps_correct_six_labels():
    result=read_auto_analog(auto_dial(.415,sweep=225,half_major=True),None)
    assert result['value']==pytest.approx(.415,abs=.012),result
    assert len(result['overlay']['scale_points'])==6


def test_local_pipeline_tries_photo_geometry_without_saved_calibration():
    from src.vision.hybrid import analyze_hybrid
    from src.vision.models import Profile
    result=analyze_hybrid(auto_dial(.455,shadow=True),Profile(kind='analog',unit='MPa',minimum=0,maximum=1,decimals=3),text_ocr=ScaleOCR())
    assert result['confidence']['valid'],result
    assert result['raw_prediction']==pytest.approx(.455,abs=.015)
    assert result['validation']['requires_review']


def test_isolated_white_glare_suspicion_does_not_discard_visible_needle(monkeypatch):
    from src.vision.hybrid import analyze_hybrid
    from src.vision.models import Profile
    from src.vision.images import assess_quality
    quality=assess_quality(auto_dial())
    quality['glare']['critical_overlap']=True
    monkeypatch.setattr('src.vision.hybrid.assess_quality',lambda _:quality)
    result=analyze_hybrid(auto_dial(),Profile(kind='analog',unit='MPa',minimum=0,maximum=1,decimals=3),text_ocr=ScaleOCR())
    assert result['confidence']['valid'],result
    assert result['validation']['requires_review']


def test_mirrored_ccw_dial_uses_visible_numeric_order():
    mirrored=Image.open(io.BytesIO(auto_dial(.205))).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    stream=io.BytesIO();mirrored.save(stream,'PNG')
    result=read_auto_analog(stream.getvalue(),ScaleOCR(mirror=True).read(b''))
    assert result['value']==pytest.approx(.205,abs=.012),result
    assert result['scale_direction']['confirmed']


def test_no_scale_direction_evidence_keeps_estimate_for_manual_review_only():
    from src.vision.hybrid import analyze_hybrid
    from src.vision.models import Profile
    result=analyze_hybrid(auto_dial(.205),Profile(kind='analog',unit='MPa',minimum=0,maximum=1,decimals=3))
    assert result['raw_prediction']==pytest.approx(.205,abs=.012)
    assert result['validated_prediction'] is None
    assert not result['confidence']['valid']


def test_saved_direction_conflict_with_visible_ocr_is_not_hidden():
    result=read_auto_analog(auto_dial(),ScaleOCR().read(b''),clockwise=False)
    assert result['value'] is None and result['scale_direction']['conflict']


def test_missing_major_cannot_be_validated_by_substituting_a_long_needle():
    from src.vision.hybrid import analyze_hybrid
    from src.vision.models import Profile
    image=Image.open(io.BytesIO(auto_dial(.42)))
    draw=ImageDraw.Draw(image)
    def point(value,r):
        a=math.radians(135+270*value)
        return (360+r*math.cos(a),360+r*math.sin(a))
    draw.line((*point(.4,230),*point(.4,268)),fill='white',width=18)
    draw.line((360,360,*point(.42,265)),fill='#909090',width=8)
    stream=io.BytesIO();image.save(stream,'PNG')
    result=analyze_hybrid(stream.getvalue(),Profile(kind='analog',unit='MPa',minimum=0,maximum=1),text_ocr=ScaleOCR())
    assert result['validated_prediction'] is None
    assert not result['confidence']['valid']


@pytest.mark.parametrize('faded',[False,True])
def test_discovery_finds_shadowed_dial_without_dark_absolute_threshold(faded):
    from src.vision.hybrid_discovery import hybrid_gauge_rois
    from src.vision.images import prepare_image
    dial=Image.open(io.BytesIO(auto_dial(.455,shadow=True)))
    if faded:
        dial=Image.fromarray(np.clip(np.asarray(dial)*.60+85,0,255).astype(np.uint8))
    dial.thumbnail((320,320))
    photo=Image.new('RGB',(800,1100),'#bbbbaa')
    photo.paste(dial,(250,300))
    stream=io.BytesIO();photo.save(stream,'JPEG',quality=96)
    proposals=hybrid_gauge_rois(prepare_image(stream.getvalue()),[])
    analog=[p for p in proposals if p['kind_hint']=='analog']
    assert len(analog)==1,proposals
    assert .25<analog[0]['roi']['x']<.4
