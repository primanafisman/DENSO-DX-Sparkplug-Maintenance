import io

import pytest
from PIL import Image

from src.vision.models import Profile
from tests.ocr_fixtures import printed_label


@pytest.fixture(scope='module')
def ocr():
    from src.vision.text_ocr import LocalTextOCR
    return LocalTextOCR(__import__('os').environ.get('OCR_MODEL_DIR'))


def test_plain_numeric_display_uses_local_text_ocr_when_segment_shape_does_not_match(ocr):
    from src.vision.text_digital import read_text_digital
    result=read_text_digital(printed_label('15.96'),Profile(kind='digital',unit='mm',maximum=100),ocr)
    assert result['accepted'],result
    assert result['candidate']['value']==15.96 and len(result['variants'])==2
    assert result['probability_correct'] is None


def test_local_text_does_not_restore_missing_decimal_or_read_analog_scale(ocr):
    from src.vision.text_digital import read_text_digital
    assert not read_text_digital(printed_label('248'),Profile(kind='digital',decimals=3),ocr)['accepted']
    assert not read_text_digital(printed_label('15.96'),Profile(kind='analog'),ocr)['accepted']


def test_multiple_numeric_rows_are_not_a_unique_digital_value(ocr):
    from src.vision.text_digital import read_text_digital
    label=Image.open(io.BytesIO(printed_label('15.96')))
    image=Image.new('RGB',(label.width,label.height*2),'white')
    image.paste(label,(0,0));image.paste(label,(0,label.height))
    stream=io.BytesIO();image.save(stream,'PNG')
    assert not read_text_digital(stream.getvalue(),Profile(kind='digital'),ocr)['accepted']


def test_pipeline_accepts_strict_printed_digits_without_cloud(ocr):
    from src.vision.hybrid import analyze_hybrid
    result=analyze_hybrid(printed_label('15.96'),Profile(kind='digital',unit='mm',maximum=100),text_ocr=ocr)
    assert result['candidate']['value']==15.96
    assert result['confidence']['valid'] and result['confidence']['level']!='high'
