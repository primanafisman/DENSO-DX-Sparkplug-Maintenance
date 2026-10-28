"""An outer gauge housing may be much larger than its printed tick ring."""
import math

import cv2
import numpy as np
import pytest

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

