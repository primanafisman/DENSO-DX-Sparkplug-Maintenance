from typing import Annotated, Literal

from pydantic import Field, PrivateAttr, model_validator, field_validator

from .models import StrictModel


Coordinate = Annotated[float, Field(ge=0, le=1)]


class Quadrilateral(StrictModel):
    """Four corners TL, TR, BR, BL, relative to the selected instrument crop."""
    points: list[tuple[Coordinate, Coordinate]] = Field(min_length=4, max_length=4)

    @model_validator(mode='after')
    def convex(self):
        crosses = []
        for i in range(4):
            a, b, c = self.points[i], self.points[(i+1)%4], self.points[(i+2)%4]
            crosses.append((b[0]-a[0])*(c[1]-b[1]) - (b[1]-a[1])*(c[0]-b[0]))
        area = sum(self.points[i][0]*self.points[(i+1)%4][1] - self.points[(i+1)%4][0]*self.points[i][1] for i in range(4)) / 2
        if any(c <= 1e-5 for c in crosses) or area < .01:
            raise ValueError('Sudut harus membentuk bidang cembung TL, TR, BR, BL yang cukup luas; bukan garis/sudut silang.')
        return self


