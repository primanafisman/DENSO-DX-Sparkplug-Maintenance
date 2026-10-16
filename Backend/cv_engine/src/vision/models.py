from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)


class ROI(StrictModel):
    x: float = Field(ge=0, lt=1)
    y: float = Field(ge=0, lt=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)

    @model_validator(mode='after')
    def bounds(self):
        if self.x + self.width > 1.000000001 or self.y + self.height > 1.000000001:
            raise ValueError('ROI harus berada di dalam gambar.')
        return self


class Profile(StrictModel):
    name: str = Field(default='Panel uji', max_length=100)
    kind: Literal['auto', 'digital', 'analog'] = 'auto'
    unit: str = Field(default='bar', max_length=20)
    minimum: float = 0
    maximum: float = 1000
    decimals: int = Field(default=2, ge=0, le=6)
    tolerance: float = Field(default=.2, gt=0)

    @model_validator(mode='after')
    def bounds(self):
        if self.maximum <= self.minimum:
            raise ValueError('Nilai maksimum harus lebih besar dari minimum.')
        return self


class Calibration(StrictModel):
    center_x: float = Field(default=.5, gt=0, lt=1)
    center_y: float = Field(default=.5, gt=0, lt=1)
    minimum_angle: float = Field(default=135, ge=0, lt=360)
    maximum_angle: float = Field(default=45, ge=0, lt=360)
    clockwise: bool = True

    @model_validator(mode='after')
    def arc(self):
        if (self.maximum_angle - self.minimum_angle) % 360 < 5:
            raise ValueError('Titik skala minimum dan maksimum harus berbeda.')
        return self


class Candidate(StrictModel):
    readable: bool
    kind: Literal['digital', 'analog', 'unknown']
    value: float | None = None
    unit: str = Field(default='', max_length=40)
    raw_text: str = Field(default='', max_length=300)
    reason: str = Field(default='', max_length=500)


class Confidence(StrictModel):
    valid: bool
    level: Literal['low', 'medium', 'high']
    probability_correct: float | None = None
    method: str = 'heuristic-v1; belum dikalibrasi pada foto lapangan'
    reasons: list[str]


