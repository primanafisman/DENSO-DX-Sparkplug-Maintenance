from src.vision import discovery

def span(text,x=.2,score=.99):
    return {'text':text,'ocr_score':score,'roi':{'x':x,'y':.2,'width':.1,'height':.05}}

def test_display_unit_comes_from_reliable_ocr_inside_the_indicator():
    roi={'x':.1,'y':.1,'width':.4,'height':.4}
    assert discovery.observed_display_unit(roi,[span('2.248mm'),span('MPa',x=.8)])=='mm'
    assert discovery.observed_display_unit(roi,[span('MPA')])=='MPa'

def test_partial_ambiguous_or_low_quality_unit_does_not_become_an_observation():
    roi={'x':.1,'y':.1,'width':.4,'height':.4}
    assert discovery.observed_display_unit(roi,[span('mm'),span('MPa')]) is None
    assert discovery.observed_display_unit(roi,[span('mm',score=.6)]) is None
    assert discovery.observed_display_unit(roi,[span('ORIGIN')]) is None
