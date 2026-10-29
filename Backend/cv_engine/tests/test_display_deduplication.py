"""A tiny dim patch sharing LED pixels is a duplicate, not another screen."""
import pytest

from src.vision import hybrid_display


def candidate(kind,box,dim=False):
    x,y,w,h=box
    return {'display_type':kind,'box':box,'low_contrast':dim,
            'quad':[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]}


def distinct(items):
    helper=getattr(hybrid_display,'distinct_display_candidates',None)
    assert callable(helper),'Display de-duplication must distinguish a nested dim patch from a separate numeric window'
    return helper(items)


def test_tiny_low_contrast_patch_partly_overlapping_led_is_one_display():
    led=candidate('green-led',(.04,.08,.92,.75))
    patch=candidate('lcd',(.08,.055,.23,.075),True)
    assert distinct([patch,led])==[led]


@pytest.mark.parametrize('box',[(.08,0,.23,.075),(.02,.88,.23,.075),(.79,.01,.2,.05)])
def test_separate_small_lcd_is_preserved_even_next_to_led(box):
    led=candidate('green-led',(.04,.08,.92,.75));small=candidate('lcd',box,True)
    assert len(distinct([led,small]))==2


def test_nested_high_contrast_numeric_window_keeps_multiple_display_guard():
    led=candidate('green-led',(.04,.08,.92,.75))
    numeric=candidate('lcd',(.08,.055,.23,.075))
    assert len(distinct([led,numeric]))==2


def test_two_lcd_windows_are_not_collapsed_by_led_specific_rule():
    main=candidate('lcd',(.04,.08,.92,.75));small=candidate('lcd',(.08,.055,.23,.075),True)
    assert len(distinct([main,small]))==2
