import io
import math

import cv2
import numpy as np
import pytest
from PIL import Image, ImageDraw, ImageFont

from src.vision.hybrid_analog import interpolate_angle, read_calibrated_analog


def calibration(clockwise=True):
    sign = 1 if clockwise else -1
    points = [{'value': v, 'x': .5+.40*math.cos(math.radians(135+sign*270*v)),
               'y': .5+.40*math.sin(math.radians(135+sign*270*v))} for v in (0,.2,.4,.6,.8,1)]
    return {'id':'test-template','version':1,'pivot':{'x':.5,'y':.5},
            'scale_points':points,'clockwise':clockwise,'unit':'MPa',
            'minimum':0,'maximum':1,'resolution':.01,'accuracy_specification':None}


def dial(value=.455, competing=False, green_only=False, clockwise=True):
    image=Image.new('RGB',(640,640),'white'); draw=ImageDraw.Draw(image)
    def xy(angle,r): return (320+r*math.cos(math.radians(angle)),320+r*math.sin(math.radians(angle)))
    sign=1 if clockwise else -1
    draw.ellipse((40,40,600,600),outline='black',width=3)
    for v in np.linspace(0,1,51):
        a=135+sign*270*v
        draw.line((*xy(a,246),*xy(a,266)),fill='black',width=4 if round(v*5)==v*5 else 2)
    for p in calibration(clockwise)['scale_points']:
        draw.text((320+(p['x']*640-320)*.78-17,320+(p['y']*640-320)*.78-13),str(p['value']),fill='black',font=ImageFont.load_default(size=26))
    a=135+sign*270*value
    draw.line((320,320,*xy(a,225)),fill='green' if green_only else 'black',width=5)
    draw.line((320,320,*xy(a+180,75)),fill='black',width=23)
    if competing: draw.line((320,320,*xy(135+sign*270*.8,225)),fill='black',width=5)
    stream=io.BytesIO(); image.save(stream,'JPEG',quality=96)
    return stream.getvalue()


@pytest.mark.parametrize('clockwise',[True,False])
@pytest.mark.parametrize('value',[0,.1,.35,.455,.8,1])
def test_calibrated_black_needle_multiple_positions(value,clockwise):
    data=dial(value,clockwise=clockwise)
    result=read_calibrated_analog(data,calibration(clockwise),data)
    assert result['value']==pytest.approx(value,abs=.004),result
    assert result['overlay']['pivot'] and result['overlay']['tip']
    assert result['uncertainty'] is None


def test_green_marker_or_two_black_needles_never_accepted():
    for data in (dial(green_only=True),dial(competing=True)):
        assert read_calibrated_analog(data,calibration(),data)['value'] is None


def test_wrap_uses_intermediate_marks_not_fixed_full_scale_arc():
    points=[{'value':0,'x':.5+.4*math.cos(math.radians(330)),'y':.5+.4*math.sin(math.radians(330))},
            {'value':.2,'x':.9,'y':.5},
            {'value':1,'x':.5,'y':.9}]
    result=interpolate_angle(15,{'pivot':{'x':.5,'y':.5},'clockwise':True,'scale_points':points})
    assert result['value']==round(.2+.8*15/90,3)
    assert interpolate_angle(300,{'pivot':{'x':.5,'y':.5},'clockwise':True,'scale_points':points}) is None


def test_template_rotation_registers_static_ticks():
    data=dial(.455)
    image=cv2.imdecode(np.frombuffer(data,np.uint8),cv2.IMREAD_COLOR)
    matrix=cv2.getRotationMatrix2D((320,320),18,1)
    changed=cv2.warpAffine(image,matrix,(640,640),borderValue=(255,255,255))
    _,encoded=cv2.imencode('.jpg',changed)
    result=read_calibrated_analog(encoded.tobytes(),calibration(),data)
    assert result['value']==pytest.approx(.455,abs=.008),result
    assert result['registration']['inliers']>=12


def test_blank_or_unregistered_image_cannot_use_template_geometry():
    stream=io.BytesIO(); Image.new('RGB',(640,640),'white').save(stream,'JPEG')
    assert read_calibrated_analog(stream.getvalue(),calibration(),dial())['value'] is None


def test_non_square_crop_uses_pixel_metric_for_scale_angles():
    data=dial(.35)
    source=Image.open(io.BytesIO(data)).convert('RGB')
    canvas=Image.new('RGB',(840,640),'white');canvas.paste(source,(100,0))
    stream=io.BytesIO();canvas.save(stream,'JPEG',quality=96);data=stream.getvalue()
    record=calibration()
    for p in record['scale_points']: p['x']=(p['x']*640+100)/840
    result=read_calibrated_analog(data,record,data)
    assert result['value']==pytest.approx(.35,abs=.004),result


def symmetric_dial(value,rotation=0,major_start=246,major_width=4):
    image=Image.new('RGB',(640,640),'white');draw=ImageDraw.Draw(image)
    def xy(a,r): return (320+r*math.cos(math.radians(a)),320+r*math.sin(math.radians(a)))
    draw.ellipse((40,40,600,600),outline='black',width=3)
    for i in range(72): draw.line((*xy(i*5,major_start if i%4==0 else 246),*xy(i*5,266)),fill='black',width=major_width if i%4==0 else 2)
    a=135+270*value
    draw.line((320,320,*xy(a,225)),fill='black',width=5)
    draw.line((320,320,*xy(a+180,75)),fill='black',width=23)
    image=image.rotate(rotation,fillcolor='white')
    stream=io.BytesIO();image.save(stream,'JPEG',quality=96);return stream.getvalue()


@pytest.mark.parametrize('value',[.1,.2,.8])
def test_symmetric_ticks_cannot_prove_registration_orientation(value):
    result=read_calibrated_analog(symmetric_dial(value,180),calibration(),symmetric_dial(.455))
    assert result['value'] is None,result


def test_zero_inlier_homography_is_a_structured_rejection(monkeypatch):
    monkeypatch.setattr(cv2,'findHomography',lambda source,target,*args:(np.eye(3),np.zeros((len(source),1),np.uint8)))
    result=read_calibrated_analog(symmetric_dial(.5,45),calibration(),symmetric_dial(.455))
    assert result['value'] is None


@pytest.mark.parametrize('major_start,major_width',[(220,4),(225,4),(198,18)])
def test_resampled_repeating_major_tick_endpoints_are_not_distinctive_labels(major_start,major_width):
    template=symmetric_dial(.455,major_start=major_start,major_width=major_width)
    data=symmetric_dial(.1,major_start=major_start,major_width=major_width)
    image=cv2.imdecode(np.frombuffer(data,np.uint8),1)
    matrix=cv2.getRotationMatrix2D((320,320),180,1)
    rotated=cv2.warpAffine(image,matrix,(640,640),borderValue=(255,255,255))
    _,encoded=cv2.imencode('.jpg',rotated)
    result=read_calibrated_analog(encoded.tobytes(),calibration(),template)
    assert result['value'] is None,result
