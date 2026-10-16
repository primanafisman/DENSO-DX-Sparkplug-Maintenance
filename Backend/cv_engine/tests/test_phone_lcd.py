"""Regressions from user phone screenshots; values are visibly displayed."""
import io
from pathlib import Path
import pytest
from PIL import Image
from src.vision.images import prepare_image,crop_image
from src.vision.models import Profile,ROI
from src.vision.hybrid_digital import read_local_digital
from src.vision.hybrid import analyze_hybrid
from src.vision.hybrid_display import propose_digital_displays
from src.vision.discovery import discover_image
from src.adapters.equipment_snapshot import EquipmentSnapshot as InstrumentRegistry
from src.vision.text_ocr import LocalTextOCR

@pytest.fixture(scope='module')
def ocr():return LocalTextOCR(__import__('os').environ.get('OCR_MODEL_DIR'))

def attachment(stamp,bounds):
    path=Path.home()/'Downloads'/f'WhatsApp Image 2026-10-14 at {stamp}.jpeg'
    if not path.exists():pytest.skip('Operator phone screenshot not packaged')
    output=io.BytesIO()
    with Image.open(path) as image:image.convert('RGB').crop(bounds).save(output,'PNG')
    return output.getvalue()

@pytest.mark.parametrize('stamp,bounds,value',[
    ('08.09.59',(66,662,654,1100),2.248),
    ('08.12.35',(66,719,654,936),2.242),
])
def test_phone_lcd_digits_and_visible_point_are_read_together(stamp,bounds,value,ocr):
    prepared=prepare_image(attachment(stamp,bounds))
    proposal=propose_digital_displays(prepared,ocr.read_offline(prepared.jpeg)['spans'])[0]
    data=crop_image(prepared,ROI.model_validate(proposal['roi']))
    result=analyze_hybrid(data,Profile(kind='digital',unit='mm',maximum=600,decimals=3),text_ocr=ocr)
    assert result['confidence']['valid'] and result['candidate']['value']==value,result

@pytest.mark.parametrize('stamp,bounds',[
    ('08.09.59',(66,662,654,1100)),('08.12.35',(66,719,654,936)),
])
def test_phone_lcd_has_digital_crop_and_three_observed_decimals(stamp,bounds,ocr):
    prepared=prepare_image(attachment(stamp,bounds))
    spans=ocr.read_offline(prepared.jpeg).get('spans',[])
    proposals=propose_digital_displays(prepared,spans)
    assert len(proposals)==1 and proposals[0]['kind_hint']=='digital',proposals
    assert proposals[0]['observed_decimals']==3,proposals

@pytest.mark.parametrize('stamp,value', [('08.25.39',2.248),('08.25.39 (1)',2.242)])
def test_round_lcd_housing_is_not_automatically_an_analog_pressure_gauge(stamp,value,ocr,tmp_path):
    from src.vision.hybrid_discovery import hybrid_gauge_rois
    prepared=prepare_image(attachment(stamp,(159,385,560,1100)))
    result=discover_image(prepared,InstrumentRegistry([]),ocr,gauge_detector=hybrid_gauge_rois)
    assert any(p['kind_hint']=='digital' and p.get('display_type')=='lcd' for p in result['instruments']),result
    assert not any(p['kind_hint']=='analog' for p in result['instruments']),result
    display=next(p for p in result['instruments'] if p.get('display_type')=='lcd')
    assert display['observed_decimals']==3,display
    reading=analyze_hybrid(crop_image(prepared,ROI.model_validate(display['roi'])),
        Profile(kind='digital',unit='mm',maximum=600,decimals=display['observed_decimals']),text_ocr=ocr)
    assert reading['confidence']['valid'] and reading['candidate']['value']==value,reading
