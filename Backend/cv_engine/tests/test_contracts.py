import pytest
from pydantic import ValidationError
def test_unique_items_and_no_cloud_contract():
    from src.contracts.requests import JobRequest
    item={'client_id':'a','roi':{'x':0,'y':0,'width':1,'height':1},'profile':{'kind':'digital','unit':'MPa','minimum':0,'maximum':1,'decimals':3,'tolerance':.01}}
    with pytest.raises(ValidationError):JobRequest(image_id='photo',items=[item,item])
    with pytest.raises(ValidationError):JobRequest(image_id='photo',items=[item],use_ai=True)
    with pytest.raises(ValidationError):JobRequest(image_id='photo',items=[{**item,'roi':{'x':.9,'y':0,'width':.2,'height':1}}])
