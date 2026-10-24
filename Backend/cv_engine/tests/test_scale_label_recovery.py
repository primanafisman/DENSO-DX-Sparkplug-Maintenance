import io

import pytest
from PIL import Image

from src.vision.hybrid import analyze_hybrid
from src.vision.models import Profile
from tests.test_hybrid_auto_analog import auto_dial


class LocalScaleLabels:
    """A detector miss globally; only two independently read local digit pairs."""
    def __init__(self, labels=None, score=.98):
        self.labels = labels or ['02', '08', '', '', '', '']
        self.score = score
        self.calls = 0

    def read(self, _):
        return {'available': True, 'text': '', 'spans': []}

    def read_upright(self, _):
        text = self.labels[self.calls % 6]
        self.calls += 1
        return {'available': True, 'text': text, 'spans': [] if not text else [
            {'text': text, 'ocr_score': self.score, 'roi': {'x': .1, 'y': .1, 'width': .8, 'height': .8}}]}


def analyze(image, reader):
    return analyze_hybrid(image, Profile(kind='analog', unit='MPa', minimum=0,
                                         maximum=1, decimals=3), text_ocr=reader)


def test_local_scale_labels_corroborate_direction_without_changing_needle_value():
    reader = LocalScaleLabels()
    result = analyze(auto_dial(.455), reader)
    assert result['validated_prediction'] == pytest.approx(.455, abs=.012), result
    assert result['geometry']['scale_direction']['confirmed']
    assert result['geometry']['scale_direction']['recovery']['recognized_labels'] == 2
    assert reader.calls == 2


@pytest.mark.parametrize('labels', [
    ['02', '', '', '', '', ''],
    ['02', '02', '02', '02', '02', '02'],
    ['2', '8', '', '', '', ''],
    ['12', '18', '', '', '', ''],
])
def test_one_duplicate_or_nonfamily_local_label_cannot_confirm_direction(labels):
    result = analyze(auto_dial(.455), LocalScaleLabels(labels))
    assert result['validated_prediction'] is None
    assert not result['confidence']['valid']


def test_mirrored_dial_uses_local_numeric_order_rather_than_family_clockwise_assumption():
    mirrored = Image.open(io.BytesIO(auto_dial(.205))).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    stream = io.BytesIO(); mirrored.save(stream, 'PNG')
    result = analyze(stream.getvalue(), LocalScaleLabels(['08', '02', '', '', '', '']))
    assert result['validated_prediction'] == pytest.approx(.205, abs=.012), result
    assert result['geometry']['scale_direction']['confirmed']


def test_compact_pairs_with_uncertain_ocr_do_not_acquire_a_decimal():
    result = analyze(auto_dial(.455), LocalScaleLabels(score=.89))
    assert result['validated_prediction'] is None
    assert not result['confidence']['valid']


def test_local_numbers_never_override_ambiguous_needles():
    reader = LocalScaleLabels()
    result = analyze(auto_dial(.455, competing=True), reader)
    assert result['validated_prediction'] is None
    assert reader.calls == 0
