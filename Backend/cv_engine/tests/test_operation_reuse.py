import io
from unittest.mock import patch
from PIL import Image
from src.vision.images import prepare_image,crop_image
from src.vision.models import ROI
def test_decoded_source_opens_once_and_preserves_crop_pixels():
    from src.services.image_service import DecodedSource
    image=Image.new('RGB',(800,600),'white');stream=io.BytesIO();image.save(stream,'PNG');prepared=prepare_image(stream.getvalue());roi=ROI(x=.1,y=.2,width=.5,height=.5);expected=crop_image(prepared,roi)
    real_open=Image.open
    with patch('PIL.Image.open',wraps=real_open) as opened:
        with DecodedSource(prepared) as decoded:
            assert decoded.crop(roi)==expected
            assert decoded.crop(roi)==expected
        assert opened.call_count==1
    assert decoded.image is None

def test_hybrid_ocr_cache_reuses_identical_bytes_and_keeps_distinct_variants_independent():
    from src.vision.hybrid import OfflineOCR
    class CountingOCR:
        def __init__(self):self.calls=0
        def read_offline(self,data):self.calls+=1;return {'text':data.decode(),'spans':[]}
    source=CountingOCR();reader=OfflineOCR(source)
    first=reader.read(b'original');first['text']='tampered'
    assert reader.read(b'original')['text']=='original'
    assert reader.read(b'contrast')['text']=='contrast'
    assert source.calls==2
