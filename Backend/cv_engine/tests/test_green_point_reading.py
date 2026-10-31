import io

import pytest
from PIL import Image, ImageDraw

from src.vision.hybrid_digital import read_local_digital
from src.vision.models import Profile
from tests.ocr_fixtures import seven_segment


def pressure_profile(*, minimum=0):
    return Profile(kind='digital', unit='MPa', minimum=minimum, maximum=1, decimals=3)


@pytest.mark.parametrize('visible,raw,value', [('.525', '0.525', .525), ('-.525', '-0.525', -.525)])
def test_visible_leading_decimal_is_read_without_inventing_a_point(visible, raw, value):
    result = read_local_digital(seven_segment(visible, led=True), pressure_profile(minimum=-1))
    assert result['accepted'], result
    assert result['candidate']['raw_text'] == raw
    assert result['candidate']['value'] == value


def test_pressure_range_cannot_supply_a_missing_leading_decimal():
    result = read_local_digital(seven_segment('525', led=True), pressure_profile())
    assert not result['accepted'] and result['candidate']['value'] is None


def point_with_extra_mark(colour):
    image = Image.open(io.BytesIO(seven_segment('0.379', led=True))).convert('RGB')
    # A small inactive point between the 3 and 7 is only visible at low V.
    ImageDraw.Draw(image).ellipse((152, 106, 159, 113), fill=colour)
    stream = io.BytesIO(); image.save(stream, 'PNG')
    return stream.getvalue()


def test_one_dim_point_artifact_cannot_veto_three_agreeing_original_point_positions():
    result = read_local_digital(point_with_extra_mark((65, 115, 25)), pressure_profile())
    assert result['accepted'], result
    assert result['candidate']['value'] == .379


def test_an_extra_point_visible_in_multiple_masks_still_abstains():
    result = read_local_digital(point_with_extra_mark((80, 200, 40)), pressure_profile())
    assert not result['accepted'] and result['candidate']['value'] is None

def test_dim_leading_decimal_survives_rotated_display_geometry():
    image = Image.open(io.BytesIO(seven_segment('.525', led=True))).convert('RGB')
    ImageDraw.Draw(image).ellipse((16, 106, 23, 113), fill=(65, 115, 25))
    image = image.rotate(-27, expand=True, resample=Image.Resampling.BICUBIC, fillcolor='#101810')
    stream = io.BytesIO(); image.save(stream, 'PNG')
    result = read_local_digital(stream.getvalue(), pressure_profile())
    assert result['accepted'], result
    assert result['candidate']['value'] == .525

def test_led_row_does_not_require_every_segment_to_be_highly_saturated():
    import numpy as np
    image = np.asarray(Image.open(io.BytesIO(seven_segment('.525', led=True))).convert('RGB')).copy()
    lit = image[:, :, 1] > 200
    image[lit] = (160, 220, 145)  # Measured green colour has S≈87, below the strict S90 mask.
    stream = io.BytesIO(); Image.fromarray(image).save(stream, 'PNG')
    result = read_local_digital(stream.getvalue(), pressure_profile())
    assert result['accepted'], result
    assert result['candidate']['value'] == .525

def test_a_clipped_leading_point_requires_a_complete_display_crop():
    image = Image.open(io.BytesIO(seven_segment('.525', led=True))).convert('RGB')
    stream = io.BytesIO(); image.crop((18, 0, image.width, image.height)).save(stream, 'PNG')
    result = read_local_digital(stream.getvalue(), pressure_profile())
    assert not result['accepted'] and result['candidate']['value'] is None


def test_negative_leading_decimal_does_not_bypass_positive_pressure_range():
    result = read_local_digital(seven_segment('-.525', led=True), pressure_profile())
    assert not result['accepted'] and result['candidate']['value'] is None

@pytest.mark.parametrize('visible', ['.525', '-.525'])
def test_bottom_clipped_leading_decimal_requires_a_new_complete_crop(visible):
    image = Image.open(io.BytesIO(seven_segment(visible, led=True))).convert('RGB')
    stream = io.BytesIO(); image.crop((0, 0, image.width, 112)).save(stream, 'PNG')
    result = read_local_digital(stream.getvalue(), pressure_profile(minimum=-1))
    assert not result['accepted'] and result['candidate']['value'] is None


def test_a_competing_point_in_a_bright_mask_cannot_be_outvoted():
    image=Image.open(io.BytesIO(seven_segment('0.179',led=True))).convert('RGB')
    draw=ImageDraw.Draw(image)
    draw.ellipse((130,108,136,114),fill=(80,200,40))
    draw.line((138,104,136,110),fill=(70,160,35),width=2)
    stream=io.BytesIO();image.save(stream,'PNG')
    result=read_local_digital(stream.getvalue(),pressure_profile())
    assert not result['accepted'] and result['candidate']['value'] is None


def test_dim_fallbacks_do_not_hide_a_brighter_competing_leading_point():
    from src.vision.hybrid_digital import _green_points_agree
    def point(position, brightness):
        return {'decimal_dots':1,'decimal_positions':[position],
                'decimal_row_positions':[position],'brightness_threshold':brightness}
    evidence=[None,None,point(-.1,150),None,point(.7,80),point(.7,95)]
    assert not _green_points_agree(evidence,1)


def test_punctuation_projection_memory_is_bounded_for_a_large_green_background():
    import tracemalloc
    import numpy as np
    from src.vision.hybrid_display import _row_punctuation
    mask=np.full((1000,2000),255,np.uint8)
    quad=np.float32([[800,400],[1200,400],[1200,600],[800,600]])
    tracemalloc.start()
    try:
        assert _row_punctuation(mask,quad) is None
        _,peak=tracemalloc.get_traced_memory()
    finally:
        tracemalloc.stop()
    assert peak<30*1024*1024,peak
