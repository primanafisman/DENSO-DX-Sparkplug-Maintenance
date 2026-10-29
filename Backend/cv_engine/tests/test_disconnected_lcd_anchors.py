"""Separated LCD segment ends must locate whole glyphs without adding ink."""
import cv2
import numpy as np
import pytest

from src.vision.hybrid_display import _numeric_line_crop,lcd_decimal_evidence


def separated_strokes(text):
    # Each literal glyph has upper/lower connected components with overlapping
    # horizontal spans. Two pixels of absent ink remain between those parts.
    upper={'2':[(6,0),(46,0),(46,43),(8,43)],
           '3':[(6,0),(46,0),(46,43),(8,43)],
           '6':[(44,0),(4,0),(4,43),(44,43)]}
    lower={'2':[(2,53),(2,93),(44,93)],
           '3':[(46,53),(46,93),(6,93)],
           '6':[(4,53),(46,53),(46,93),(4,93),(4,53)]}
    mask=np.zeros((140,310),np.uint8)
    x=20
    for char in text:
        if char=='.':
            cv2.circle(mask,(x-10,111),4,255,-1);x+=16
        else:
            for points in (upper[char],lower[char]):
                points=np.array([(x+a,15+b) for a,b in points],np.int32)
                cv2.polylines(mask,[points],False,255,8)
            x+=76
    image=np.full((140,310,3),180,np.uint8)
    image[mask>0]=20
    return image,mask


def test_separated_segment_ends_count_as_three_complete_lcd_glyphs():
    image,mask=separated_strokes('2.36')
    row=_numeric_line_crop(image,mask)
    assert row is not None
    assert len(row['digit_centers'])==3,row
    assert lcd_decimal_evidence(row)=={'digits':3,'index':1,'decimals':2}


@pytest.mark.parametrize('text', ['236','2.3.6'])
def test_anchor_grouping_cannot_add_or_remove_decimal_pixels(text):
    image,mask=separated_strokes(text)
    row=_numeric_line_crop(image,mask)
    assert row is not None
    assert lcd_decimal_evidence(row) is None


def decimal_row(points):
    return {'dot_centers':points,'digit_centers':[40.,142.5,202.5],
            'digit_boxes':[(0.,80.),(130.,155.),(190.,215.)],
            'digit_extent':(0.,215.)}


def test_detached_last_glyph_foot_inside_its_body_is_not_a_second_decimal():
    assert lcd_decimal_evidence(decimal_row([92.,208.]))=={'digits':3,'index':1,'decimals':2}


@pytest.mark.parametrize('points', [[208.],[92.,225.],[92.,170.]])
def test_glyph_foot_rule_does_not_invent_a_point_or_discard_interdigit_punctuation(points):
    assert lcd_decimal_evidence(decimal_row(points)) is None

