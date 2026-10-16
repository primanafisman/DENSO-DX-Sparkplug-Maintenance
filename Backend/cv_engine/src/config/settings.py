import os
from dataclasses import dataclass,field
from pathlib import Path

def model_directory():
    workspace=Path(__file__).resolve().parents[3]
    configured=os.environ.get('OCR_MODEL_DIR','').strip()
    if not configured:return workspace/'cv_engine'/'models'/'ocr'
    directory=Path(configured)
    return directory if directory.is_absolute() else workspace/directory

@dataclass(frozen=True)
class Settings:
    internal_token: str
    model_directory: Path=field(default_factory=model_directory)
    ttl_seconds: int=900
    max_jobs: int=5
    max_image_bytes: int=96*1024*1024
    def __post_init__(self):
        if len(self.internal_token)<32:raise ValueError('Internal service secret must have at least 32 characters.')
    @classmethod
    def from_env(cls):return cls(internal_token=os.environ.get('CV_INTERNAL_TOKEN',''))
