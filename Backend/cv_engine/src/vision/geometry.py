import math

import cv2
import numpy as np

from .images import gray_image
from .models import Calibration, Profile


def thin_black_stroke(mask,near,far,radius):
    """Measure perpendicular runs away from the hub, never verify a thick stub."""
    start,end=np.array(near),np.array(far)
    direction=(end-start)/np.linalg.norm(end-start)
    normal=np.array([-direction[1],direction[0]])
    span=max(6,int(radius*.12))
    widths=[]
    for fraction in (.45,.60,.75):
        point=start+fraction*(end-start)
        offsets=np.arange(-span,span+1)
        locations=np.rint(point[None,:]+offsets[:,None]*normal).astype(int)
        valid=(locations[:,0]>=0)&(locations[:,0]<mask.shape[1])&(locations[:,1]>=0)&(locations[:,1]<mask.shape[0])
        values=np.zeros(len(offsets),bool)
        values[valid]=mask[locations[valid,1],locations[valid,0]]>0
        hits=np.flatnonzero(values)
        if not len(hits): return False
        middle=int(hits[np.argmin(abs(hits-span))])
        if abs(middle-span)>max(3,radius*.02): return False
        left=right=middle
        while left>0 and values[left-1]: left-=1
        while right<len(values)-1 and values[right+1]: right+=1
        widths.append(right-left+1)
    return max(widths)<=max(4,radius*.06)


def read_needle(data: bytes, profile: Profile, calibration: Calibration) -> dict | None:
    """Independent geometric check for a dark, single needle on a light dial."""
    gray = gray_image(data)
    height, width = gray.shape
    cx, cy = calibration.center_x * width, calibration.center_y * height
    radius = min(cx, cy, width - cx, height - cy)
    colour=cv2.imdecode(np.frombuffer(data,dtype=np.uint8),cv2.IMREAD_COLOR)
    hsv=cv2.cvtColor(colour,cv2.COLOR_BGR2HSV)
    black=((hsv[:,:,1]<65)&(hsv[:,:,2]<110)).astype(np.uint8)*255
    edges = cv2.Canny(black, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, math.pi / 720, threshold=25, minLineLength=int(radius * .35), maxLineGap=10)
    if lines is None:
        return None
    candidates = []
    for x1, y1, x2, y2 in lines[:, 0]:
        endpoints = [(float(x1), float(y1)), (float(x2), float(y2))]
        endpoints.sort(key=lambda point: math.hypot(point[0] - cx, point[1] - cy))
        near, far = endpoints
        distance_near = math.hypot(near[0] - cx, near[1] - cy)
        distance_far = math.hypot(far[0] - cx, far[1] - cy)
        if distance_near > radius * .18 or not radius * .55 < distance_far < radius * .92:
            continue
        if not thin_black_stroke(black,near,far,radius):
            continue
        angle = math.degrees(math.atan2(far[1] - cy, far[0] - cx)) % 360
        candidates.append((distance_far - distance_near, angle))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    score, angle = candidates[0]
    for other_score, other_angle in candidates[1:]:
        separation = abs((other_angle - angle + 180) % 360 - 180)
        if other_score > score * .8 and separation > 15:
            return None  # multiple needles/counterweight/printed line ambiguity
    direction = 1 if calibration.clockwise else -1
    span = (direction * (calibration.maximum_angle - calibration.minimum_angle)) % 360
    offset = (direction * (angle - calibration.minimum_angle)) % 360
    if offset > span:
        return None
    value = profile.minimum + offset / span * (profile.maximum - profile.minimum)
    return {'value': round(value, 6), 'angle': round(angle, 2), 'distinct': True, 'colour_rule':'black low-saturation needle', 'method': 'calibrated OpenCV black needle geometry; linear circular scale only'}
