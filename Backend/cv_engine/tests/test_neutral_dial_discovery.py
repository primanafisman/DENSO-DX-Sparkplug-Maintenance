import cv2
import numpy as np

from src.vision import hybrid_geometry
from src.vision.hybrid_auto_analog import read_auto_analog
from src.vision.hybrid_discovery import hybrid_gauge_rois
from src.vision.images import prepare_image


def neutral_face(*, colourful=False, with_strokes=True):
    image = np.full((900, 650, 3), 160, np.uint8)
    # The face occupies only a small, off-centre part of the machine scene.
    cv2.rectangle(image, (25, 40), (610, 250), (215, 215, 215), -1)
    centre = (215, 435)
    colour = (0, 0, 220) if colourful else (238, 238, 238)
    cv2.ellipse(image, centre, (62, 88), 24, 0, 360, colour, -1)
    cv2.ellipse(image, centre, (62, 88), 24, 0, 360, (35, 35, 35), 3)
    if with_strokes:
        cv2.circle(image, centre, 10, (30, 30, 30), -1)
        cv2.line(image, centre, (230, 380), (30, 30, 30), 3)
    return image


def encoded(image):
    return cv2.imencode('.png', image)[1].tobytes()


def test_small_offcentre_tilted_neutral_face_is_proposed_in_full_scene():
    # Losing non-red ellipses previously left discovery on a false housing circle.
    assert hasattr(hybrid_geometry, 'neutral_dial_ellipses')
    ellipses = hybrid_geometry.neutral_dial_ellipses(neutral_face())
    assert any(abs(centre[0]-215) < 5 and abs(centre[1]-435) < 5
               and min(axes) > 110 and max(axes) > 160
               for centre, axes, _ in ellipses)


def test_coloured_decoration_does_not_qualify_as_neutral_dial_face():
    assert hasattr(hybrid_geometry, 'neutral_dial_ellipses')
    assert hybrid_geometry.neutral_dial_ellipses(neutral_face(colourful=True)) == []


def test_neutral_ring_without_scale_does_not_become_readable_gauge():
    # Geometry can propose a face; it cannot certify six scale marks or a value.
    image = neutral_face(with_strokes=False)
    assert hasattr(hybrid_geometry, 'neutral_dial_ellipses')
    assert hybrid_geometry.neutral_dial_ellipses(image)
    assert read_auto_analog(encoded(image[335:535, 115:315]))['value'] is None
    proposals = hybrid_gauge_rois(prepare_image(encoded(image)), [])
    assert not [p for p in proposals if p['kind_hint'] == 'analog']

def test_native_locator_keeps_source_detail_when_prepared_thumbnail_has_lost_it():
    from src.vision.images import PreparedImage
    from src.vision.hybrid_discovery import _native_discovery_thumbnail
    source = encoded(neutral_face())
    thumbnail = encoded(np.full((90, 65, 3), 160, np.uint8))
    prepared = PreparedImage(thumbnail, 65, 90, 'synthetic', source, 650, 900)
    native = _native_discovery_thumbnail(prepared)
    assert any(abs(centre[0]-215) < 5 and abs(centre[1]-435) < 5
               for centre, _, _ in hybrid_geometry.neutral_dial_ellipses(native))


def test_native_locator_uses_the_same_exif_orientation_as_upload():
    import io
    from PIL import Image
    from src.vision.hybrid_discovery import _native_discovery_thumbnail
    image = Image.fromarray(cv2.cvtColor(neutral_face(), cv2.COLOR_BGR2RGB))
    exif = image.getexif(); exif[274] = 6
    stream = io.BytesIO(); image.save(stream, 'JPEG', quality=98, exif=exif)
    prepared = prepare_image(stream.getvalue())
    native = _native_discovery_thumbnail(prepared)
    assert native.shape[:2] == (650, 900)
    assert any(abs(centre[0]-464) < 5 and abs(centre[1]-215) < 5
               for centre, _, _ in hybrid_geometry.neutral_dial_ellipses(native))
