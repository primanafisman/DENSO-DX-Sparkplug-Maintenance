"""A filename displayed by a photo viewer does not identify the instrument."""
import pytest

from src.adapters.equipment_snapshot import EquipmentSnapshot
from src.vision.discovery import label_rows


def span(text, x=.1):
    return {'text': text, 'ocr_score': .99,
            'roi': {'x': x, 'y': .7, 'width': .3, 'height': .04}}


@pytest.mark.parametrize('filename', [
    'IMG_20261009_085449.jpg', 'IMG_20261009_085054.JPEG',
    'capture 01.png', 'photo.webp', 'scan.bmp', 'photo.gif',
    'image.tif', 'image.tiff', 'IMG_1234.HEIC', 'image.heif',
])
def test_unregistered_image_filename_is_not_proposed_as_an_equipment_label(filename):
    assert label_rows([span(filename)], EquipmentSnapshot([]), '') == []


def test_filename_does_not_merge_into_adjacent_registered_equipment_code():
    registry = EquipmentSnapshot([{'id': 'gauge-1', 'name': 'Gasket gauge', 'code': 'CG-01'}])
    labels = label_rows([span('CG-01'), span('IMG_20261009_085449.jpg', x=.45)], registry, '')
    assert len(labels) == 1
    assert labels[0]['label']['raw_text'] == 'CG-01'
    assert labels[0]['label']['suggested_id'] == 'gauge-1'


@pytest.mark.parametrize('field', ['code', 'name', 'alias'])
def test_exact_registered_identity_that_looks_like_a_filename_is_preserved(field):
    asset = {'id': 'gauge-1', 'name': 'Gasket gauge', 'code': 'CG-01', 'aliases': []}
    filename = 'IMG_20261009_085449.jpg'
    if field == 'alias':
        asset['aliases'] = [filename]
    else:
        asset[field] = filename
    labels = label_rows([span(filename)], EquipmentSnapshot([asset]), '')
    assert len(labels) == 1
    assert labels[0]['label']['suggested_id'] == 'gauge-1'


def test_partial_registered_code_match_does_not_make_a_filename_an_equipment_label():
    registry = EquipmentSnapshot([{'id': 'gauge-1', 'name': 'Gasket gauge',
                                   'code': 'IMG_20261009'}])
    assert label_rows([span('IMG_20261009_085449.jpg')], registry, '') == []


def test_image_extension_word_inside_an_equipment_label_is_preserved():
    labels = label_rows([span('Camera JPG holder')], EquipmentSnapshot([]), '')
    assert len(labels) == 1
    assert labels[0]['label']['raw_text'] == 'Camera JPG holder'


@pytest.mark.parametrize('legend', [
    'ORIGIN ON/OFF', 'origin   on / off', 'ON-OFF | ORIGIN',
    'PRESET ZERO / ABS', 'HOLD/DATA PRESET', 'OUT1 OUT2', 'OUT 1 · OUT 2',
])
def test_combined_control_legends_are_not_equipment_labels(legend):
    assert label_rows([span(legend)], EquipmentSnapshot([]), '') == []


@pytest.mark.parametrize('field', ['code', 'name', 'alias'])
def test_exact_registered_control_legend_identity_is_preserved(field):
    asset = {'id': 'fixture-1', 'name': 'Control fixture', 'code': 'CF-01', 'aliases': []}
    if field == 'alias':
        asset['aliases'] = ['ORIGIN ON/OFF']
    else:
        asset[field] = 'ORIGIN ON/OFF'
    labels = label_rows([span('ORIGIN ON/OFF')], EquipmentSnapshot([asset]), '')
    assert len(labels) == 1
    assert labels[0]['label']['suggested_id'] == 'fixture-1'


def test_partial_registered_name_does_not_promote_control_legends():
    registry = EquipmentSnapshot([{'id': 'fixture-1', 'name': 'ORIGIN', 'code': 'CF-01'}])
    assert label_rows([span('ORIGIN ON/OFF')], registry, '') == []


def test_control_legends_do_not_merge_into_adjacent_registered_label():
    registry = EquipmentSnapshot([{'id': 'gauge-1', 'name': 'Gasket gauge', 'code': 'CG-01'}])
    labels = label_rows([span('CG-01'), span('ORIGIN ON/OFF', x=.45)], registry, '')
    assert len(labels) == 1
    assert labels[0]['label']['raw_text'] == 'CG-01'
    assert labels[0]['label']['suggested_id'] == 'gauge-1'


@pytest.mark.parametrize('text', [
    'ORIGIN pressure fixture', 'ON/OFF test gauge', 'PRESET height gauge', 'ORIGIN 測定器',
])
def test_control_words_inside_an_ordinary_equipment_label_are_preserved(text):
    labels = label_rows([span(text)], EquipmentSnapshot([]), '')
    assert len(labels) == 1
    assert labels[0]['label']['raw_text'] == text


def test_registered_control_legend_still_requires_manual_selection_when_ocr_is_weak():
    registry = EquipmentSnapshot([{'id': 'fixture-1', 'name': 'ORIGIN ON/OFF', 'code': 'CF-01'}])
    weak_span = {**span('ORIGIN ON/OFF'), 'ocr_score': .7}
    labels = label_rows([weak_span], registry, '')
    assert len(labels) == 1
    assert labels[0]['label']['suggested_id'] is None
    assert labels[0]['label']['requires_operator_selection'] is True
    assert labels[0]['label']['level'] == 'medium'
