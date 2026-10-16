"""Independent, immutable calibration contracts for the classical CV reader."""
import math
from typing import Annotated

from pydantic import Field, model_validator

from .models import ROI, StrictModel

Coordinate = Annotated[float, Field(ge=0, le=1)]


class Point(StrictModel):
    x: Coordinate
    y: Coordinate


class ScalePoint(Point):
    value: float


class CalibrationInput(StrictModel):
    instrument_id: str = Field(min_length=1, max_length=100)
    image_id: str = Field(min_length=1, max_length=100)
    roi: ROI
    pivot: Point
    scale_points: list[ScalePoint] = Field(min_length=3, max_length=20)
    clockwise: bool = True
    gauge_model: str = Field(default='SMC 0-1 MPa', max_length=100)
    manufacturer: str = Field(default='SMC', max_length=100)
    resolution: float = Field(default=.01, gt=0, le=1)
    accuracy_specification: str | None = Field(default=None, max_length=160)

    @model_validator(mode='after')
    def ordered_scale(self):
        values=[p.value for p in self.scale_points]
        if any(b<=a for a,b in zip(values,values[1:])):
            raise ValueError('Titik skala harus berurutan dari nilai minimum ke maksimum tanpa duplikat.')
        radii=[math.hypot(p.x-self.pivot.x,p.y-self.pivot.y) for p in self.scale_points]
        if min(radii)<.05:
            raise ValueError('Pilih pivot sebenarnya dan garis skala pada radius yang sama. Template harus difoto tegak lurus.')
        sign=1 if self.clockwise else -1
        angles=[math.degrees(math.atan2(p.y-self.pivot.y,p.x-self.pivot.x))%360 for p in self.scale_points]
        steps=[(sign*(b-a))%360 for a,b in zip(angles,angles[1:])]
        if min(steps)<3 or max(steps)>175 or sum(steps)>350:
            raise ValueError('Urutan/direksi garis skala tidak konsisten atau titik terlalu berdekatan.')
        return self

    def validate_image_geometry(self,width,height):
        radii=[math.hypot((p.x-self.pivot.x)*width,(p.y-self.pivot.y)*height) for p in self.scale_points]
        if min(radii)<min(width,height)*.15 or max(radii)/min(radii)>1.35:
            raise ValueError('Pivot/garis skala tidak konsisten. Gunakan template tegak lurus dengan seluruh dial.')
