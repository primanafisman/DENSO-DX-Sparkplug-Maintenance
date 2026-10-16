import io

import cv2
import numpy as np
import pytest
from PIL import Image, ImageDraw

from src.vision.images import prepare_image, crop_image, assess_quality
from src.vision.models import ROI


def encoded(image):
    stream = io.BytesIO()
    image.save(stream, 'PNG')
    return stream.getvalue()


def test_auto_display_corners_detect_tilted_frame_but_abstain_on_blank():
    from src.vision.preprocessing import propose_display_corners
    source=Image.new('RGB',(600,350),'white')
    draw=ImageDraw.Draw(source)
    draw.polygon([(70,60),(530,95),(510,290),(55,310)],fill='#bbcccc',outline='black',width=5)
    draw.text((140,130),'12.70',fill='black',font_size=70)
    corners=propose_display_corners(encoded(source))
    assert corners is not None
    assert len(corners.points)==4 and corners.points[0][1]<corners.points[1][1]
    assert propose_display_corners(encoded(Image.new('RGB',(400,200),'white'))) is None




def test_small_roi_is_cropped_from_original_not_downscaled_preview():
    image = Image.new('RGB', (4000, 3000), 'white')
    prepared = prepare_image(encoded(image))
    assert prepared.width == 2048
    crop = Image.open(io.BytesIO(crop_image(prepared, ROI(x=.25, y=.25, width=.1, height=.1))))
    assert crop.size == (400, 300)
    assert prepared.source_width == 4000


def test_exif_native_crop_preserves_orientation():
    source = Image.new('RGB', (3000, 2000), 'white')
    ImageDraw.Draw(source).rectangle((0, 0, 1499, 1999), fill='red')
    exif = Image.Exif(); exif[274] = 6
    stream = io.BytesIO(); source.save(stream, 'JPEG', exif=exif)
    prepared = prepare_image(stream.getvalue())
    crop = Image.open(io.BytesIO(crop_image(prepared, ROI(x=0, y=0, width=1, height=.5))))
    assert crop.size == (2000, 1500)
    assert crop.getpixel((1000, 500))[0] > 200
    assert crop.getpixel((1000, 500))[1] < 50


def test_rectification_accepts_convex_corners_and_preserves_content():
    from src.vision.preprocessing import rectify_crop
    from src.vision.v2_models import Quadrilateral
    photo = Image.new('RGB', (400, 300), 'white')
    ImageDraw.Draw(photo).polygon([(40, 40), (350, 60), (330, 250), (60, 240)], fill='black')
    corners = Quadrilateral(points=[[.1, .133], [.875, .2], [.825, .833], [.15, .8]])
    result = Image.open(io.BytesIO(rectify_crop(encoded(photo), corners)))
    assert result.width > 270 and result.height > 180
    assert np.asarray(result)[20:-20, 20:-20].mean() < 10


@pytest.mark.parametrize('points', [
    [[0,0], [1,1], [1,0], [0,1]],
    [[0,0], [.001,0], [.001,.001], [0,.001]],
    [[0,0], [1,0], [.5,.1], [0,1]],
    [[-.1,0], [1,0], [1,1], [0,1]],
])
def test_invalid_perspective_corners_are_rejected(points):
    from src.vision.v2_models import Quadrilateral
    with pytest.raises(ValueError):
        Quadrilateral(points=points)


def test_quality_detects_large_washed_out_patch_in_critical_center():
    source = Image.new('RGB', (400, 400), '#aaaaaa')
    draw = ImageDraw.Draw(source)
    draw.ellipse((25,25,375,375), outline='black', width=6)
    draw.line((200,200,200,60), fill='black', width=5)
    draw.rectangle((135,100,265,260), fill='white')
    quality = assess_quality(encoded(source))
    assert quality['glare']['critical_overlap']
    assert quality['glare']['suspected']
    assert quality['probability_correct'] is None


def test_roi_proposals_are_bounded_and_never_claim_identity():
    from src.vision.preprocessing import propose_rois
    source = Image.new('RGB', (800, 600), '#cccccc')
    draw = ImageDraw.Draw(source)
    draw.ellipse((50,100,350,400), fill='white', outline='black', width=8)
    draw.rectangle((430,180,740,320), fill='#112211', outline='black', width=5)
    draw.text((460,200), '12.70', fill='#88ff44', font_size=70)
    proposals = propose_rois(prepare_image(encoded(source)))
    assert 1 <= len(proposals) <= 12
    for item in proposals:
        ROI.model_validate(item['roi'])
        assert item['requires_review'] is True
        assert item.get('instrument_id') is None


