"""Restricted linear 0–1 MPa dial. Visible scale anchors, never a guessed centre."""
import math

import cv2
import numpy as np

TICKS = (0., .2, .4, .6, .8, 1.)


def black_mask(image):
    hsv=cv2.cvtColor(image,cv2.COLOR_BGR2HSV)
    # Glass/phone white balance can turn very dark black paint into saturated
    # blue. Retain that narrow dark-blue range; keep green excluded explicitly.
    green=(hsv[:,:,0]>=30)&(hsv[:,:,0]<=95)&(hsv[:,:,1]>50)
    blue_cast=(hsv[:,:,0]>95)&(hsv[:,:,0]<135)&(hsv[:,:,2]<100)
    return (((hsv[:,:,1]<160)|blue_cast)&(hsv[:,:,2]<115)&~green).astype(np.uint8)*255


def refine_ticks(image,basis,centre,values):
    """Use label identities to locate actual major strokes on the outer scale.

    Printed label centres vary with glyph width; they only guide the search.
    All >=4 labels must have a distinct thin outer tick, otherwise abstain.
    """
    h,w=image.shape[:2]; inverse=np.linalg.inv(basis)
    transform=np.column_stack((230*inverse@np.diag([1/w,1/h]),480-230*inverse@centre))
    dial=cv2.warpAffine(image,transform,(960,960),borderValue=(255,255,255))
    mask=black_mask(dial); points=[]
    radii=np.arange(270,365)
    for value in values:
        angles=np.arange(135+270*value-12,135+270*value+12,.15)
        radians=np.deg2rad(angles)
        xx=np.rint(480+np.cos(radians[:,None])*radii).astype(int)
        yy=np.rint(480+np.sin(radians[:,None])*radii).astype(int)
        hits=mask[yy,xx]>0; scores=hits.mean(axis=1)
        for i in np.flatnonzero(scores>=.30):
            radius=float(np.median(radii[hits[i]]))
            normal=np.array([-math.sin(radians[i]),math.cos(radians[i])])
            mid=np.array([480,480])+radius*np.array([math.cos(radians[i]),math.sin(radians[i])])
            locations=np.rint(mid+np.arange(-32,33)[:,None]*normal).astype(int)
            across=mask[locations[:,1],locations[:,0]]>0
            if not across[32]: scores[i]=0; continue
            left=right=32
            while left>0 and across[left-1]: left-=1
            while right<64 and across[right+1]: right+=1
            if not 12<=right-left+1<=32: scores[i]=0
        winner=int(scores.argmax())
        if scores[winner]<.30: return None
        near=(abs(angles-angles[winner])<2)&(scores>=scores[winner]*.95)
        angle=math.radians(float(np.average(angles[near],weights=scores[near])))
        radius=float(np.median(radii[hits[winner]]))
        point=centre+basis@(radius*np.array([math.cos(angle),math.sin(angle)])/230)
        points.append(point)
    return np.array(points)


def is_pressure(profile):
    return profile.unit.strip().casefold() == 'mpa' and profile.minimum == 0 and profile.maximum == 1 and profile.kind != 'digital'


def ocr_anchors(ocr):
    anchors = []
    for span in ocr.get('spans', []):
        try:
            value = float(span['text'].strip().replace(',', '.'))
            r = span['roi']
            if value in TICKS and span.get('ocr_score', 0) >= .85:
                anchors.append({'value': value, 'x': r['x']+r['width']/2, 'y': r['y']+r['height']/2})
        except (ValueError, KeyError, TypeError):
            continue
    return anchors


def interval_evidence(value, evidence):
    try:
        low, high, fraction = (float(evidence[k]) for k in ('lower', 'upper', 'fraction'))
        if not all(math.isfinite(v) for v in (low, high, fraction)):
            raise ValueError()
        expected = low+(high-low)*fraction
        valid = (low in TICKS[:-1] and high in TICKS[1:] and abs(high-low-.2)<1e-8
                 and 0<=fraction<=1 and value is not None and abs(value-expected)<=.003)
        return {'valid': valid, 'lower': low, 'upper': high, 'fraction': fraction, 'interpolated_value': round(expected, 3)}
    except (TypeError, KeyError, ValueError, OverflowError):
        return {'valid': False}


def read_pressure(data, anchors, source='local-ocr'):
    """Affine correction from >=4 scale labels, then a thin black radial stroke.

    Affine fits handle rotation and modest elliptical tilt. Severe perspective,
    duplicate ticks, a hidden needle or competing radial strokes must abstain.
    """
    if not isinstance(anchors, list) or not 4 <= len(anchors) <= 6:
        return None
    try:
        values = [float(p['value']) for p in anchors]
        positions = np.array([[float(p['x']), float(p['y'])] for p in anchors])
        if (len(set(values)) != len(values) or any(v not in TICKS for v in values)
                or max(values)-min(values)<.6 or not np.isfinite(positions).all()
                or np.any(positions<=0) or np.any(positions>=1)):
            return None
        angles = np.deg2rad(135+270*np.array(values))
        design = np.stack((np.cos(angles), np.sin(angles), np.ones(len(angles))), axis=1)
        fit = np.linalg.lstsq(design, positions, rcond=None)[0]
        basis = fit[:2].T
        scale = np.linalg.svd(basis, compute_uv=False)
        residual = float(np.linalg.norm(design@fit-positions, axis=1).max()/scale.min())
        if scale.min()<.10 or scale.max()/scale.min()>1.5 or residual>.18 or np.linalg.det(basis)<=0:
            return None
        image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            return None
        radius=230; scale_source='visible label centres'
        tick_points=refine_ticks(image,basis,fit[2],values)
        if tick_points is not None:
            fit=np.linalg.lstsq(design,tick_points,rcond=None)[0]
            basis=fit[:2].T; scale=np.linalg.svd(basis,compute_uv=False)
            residual=float(np.linalg.norm(design@fit-tick_points,axis=1).max()/scale.min())
            radius=300; scale_source='visible major tick strokes'
        if residual>.06 or scale.max()/scale.min()>1.5 or np.linalg.det(basis)<=0:
            return None
        # Canonical label circle has radius 230px, at (320,320).
        h, w = image.shape[:2]
        inverse = np.linalg.inv(basis)
        transform = np.column_stack((radius*inverse@np.diag([1/w, 1/h]), 320-radius*inverse@fit[2]))
        dial = cv2.warpAffine(image, transform, (640, 640), borderValue=(255,255,255))
        mask = black_mask(dial)
        angles = np.arange(0, 360, .15)
        radians = np.deg2rad(angles)
        radii = np.linspace(radius*.30, radius*.92, 95)
        xx = np.rint(320+np.cos(radians[:,None])*radii).astype(int)
        yy = np.rint(320+np.sin(radians[:,None])*radii).astype(int)
        scores = (mask[yy,xx]>0).mean(axis=1)
        long_strokes=scores.copy()
        # Ignore wide counterweights and printed blocks. Narrow stroke required
        # at several distances; coloured rim annotations cannot qualify.
        for i in np.flatnonzero(scores>=.65):
            normal = np.array([-math.sin(radians[i]), math.cos(radians[i])])
            for r,limit in ((.35,.12),(.50,.10),(.68,.08),(.82,.05)):
                centre = np.array([320,320])+r*radius*np.array([math.cos(radians[i]),math.sin(radians[i])])
                offsets = np.arange(-26,27)
                locations = np.rint(centre+offsets[:,None]*normal).astype(int)
                hits = mask[locations[:,1],locations[:,0]]>0
                if not hits[26]:
                    scores[i]=0; break
                left=right=26
                while left>0 and hits[left-1]: left-=1
                while right<52 and hits[right+1]: right+=1
                if right-left+1>radius*limit:
                    scores[i]=0; break
        winner = int(scores.argmax())
        angle = angles[winner]
        if scores[winner]<.65:
            return None
        distance = abs((angles-angle+180)%360-180)
        # .01 MPa spans 2.7 degrees. A second qualifying ray beyond that
        # allowance is ambiguous even when it is close to the main needle.
        if (np.any((distance>2.7)&(scores>=max(.65,scores[winner]*.85)))
                or np.any((distance>2.7)&(long_strokes>=max(.85,scores[winner]*.85)))):
            return None
        close = (distance<3)&(scores>=scores[winner]*.95)
        # Weighted direction removes Hough endpoint/pixel bias.
        angle = math.degrees(math.atan2(np.sum(np.sin(radians[close])*scores[close]), np.sum(np.cos(radians[close])*scores[close])))%360
        offset = (angle-135)%360
        # A <=.003 edge uncertainty may be snapped ONLY at an observed endpoint.
        if offset>270:
            if offset>359.19 and 0 in values: offset=0
            elif offset<270.81 and 1 in values: offset=270
            else: return None
        value = offset/270
        lower = min(.8, math.floor(value*5+1e-8)/5)
        return {'value': round(value,3), 'angle': round(angle,2), 'distinct': True,
                'minimum':0, 'maximum':1, 'display_decimals':3, 'resolution':.01,
                'interval': [lower, round(lower+.2,1)], 'anchor_source':source,
                'scale_fit_error':round(residual,4), 'scale_points':anchors,
                'scale_source':scale_source,
                'colour_rule':'black needle including dark blue cast; green excluded',
                'method':'visible scale affine fit + thin black radial stroke; linear 0–1 MPa'}
    except (ValueError, KeyError, TypeError, np.linalg.LinAlgError, ZeroDivisionError):
        return None
