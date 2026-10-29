"""Measured LED strokes may be italic; alignment must preserve every symbol."""
import io

import cv2
import numpy as np
import pytest
from PIL import Image

from src.vision.hybrid_digital import read_local_digital
from src.vision import hybrid_digital
from src.vision.models import Profile
from tests.ocr_fixtures import seven_segment


def italic_led(text, shear=.18):
    image=np.asarray(Image.open(io.BytesIO(seven_segment(text,led=True))).convert('RGB'))
    h,w=image.shape[:2]
    # A literal display with left-leaning bars, photographed in a full dark frame.
    matrix=np.float32([[1,-shear,h*shear+16],[0,1,12]])
    image=cv2.warpAffine(image,matrix,(w+round(h*shear)+32,h+24),
                         flags=cv2.INTER_NEAREST,borderValue=(16,24,16))
    ok,data=cv2.imencode('.png',cv2.cvtColor(image,cv2.COLOR_RGB2BGR))
    assert ok
    return data.tobytes()


@pytest.mark.parametrize('text,value', [('0.433',.433),('0.725',.725)])
def test_complete_italic_led_keeps_digits_and_observed_decimal(text,value):
    result=read_local_digital(italic_led(text),Profile(kind='digital',unit='MPa',maximum=1,decimals=3))
    assert result['accepted'],result
    assert result['candidate']['value']==value
    assert result['candidate']['raw_text']==text


def test_italic_led_without_a_visible_decimal_cannot_acquire_one():
    result=read_local_digital(italic_led('0433'),Profile(kind='digital',unit='MPa',maximum=1,decimals=3))
    assert not result['accepted']
    assert result['candidate']['value'] is None


def test_italic_led_with_negative_sign_cannot_become_positive():
    result=read_local_digital(italic_led('-0.433'),Profile(kind='digital',unit='MPa',maximum=1,decimals=3))
    assert not result['accepted']
    assert result['candidate']['value'] is None


def test_measured_led_keeps_its_reader_when_dim_row_heuristic_disagrees(monkeypatch):
    # A window located by green strokes is stronger routing evidence than a
    # second whole-crop mask whose glow/ghost bars may join adjacent columns.
    monkeypatch.setattr(hybrid_digital,'_green_row_evidence',lambda *args,**kwargs:False)
    result=read_local_digital(italic_led('0.433',shear=.24),Profile(kind='digital',unit='MPa',maximum=1,decimals=3))
    assert result['display_bounds'][0]['display_type']=='green-led'
    assert result['accepted'],result
    assert result['candidate']['raw_text']=='0.433'

