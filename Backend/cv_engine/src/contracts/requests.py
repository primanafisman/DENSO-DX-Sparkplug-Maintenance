from typing import Any
from pydantic import Field,model_validator
from ..vision.models import StrictModel,ROI,Profile

class DiscoveryRequest(StrictModel):
    instruments:list[dict[str,Any]]=Field(default_factory=list,max_length=500)
    area:str=Field(default='',max_length=80)

class AnalysisItem(StrictModel):
    client_id:str=Field(min_length=1,max_length=64)
    roi:ROI
    label_roi:ROI|None=None
    instrument_id:str|None=Field(default=None,max_length=64)
    calibration_id:str|None=Field(default=None,max_length=64)
    calibration:dict[str,Any]|None=None
    profile:Profile

class JobRequest(DiscoveryRequest):
    image_id:str=Field(min_length=1,max_length=64)
    items:list[AnalysisItem]=Field(min_length=1,max_length=12)
    @model_validator(mode='after')
    def unique(self):
        if len({i.client_id for i in self.items})!=len(self.items):raise ValueError('Client IDs must be unique.')
        return self
