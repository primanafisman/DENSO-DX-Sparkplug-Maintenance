"""Visible punctuation survives monitor recapture without profile-based repair."""
from pathlib import Path

import cv2
import numpy as np
import pytest
from PIL import Image

from src.vision.hybrid import analyze_hybrid
from src.vision.hybrid_digital import read_local_digital
from src.vision.hybrid_display import lcd_decimal_observation, propose_digital_displays
from src.vision.images import crop_image, prepare_image
from src.vision.models import Profile, ROI
from src.vision.text_ocr import LocalTextOCR
from tests.ocr_fixtures import seven_segment


SCREENSHOTS = [
    ('08.27.56', (44, 611, 676, 820)),
    ('08.27.57', (44, 552, 676, 986)),
    ('08.27.56 (1)', (44, 526, 676, 902)),
]
PROFILE = Profile(kind='digital', unit='mm', minimum=0, maximum=600, decimals=3)


@pytest.fixture(scope='module')
def ocr():
    return LocalTextOCR(Path(__file__).resolve().parents[1] / 'models' / 'ocr')


def screenshot_crop(stamp, bounds):
    path = Path.home() / 'Downloads' / f'WhatsApp Image 2026-10-15 at {stamp}.jpeg'
    if not path.exists():
        pytest.skip('Operator monitor screenshot not packaged')
    with Image.open(path) as source:
        return cv2.cvtColor(np.asarray(source.convert('RGB').crop(bounds)), cv2.COLOR_RGB2BGR)


def encoded(image):
    ok, data = cv2.imencode('.png', image)
    assert ok
    return data.tobytes()


@pytest.mark.parametrize('stamp,bounds', SCREENSHOTS)
def test_monitor_decimal_position_is_measured_from_visible_pixels(stamp, bounds):
    observed = lcd_decimal_observation(screenshot_crop(stamp, bounds))
    assert observed is not None
    assert {key: observed[key] for key in ('digits', 'index', 'decimals')} == {
        'digits': 4, 'index': 1, 'decimals': 3}


@pytest.mark.parametrize('stamp,bounds', SCREENSHOTS)
def test_monitor_lcd_direct_crop_does_not_confuse_green_glass_with_led(stamp, bounds, ocr):
    result = analyze_hybrid(encoded(screenshot_crop(stamp, bounds)), PROFILE, text_ocr=ocr)
    assert result['confidence']['valid'], result
    assert result['candidate']['value'] == 2.248
    assert result['candidate']['raw_text'] == '2.248'


@pytest.mark.parametrize('stamp,bounds', SCREENSHOTS)
def test_monitor_lcd_discovery_and_recrop_read_complete_number(stamp, bounds, ocr):
    prepared = prepare_image(encoded(screenshot_crop(stamp, bounds)))
    spans = ocr.read_offline(prepared.jpeg)['spans']
    proposals = propose_digital_displays(prepared, spans)
    assert len(proposals) == 1
    proposal = proposals[0]
    assert proposal['display_type'] == 'lcd'
    assert proposal['observed_decimals'] == 3
    crop = crop_image(prepared, ROI.model_validate(proposal['roi']))
    result = analyze_hybrid(crop, PROFILE, text_ocr=ocr)
    assert result['confidence']['valid'], result
    assert result['candidate']['value'] == 2.248
    assert result['candidate']['raw_text'] == '2.248'
    assert result['confidence']['probability_correct'] is None


@pytest.mark.parametrize('text', ['2248', '2.24.8'])
def test_missing_or_extra_visible_decimal_has_no_unambiguous_position(text):
    image = cv2.imdecode(np.frombuffer(seven_segment(text), np.uint8), cv2.IMREAD_COLOR)
    assert lcd_decimal_observation(image) is None


@pytest.mark.parametrize('alteration', ['point_removed', 'extra_point'])
def test_monitor_punctuation_damage_cannot_be_repaired_from_profile(alteration, ocr):
    image = screenshot_crop(*SCREENSHOTS[0])
    if alteration == 'point_removed':
        # Measured point occupies x=298..312, y=166..181 in this crop.
        erase = np.zeros(image.shape[:2], np.uint8)
        erase[164:184, 296:315] = 255
        image = cv2.inpaint(image, erase, 3, cv2.INPAINT_TELEA)
    else:
        # A second distinct point between the second and third digit.
        cv2.circle(image, (395, 174), 7, (20, 30, 26), -1)
    assert lcd_decimal_observation(image) is None
    result = read_local_digital(encoded(image), PROFILE, ocr)
    assert not result['accepted'], result
    assert result['candidate']['value'] is None
