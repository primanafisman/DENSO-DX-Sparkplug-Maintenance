"""Printed hardware captions must not become another measured display."""
from src.vision.hybrid_digital import _exclude_display_captions


def proposal(box):
    return {'box':box,'display_type':'lcd','low_contrast':True}


def span(text,score=.99,box=(.1,.05,.2,.08)):
    return {'text':text,'ocr_score':score,'roi':dict(zip(('x','y','width','height'),box))}


def test_recognized_brand_caption_does_not_count_as_a_second_display():
    small=proposal((.1,.05,.2,.08));numeric=proposal((.05,.08,.9,.75))
    kept,ignored=_exclude_display_captions([small,numeric],{'spans':[span('SMC')]})
    assert kept==[numeric]
    assert len(ignored)==1


def test_small_caption_inside_numeric_display_does_not_erase_the_display():
    numeric=proposal((.05,.08,.9,.75))
    kept,_=_exclude_display_captions([numeric],{'spans':[span('SMC')]})
    assert kept==[numeric]


def test_numeric_secondary_display_is_not_a_brand_caption():
    small=proposal((.1,.05,.2,.08));numeric=proposal((.05,.08,.9,.75))
    kept,_=_exclude_display_captions([small,numeric],{'spans':[span('12.7')]})
    assert kept==[small,numeric]


def test_uncertain_caption_cannot_remove_a_display_candidate():
    small=proposal((.1,.05,.2,.08))
    kept,_=_exclude_display_captions([small],{'spans':[span('SMC',score=.89)]})
    assert kept==[small]
