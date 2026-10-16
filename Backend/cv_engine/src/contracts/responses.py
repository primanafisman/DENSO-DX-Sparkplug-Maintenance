from typing import Literal
from pydantic import BaseModel
class PhotoMetadata(BaseModel):
    image_id:str
    source_hash:str
    source_width:int
    source_height:int
    preview_width:int
    preview_height:int
    expires_at:float
class EngineJob(BaseModel):
    job_id:str
    status:Literal['queued','running','completed','failed','expired']
    processed:int
    total:int
    results:list[dict]
    expires_at:float
