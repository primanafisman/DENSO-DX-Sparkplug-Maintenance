import math

import cv2
import numpy as np
from PIL import Image

from .images import encode_jpeg
from .v2_models import Quadrilateral


def propose_display_corners(data):
    """Correct only a dominant, nonblank, isolated rectangular display plane."""
    source=cv2.imdecode(np.frombuffer(data,dtype=np.uint8),cv2.IMREAD_COLOR)
    factor=min(1.,1000/max(source.shape[:2]))
    small=cv2.resize(source,None,fx=factor,fy=factor)
    gray=cv2.cvtColor(small,cv2.COLOR_BGR2GRAY); h,w=gray.shape
    contours,_=cv2.findContours(cv2.Canny(cv2.GaussianBlur(gray,(5,5),0),40,120),cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
    proposals=[]
    for contour in contours:
        area=cv2.contourArea(contour)
        if not .18*w*h<area<.94*w*h: continue
        polygon=cv2.approxPolyDP(contour,.02*cv2.arcLength(contour,True),True)
        if len(polygon)!=4 or not cv2.isContourConvex(polygon): continue
        pts=polygon[:,0,:].astype(float)
        # Ordering uses image coordinates; reject rotated diamonds/crossed proposals.
        ordered=np.array([pts[np.argmin(pts.sum(axis=1))],pts[np.argmin(pts[:,1]-pts[:,0])],
                          pts[np.argmax(pts.sum(axis=1))],pts[np.argmax(pts[:,1]-pts[:,0])]])
        rw=(np.linalg.norm(ordered[1]-ordered[0])+np.linalg.norm(ordered[2]-ordered[3]))/2
        rh=(np.linalg.norm(ordered[3]-ordered[0])+np.linalg.norm(ordered[2]-ordered[1]))/2
        if not 1.2<rw/max(rh,1)<8: continue
        mask=np.zeros((h,w),np.uint8); cv2.fillConvexPoly(mask,ordered.astype(np.int32),255)
        if float(gray[mask>0].std())<12: continue
        try: quad=Quadrilateral(points=(ordered/np.array([w,h])).tolist())
        except ValueError: continue
        proposals.append((area,quad))
    proposals.sort(key=lambda p:p[0],reverse=True)
    if not proposals: return None
    best=proposals[0][1]
    for _,other in proposals[1:]:
        if float(np.abs(np.array(best.points)-np.array(other.points)).mean())>.05:
            return None  # multiple distinct planes: do not pick a display by accident
    return best


def rectify_crop(data, corners):
    source = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    h, w = source.shape[:2]
    points = np.asarray(corners.points, dtype=np.float32) * np.array([w-1, h-1], dtype=np.float32)
    width = int(round(max(np.linalg.norm(points[1]-points[0]), np.linalg.norm(points[2]-points[3]))))
    height = int(round(max(np.linalg.norm(points[3]-points[0]), np.linalg.norm(points[2]-points[1]))))
    if min(width, height) < 32:
        raise ValueError('Bidang koreksi perspektif terlalu kecil.')
    target = np.array([[0,0],[width-1,0],[width-1,height-1],[0,height-1]], np.float32)
    transform = cv2.getPerspectiveTransform(points, target)
    output = cv2.warpPerspective(source, transform, (width,height), flags=cv2.INTER_CUBIC)
    return encode_jpeg(Image.fromarray(cv2.cvtColor(output, cv2.COLOR_BGR2RGB)))


def propose_rois(prepared):
    image = cv2.imdecode(np.frombuffer(prepared.jpeg, dtype=np.uint8), cv2.IMREAD_COLOR)
    ratio = min(1., 1024/max(image.shape[:2]))
    image = cv2.resize(image, None, fx=ratio, fy=ratio)
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray,(5,5),0), 40, 120)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if not .008*w*h < area < .8*w*h:
            continue
        perimeter = cv2.arcLength(contour, True)
        polygon = cv2.approxPolyDP(contour, .025*perimeter, True)
        x, y, rw, rh = cv2.boundingRect(contour)
        if rw < 50 or rh < 25:
            continue
        circularity = 4*math.pi*area / max(perimeter*perimeter,1)
        if circularity > .68 and .55 < rw/rh < 1.8:
            hint, priority, method = 'analog', circularity, 'dial-like contour; type requires operator review'
        elif len(polygon)==4 and cv2.isContourConvex(polygon) and .8 < rw/rh < 7:
            inside = gray[y:y+rh,x:x+rw]
            if float(inside.std()) < 10:
                continue
            hint, priority, method = 'digital', .65, 'rectangular display-like contour; may also be housing/label'
        else:
            continue
        pad = max(2, int(min(rw,rh)*.04))
        left, top, right, bottom = max(0,x-pad), max(0,y-pad), min(w,x+rw+pad), min(h,y+rh+pad)
        candidates.append((priority, area, {'roi': {'x':left/w,'y':top/h,'width':(right-left)/w,'height':(bottom-top)/h}, 'kind_hint':hint, 'confidence':'medium', 'requires_review':True, 'method':method}))
    candidates.sort(key=lambda c:(c[0],c[1]), reverse=True)
    accepted = []
    for _, _, candidate in candidates:
        rect = candidate['roi']
        duplicate = False
        for previous in accepted:
            a = previous['roi']
            intersection = max(0,min(a['x']+a['width'],rect['x']+rect['width'])-max(a['x'],rect['x'])) * max(0,min(a['y']+a['height'],rect['y']+rect['height'])-max(a['y'],rect['y']))
            union = a['width']*a['height'] + rect['width']*rect['height'] - intersection
            if intersection/max(union,1e-8) > .5:
                duplicate = True; break
        if not duplicate:
            accepted.append(candidate)
        if len(accepted) == 12:
            break
    return accepted
