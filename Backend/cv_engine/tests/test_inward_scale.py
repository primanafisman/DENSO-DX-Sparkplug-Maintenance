"""An outer gauge housing may be much larger than its printed tick ring."""
import math
import io

import cv2
import numpy as np
import pytest
from PIL import Image

from src.vision.hybrid_auto_analog import detect_scale


PIVOT = np.array([360., 360.])
RADIUS = 320.


def inward_tick_mask(*, missing=None, short=False, ring_count=None):
    mask = np.zeros((720, 720), np.uint8)
    # Literal observed 0,.2,.4,.6,.8,1 strokes span 270 degrees, with
    # thinner real subdivisions. Nothing derives expected angles from a reader.
    count = 51 if ring_count is None else ring_count * 5
    for index in range(count):
        major = index % 10 == 0 if ring_count is None else index % 5 == 0
        if major and index // 10 == missing:
            continue
        angle = math.radians(135 + 5.4 * index if ring_count is None else index * 360 / count)
        low = .55 if major else .615
        high = .595 if short else .67
        if short and not major:
            low = .575
        direction = np.array([math.cos(angle), math.sin(angle)])
        start = tuple(np.rint(PIVOT + low * RADIUS * direction).astype(int))
        end = tuple(np.rint(PIVOT + high * RADIUS * direction).astype(int))
        cv2.line(mask, start, end, 255, 10 if major else 3)
    return mask


def test_observed_inward_tick_ring_is_recovered_inside_a_large_housing():
    mask = inward_tick_mask()
    major, info = detect_scale(mask, mask, PIVOT, RADIUS)
    assert major is not None, info
    assert [tick['angle'] for tick in major] == pytest.approx([135, 189, 243, 297, 351, 45], abs=1)


def test_complete_width_separation_preserves_a_thinner_endpoint_major():
    mask = np.zeros((720,720), np.uint8)
    for index in range(51):
        major = index % 10 == 0
        angle = math.radians(135+5.4*index)
        direction = np.array([math.cos(angle),math.sin(angle)])
        start = tuple(np.rint(PIVOT+(.55 if major else .615)*RADIUS*direction).astype(int))
        end = tuple(np.rint(PIVOT+.67*RADIUS*direction).astype(int))
        cv2.line(mask,start,end,255,(5 if index==0 else 10) if major else 2)
    major,info=detect_scale(mask,mask,PIVOT,RADIUS)
    assert major is not None,info
    assert [t['angle'] for t in major] == pytest.approx([135,189,243,297,351,45],abs=1)
    assert info['method']=='six thick major strokes + unique open gap'
    assert not info.get('requires_manual_confirmation',False)


def test_inward_strokes_can_agree_across_bands_despite_one_wide_paint_edge():
    mask = inward_tick_mask()
    # A short dark edge among the subdivisions has the same width as a major;
    # it must not rotate the open gap or replace an actually observed major.
    direction = np.array([math.cos(math.radians(224)), math.sin(math.radians(224))])
    start = tuple(np.rint(PIVOT + .55 * RADIUS * direction).astype(int))
    end = tuple(np.rint(PIVOT + .67 * RADIUS * direction).astype(int))
    cv2.line(mask, start, end, 255, 12)
    major, info = detect_scale(mask, mask, PIVOT, RADIUS)
    assert major is not None, info
    assert [tick['angle'] for tick in major] == pytest.approx([135, 189, 243, 297, 351, 45], abs=1)
    assert info['inward_recovery']['maximum_angle_disagreement'] <= 3


def test_inward_subset_keeps_a_readable_candidate_for_manual_confirmation_only():
    from src.vision.hybrid import analyze_hybrid
    from src.vision.models import Profile
    mask = inward_tick_mask()
    def point(angle, radius):
        return tuple(np.rint(PIVOT + radius * np.array([math.cos(math.radians(angle)), math.sin(math.radians(angle))])).astype(int))
    cv2.line(mask, point(224, .55*RADIUS), point(224, .67*RADIUS), 255, 12)
    image = cv2.cvtColor(255-mask, cv2.COLOR_GRAY2BGR)
    cv2.circle(image, (360, 360), 320, (30, 30, 30), 5)
    cv2.line(image, (360, 360), point(135+270*.49, .64*RADIUS), (25, 25, 25), 7)
    cv2.line(image, (360, 360), point(135+270*.49+180, .20*RADIUS), (25, 25, 25), 20)
    cv2.circle(image, (360, 360), 43, (25, 25, 25), -1)
    cv2.circle(image, (360, 360), 25, (180, 170, 40), -1)
    stream = io.BytesIO()
    Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB)).save(stream, 'PNG')
    class NumericScale:
        def read(self, _):
            spans=[]
            for index in range(6):
                x,y=point(135+54*index, 180)
                spans.append({'text': str(index/5), 'ocr_score': .99,
                              'roi': {'x': x/720-.02, 'y': y/720-.02, 'width': .04, 'height': .04}})
            return {'available': True, 'text': '0 .2 .4 .6 .8 1', 'spans': spans}
    result = analyze_hybrid(stream.getvalue(), Profile(kind='analog', unit='MPa', minimum=0, maximum=1), text_ocr=NumericScale())
    assert result['raw_prediction'] == pytest.approx(.49, abs=.012)
    assert result['validated_prediction'] is None
    assert result['geometry']['requires_manual']


def test_one_radial_band_cannot_independently_confirm_an_inward_scale():
    mask = inward_tick_mask(short=True)
    major, _ = detect_scale(mask, mask, PIVOT, RADIUS)
    assert major is None


@pytest.mark.parametrize('missing', [0, 2, 5])
def test_missing_inward_major_is_not_replaced_with_a_minor(missing):
    mask = inward_tick_mask(missing=missing)
    major, _ = detect_scale(mask, mask, PIVOT, RADIUS)
    assert major is None


@pytest.mark.parametrize('count', [7, 8, 9])
def test_complete_inward_ring_is_not_reduced_to_an_open_six_mark_scale(count):
    mask = inward_tick_mask(ring_count=count)
    major, _ = detect_scale(mask, mask, PIVOT, RADIUS)
    assert major is None

