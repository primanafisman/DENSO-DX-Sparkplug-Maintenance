"""Per-photo geometry for the configured clockwise 0â€“1 MPa gauge family.

No reference values or cloud model are used. Six major strokes and their open
scale gap establish orientation; a radial needle trace is corroborated by a line
fit. Affine dial rectification does not remove mechanical needle parallax.
"""
import math
import re
from itertools import combinations

import cv2
import numpy as np

from .hybrid_analog import _decode, interpolate_angle
from .hybrid_geometry import red_bezel_arcs

VERSION = 'hybrid-per-photo-needle-v0.2'


def _illumination(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    background = cv2.GaussianBlur(gray, (0, 0), max(image.shape[:2]) / 12)
    normalized = np.clip(gray.astype(float) * 235 / np.maximum(background, 35), 0, 255).astype(np.uint8)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    # Preserve colour information: a grayscale conversion alone admits green
    # set-pointers and coloured rim annotations as measurement needles.
    green = (hsv[:, :, 0] >= 32) & (hsv[:, :, 0] <= 95) & (hsv[:, :, 1] > 65)
    colourful = (hsv[:, :, 1] > 110) & (hsv[:, :, 2] > 100)
    allowed = ~(green | colourful)
    mask = ((normalized < 168) & allowed).astype(np.uint8) * 255
    return gray, normalized, mask


def _dial_ellipse(image):
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 22, 80)
    hsv=cv2.cvtColor(image,cv2.COLOR_BGR2HSV)
    coloured=((hsv[:,:,1]>65)&(hsv[:,:,2]>80)).astype(np.uint8)*255
    coloured=cv2.morphologyEx(coloured,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
    colour_contours,_=cv2.findContours(coloured,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    colour_contours=[c for c in colour_contours if cv2.contourArea(c)>h*w*.20]
    # Chroma preserves a painted circular bezel when focus loss makes its
    # luminance edge weak. The hub and small colour marks cannot qualify.
    cv2.drawContours(edges,colour_contours,-1,255,1)
    ey, ex = np.where(edges > 0)
    edge_points = np.column_stack([ex, ey])
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    # Short arbitrary edge fragments must retain the original length gate.
    # The shorter resampled bezel arcs have already passed an outer-arc fit.
    legacy=[c for c in list(contours)+colour_contours if len(c)>=100]
    contours=[(False,c) for c in legacy]+[(True,c) for c in red_bezel_arcs(image)]
    proposals = []
    for recovery,contour in contours:
        if len(contour) < 45:
            continue
        centre, axes, angle = cv2.fitEllipse(contour)
        a, b = np.asarray(axes) / 2
        if not (.29 * min(h, w) < min(a, b) < .54 * max(h, w) and max(a, b) / min(a, b) < 1.6):
            continue
        if np.linalg.norm(np.array(centre) - [w / 2, h / 2]) > .2 * min(h, w):
            continue
        theta = math.radians(angle)
        rotation = np.array([[math.cos(theta), -math.sin(theta)], [math.sin(theta), math.cos(theta)]])
        points = (contour[:, 0].astype(float) - centre) @ rotation
        elliptical = points / [a, b]
        residual = np.abs(np.linalg.norm(elliptical, axis=1) - 1)
        directions = np.arctan2(elliptical[:, 1], elliptical[:, 0])
        bins = np.unique(((directions + math.pi) / (2 * math.pi) * 36).astype(int))
        if np.median(residual) > .025 or len(bins) < 10:
            continue
        # Reflections break a circumference into disconnected arcs. Validate
        # the fitted ellipse against all nearby edges, not one contour alone.
        all_points = (edge_points - centre) @ rotation / [a, b]
        ring = all_points[np.abs(np.linalg.norm(all_points, axis=1) - 1) < .018]
        coverage = len(np.unique(((np.arctan2(ring[:, 1], ring[:, 0]) + math.pi) / (2 * math.pi) * 36).astype(int)))
        if coverage < 24:
            continue
        score=coverage / 36 - float(np.median(residual)) + min(a, b) / min(h, w)
        proposals.append(((-int(recovery),score), centre, a, b, rotation))
    # Compare circular and elliptical fits: broken partial arcs can otherwise
    # masquerade as a badly tilted ellipse, even for a nearly round dial.
    circles = cv2.HoughCircles(cv2.GaussianBlur(gray, (7, 7), 1.5), cv2.HOUGH_GRADIENT,
                              1.2, min(h, w) * .2, param1=80, param2=38,
                              minRadius=int(min(h, w) * .3), maxRadius=int(min(h, w) * .52))
    for x, y, radius in ([] if circles is None else circles[0]):
        if np.linalg.norm(np.array([x, y]) - [w / 2, h / 2]) > .15 * min(h, w):
            continue
        near = edge_points - [x, y]
        ring = near[np.abs(np.linalg.norm(near, axis=1) - radius) < radius * .02]
        coverage = len(np.unique(((np.arctan2(ring[:, 1], ring[:, 0]) + math.pi) / (2 * math.pi) * 36).astype(int)))
        if coverage >= 25:
            proposals.append(((0,coverage / 36 - .015 + float(radius) / min(h,w)), [float(x), float(y)], float(radius), float(radius), np.eye(2)))
    if not proposals:
        return None
    _, centre, a, b, rotation = max(proposals, key=lambda p: p[0])
    radius = (a + b) / 2
    linear = rotation @ np.diag([radius / a, radius / b]) @ rotation.T
    matrix = np.eye(3)
    matrix[:2, :2] = linear
    matrix[:2, 2] = np.asarray(centre) - linear @ np.asarray(centre)
    return matrix, np.asarray(centre), radius, max(a, b) / min(a, b)


def _polar(mask, pivot, radius, low, high, count=90, step=.25):
    angles = np.arange(0, 360, step)
    radians = np.deg2rad(angles)
    distances = np.linspace(radius * low, radius * high, count)
    locations = pivot + np.stack([np.cos(radians), np.sin(radians)], axis=1)[:, None, :] * distances[None, :, None]
    locations = np.rint(locations).astype(int)
    h, w = mask.shape
    valid = (locations[:, :, 0] >= 0) & (locations[:, :, 0] < w) & (locations[:, :, 1] >= 0) & (locations[:, :, 1] < h)
    locations[:, :, 0] = np.clip(locations[:, :, 0], 0, w - 1)
    locations[:, :, 1] = np.clip(locations[:, :, 1], 0, h - 1)
    return angles, (mask[locations[:, :, 1], locations[:, :, 0]] > 0) & valid, distances


def _pivot(mask, centre, radius):
    # Fit the outside of the black hub, rather than the painted centre. Radial
    # needle/tail attachments are robust outliers in the circular hub boundary.
    angles, hits, distances = _polar(mask, centre, radius, .08, .31, 90, 2.)
    boundary = []
    for angle, ray in zip(angles, hits):
        transitions = np.flatnonzero(ray[:-5] & ~ray[1:-4] & ~ray[2:-3] & ~ray[3:-2] & ~ray[4:-1] & ~ray[5:])
        transitions = transitions[(distances[transitions] > radius * .10) & (distances[transitions] < radius * .29)]
        if len(transitions):
            r = distances[transitions[-1]]
            boundary.append(centre + r * np.array([math.cos(math.radians(angle)), math.sin(math.radians(angle))]))
    if len(boundary) < 45:
        return centre, {'method': 'housing centre; hub boundary incomplete', 'support': len(boundary)}
    points = np.asarray(boundary)
    rng = np.random.default_rng(7)
    best = None
    for _ in range(240):
        triple = points[rng.choice(len(points), 3, replace=False)]
        matrix = 2 * (triple[1:] - triple[0])
        if abs(np.linalg.det(matrix)) < 1:
            continue
        candidate = np.linalg.solve(matrix, (triple[1:] ** 2 - triple[0] ** 2).sum(axis=1))
        r = np.linalg.norm(candidate - triple[0])
        if np.linalg.norm(candidate - centre) > radius * .11 or not radius * .10 < r < radius * .29:
            continue
        keep = np.abs(np.linalg.norm(points - candidate, axis=1) - r) < radius * .014
        if best is None or keep.sum() > best[0]:
            best = (int(keep.sum()), keep, candidate, r)
    if best is None or best[0] < 40:
        return centre, {'method': 'housing centre; no stable hub fit', 'support': 0}
    p = points[best[1]]
    fit, _, _, _ = np.linalg.lstsq(np.column_stack([2 * p, np.ones(len(p))]), (p ** 2).sum(axis=1), rcond=None)
    return fit[:2], {'method': 'robust outside black hub', 'support': best[0]}


def _runs(values):
    # Circular contiguous runs, including strokes crossing angle zero.
    if not np.any(values) or np.all(values):
        return []
    start = int(np.flatnonzero(~values)[0])
    ordered = np.roll(values, -start)
    edges = np.diff(np.r_[False, ordered, False].astype(int))
    return [(np.arange(a, b) + start) % len(values) for a, b in zip(np.flatnonzero(edges == 1), np.flatnonzero(edges == -1))]


def select_six_ticks(ticks):
    """Recover six observed majors amidst paint/text outliers, never invent one."""
    pool = [t for t in ticks if t['strength'] >= .25 and t['width'] >= .75]
    pool = sorted(pool, key=lambda t: t['strength'] * t['width'], reverse=True)[:16]
    pool.sort(key=lambda t: t['angle'])
    choices=[]
    for chosen in combinations(pool, 6):
        gaps=np.diff([t['angle'] for t in chosen]+[chosen[0]['angle']+360])
        gap_index=int(gaps.argmax())
        ordered=list(chosen[gap_index+1:])+list(chosen[:gap_index+1])
        angles=np.unwrap(np.deg2rad([t['angle'] for t in ordered]))*180/math.pi
        intervals=np.diff(angles)
        if not (35<np.median(intervals)<61 and intervals.max()/intervals.min()<1.30
                and gaps[gap_index]>intervals.max()*1.35): continue
        # Real intervening thinner strokes must support each interval. This
        # rejects a fully repeating ring and arbitrary text-derived maxima.
        median_major=float(np.median([t['width'] for t in chosen]))
        # Do not manufacture an open scale by dropping the seventh/eighth
        # major from a complete circular ring. The gap must be observed too.
        gap_start=ordered[-1]['angle']; gap_size=float(gaps[gap_index])
        median_strength=float(np.median([t['strength'] for t in chosen]))
        if any(3<((t['angle']-gap_start)%360)<gap_size-3
               and t['width']>=median_major*.7 and t['strength']>=median_strength*.6
               for t in ticks if t not in chosen): continue
        minor=[]; supported_intervals=0
        for a,b in zip(angles,angles[1:]):
            inside=[t for t in ticks if 5<((t['angle']-a)%360)<b-a-5 and t['width']<median_major*.75]
            if inside: supported_intervals+=1
            minor.extend(inside)
        if supported_intervals>=2 and sum(t['strength']>=.35 for t in chosen)>=4:
            cost=float(np.std(intervals)/np.mean(intervals))+sum(max(0,t['long_trace']-.45) for t in ordered)
            choices.append((cost,ordered,float(360-gaps[gap_index])))
    if not choices:return None,{}
    _,ordered,sweep=min(choices,key=lambda c:c[0])
    return ordered,{'method':'six observed major strokes + intervening thin strokes; outlier-resistant subset',
                    'sweep_degrees':round(sweep,2),'ticks':ticks}


def _major_scale(mask, pivot, radius, low=.78, high=.94, *, allow_subsets=True):
    # Locate tick *ends*, beyond the printed labels and normal needle tip.
    # The old inner annulus could mistake a gray needle itself for a main tick.
    angles, hits, distances = _polar(mask, pivot, radius, low, high, 65)
    # Main strokes extend further inward than thin subdivisions. Their inner
    # edge is detected independently of the needle trace below.
    support = hits.mean(axis=1)
    _, inner_hits, _ = _polar(mask,pivot,radius,.31,.60,70)
    runs = _runs(support > .20)
    ticks = []
    for run in runs:
        width = len(run) * .25
        if not .35 <= width <= 5.5:
            continue
        weights = support[run]
        angle = math.degrees(math.atan2(float((np.sin(np.deg2rad(angles[run])) * weights).sum()), float((np.cos(np.deg2rad(angles[run])) * weights).sum()))) % 360
        inner = np.mean(hits[run, :30])
        ticks.append({'angle': angle, 'width': width, 'inner_support': float(inner), 'strength': float(weights.max()),'long_trace':float(np.mean(inner_hits[run]))})
    if len(ticks) < 6:
        return None, {'reason': 'Enam garis skala utama belum terlihat; rapatkan crop dial.', 'tick_count': len(ticks)}
    # Width separation is measured in this photo. Do not select arbitrary six
    # maxima from a fully repeating ring of identical strokes.
    possibilities = []
    for pool in (ticks,[t for t in ticks if t['long_trace']<=.58]):
        for threshold in sorted({t['width'] for t in pool}):
            chosen = [t for t in pool if t['width'] >= threshold]
            if len(chosen) not in (6, 11):
                continue
            smaller = [t['width'] for t in pool if t not in chosen]
            separation = min(t['width'] for t in chosen) / max(smaller) if smaller else 1.5
            if separation < 1.28:
                continue
            chosen.sort(key=lambda t: t['angle'])
            gaps = np.diff([t['angle'] for t in chosen] + [chosen[0]['angle'] + 360])
            gap_index = int(gaps.argmax())
            ordered = chosen[gap_index + 1:] + chosen[:gap_index + 1]
            if len(chosen) == 11:
                ordered = ordered[::2]  # observed half-major strokes, not hidden ticks
            ordered_angles = np.unwrap(np.deg2rad([t['angle'] for t in ordered])) * 180 / math.pi
            intervals = np.diff(ordered_angles)
            if not (35 < np.median(intervals) < 61 and intervals.max() / intervals.min() < 1.30 and gaps[gap_index] > intervals.max() * 1.35):
                continue
            possibilities.append((separation, ordered, float(360 - gaps[gap_index])))
        if possibilities: break
    if not possibilities:
        selected, selected_info = select_six_ticks(ticks) if allow_subsets else (None,{})
        if selected is not None:
            return selected, {**selected_info, 'annulus':[low,high]}
        return None, {'reason': 'Garis utama belum terpisah dari garis kecil secara konsisten.', 'ticks': ticks}
    _, ordered, sweep = max(possibilities, key=lambda p: p[0])
    return ordered, {'method': 'six thick major strokes + unique open gap', 'sweep_degrees': round(sweep, 2), 'ticks': ticks,'annulus':[low,high]}


def detect_scale(mask,relaxed,pivot,radius):
    choices=[];info={}
    for variant in (mask,relaxed):
        for low,high in ((.78,.94),(.65,.92)):
            major,info=_major_scale(variant,pivot,radius,low,high)
            if major:
                angles=np.unwrap(np.deg2rad([t['angle'] for t in major]))
                intervals=np.diff(angles)
                # Prefer observed outer tick ends over an inner candidate on
                # the moving needle. This score uses image evidence only.
                cost=sum(max(0,t['long_trace']-.45) for t in major)*4+float(np.std(intervals)/np.mean(intervals))
                # A complete width-separated set outranks recovery subsets.
                # Otherwise a clean-looking text subset can rotate the open
                # gap away from its true location when one major is faded.
                recovery=info['method'].startswith('six observed major')
                choices.append(((int(recovery),cost),major,info))
    if not choices:
        # Some housings extend well beyond the printed scale. Search inward
        # only after the established outer bands abstain. Printed text and a
        # moving needle occupy this region too, so an arbitrary six-stroke
        # subset is insufficient: complete width-separated sets must agree
        # across two adjacent radial bands, with no competing complete set.
        bands=((.55,.72),(.58,.75),(.61,.78),(.63,.78))
        inward=[]
        for index,(low,high) in enumerate(bands):
            for variant in (mask,relaxed):
                major,details=_major_scale(variant,pivot,radius,low,high,allow_subsets=False)
                if major and not any(t['long_trace']>.58 for t in major):
                    inward.append((index,major,details))
        if not inward:return None,info
        reference=np.array([t['angle'] for t in inward[0][1]])
        disagreement=[float(np.max(np.abs((np.array([t['angle'] for t in major])-reference+180)%360-180)))
                      for _,major,_ in inward]
        if max(disagreement)>3:return None,info
        observed={index for index,_,_ in inward}
        if not any(index+1 in observed for index in observed):return None,info
        _,major,details=inward[0]
        details['inward_recovery']={'method':'complete width-separated strokes agree in adjacent radial bands',
                                   'corroborating_annuli':[list(bands[index]) for index in sorted(observed)],
                                   'maximum_angle_disagreement':round(max(disagreement),3)}
        return major,details
    _,major,info=min(choices,key=lambda p:p[0])
    return major,info


def _needle(mask, pivot, radius, scale):
    angles, hits, _ = _polar(mask, pivot, radius, .31, .73, 120, .15)
    scores = hits.mean(axis=1)
    # A digit can have many black samples separated by holes. A shaft has a
    # long continuous run; retain a limited gap allowance in Hough separately.
    for index in np.flatnonzero(scores >= .58):
        edges = np.diff(np.r_[False, hits[index], False].astype(int))
        lengths = np.flatnonzero(edges == -1) - np.flatnonzero(edges == 1)
        if lengths.max(initial=0) < hits.shape[1] * .45:
            scores[index] = 0
    # A long narrow trace must survive three cross-section checks, excluding
    # the short thick counterweight and printed text in the dial centre.
    radians = np.deg2rad(angles)
    for index in np.flatnonzero(scores >= .58):
        direction = np.array([math.cos(radians[index]), math.sin(radians[index])])
        normal = np.array([-direction[1], direction[0]])
        narrow_sections = 0
        for fraction in (.36, .49, .64):
            offsets = np.arange(-int(radius * .10), int(radius * .10) + 1)
            points = np.rint(pivot + radius * fraction * direction + offsets[:, None] * normal).astype(int)
            points[:, 0] = np.clip(points[:, 0], 0, mask.shape[1] - 1)
            points[:, 1] = np.clip(points[:, 1], 0, mask.shape[0] - 1)
            line = mask[points[:, 1], points[:, 0]] > 0
            mid = len(offsets) // 2
            if not line[mid]:
                continue
            left = right = mid
            while left > 0 and line[left - 1]: left -= 1
            while right < len(line) - 1 and line[right + 1]: right += 1
            if right - left + 1 <= radius * .115:
                narrow_sections += 1
        # One printed label may cross a visible needle. Two separate narrow
        # sections plus the line fit still must corroborate its direction.
        if narrow_sections < 2:
            scores[index] = 0
    if scores.max() < .58:
        return None, {'reason': 'Jejak jarum belum cukup jelas setelah normalisasi cahaya.'}
    # Printed 0.2 / 0.8 glyphs can produce long radial runs. Corroborate each
    # contiguous candidate with an actual shaft line before judging ambiguity.
    inner = np.zeros_like(mask)
    cv2.circle(inner, tuple(np.rint(pivot).astype(int)), int(radius * .76), 255, -1)
    lines = cv2.HoughLinesP(mask & inner, 1, np.pi / 720, threshold=25,
                          minLineLength=radius * .25, maxLineGap=radius * .07)
    line_evidence = []
    for line in ([] if lines is None else lines[:, 0]):
        a, b = np.asarray(line[:2], float), np.asarray(line[2:], float)
        delta = b - a
        length = np.linalg.norm(delta)
        offset = abs(float(delta[0] * (pivot[1] - a[1]) - delta[1] * (pivot[0] - a[0]))) / length
        far = a if np.linalg.norm(a - pivot) > np.linalg.norm(b - pivot) else b
        # Reflected/painted hubs can interrupt the innermost visible shaft.
        # The independent continuous radial trace already excludes short text;
        # its supporting Hough edge need not touch the obscured hub itself.
        if offset < radius * .06 and np.linalg.norm(far - pivot) > radius * .55:
            line_evidence.append(math.degrees(math.atan2(*(far - pivot)[::-1])) % 360)
    candidates = []
    for band in _runs(scores >= .58):
        if len(band) < 2 or len(band) * .15 > 16:
            continue
        peak = float(scores[band].max())
        near = band[scores[band] >= peak * .92]
        angle = math.degrees(math.atan2(float((np.sin(radians[near]) * scores[near]).sum()),
                                       float((np.cos(radians[near]) * scores[near]).sum()))) % 360
        evidence = [a for a in line_evidence if abs((a - angle + 180) % 360 - 180) < 4]
        # A long counterweight can be as dark as the tip. It does not indicate
        # pressure in the observed open gap between the scale endpoints.
        if evidence and interpolate_angle(angle,scale) is not None:
            candidates.append((peak, angle, evidence))
    if not candidates:
        return None, {'reason': 'Fit garis belum mendukung jejak radial jarum.'}
    candidates.sort(reverse=True)
    support, angle, evidence = candidates[0]
    if any(abs((other - angle + 180) % 360 - 180) > 4
           for strength, other, _ in candidates[1:]):
        return None, {'reason': 'Dua arah jarum hitam masih ambigu; periksa foto/overlay.'}
    value = interpolate_angle(angle, scale)
    if value is None:
        return None, {'reason': 'Arah jarum berada di luar skala terdeteksi.'}
    return value, {'radial_support': round(support, 3), 'line_angles': evidence[:5]}


def _scale_direction(ocr, major, pivot, radius, transform, width, height, declared):
    anchors=[]
    for span in (ocr or {}).get('spans',[]):
        text=span.get('text','').strip().replace(',','.')
        if not re.fullmatch(r'(?:0(?:\.[02468])?|1(?:\.0)?)',text) or span.get('ocr_score',0)<.55:
            continue
        value=float(text);roi=span.get('roi',{})
        if not all(k in roi for k in ('x','y','width','height')): continue
        point=np.array([(roi['x']+roi['width']/2)*width,(roi['y']+roi['height']/2)*height])
        point=cv2.perspectiveTransform(np.asarray([[point]],np.float32),transform)[0,0]
        distance=np.linalg.norm(point-pivot)
        if not radius*.38<distance<radius*.85: continue
        angle=math.degrees(math.atan2(*(point-pivot)[::-1]))%360
        anchors.append((int(round(value*5)),angle))
    scores=[]
    for clockwise in (True,False):
        order=major if clockwise else major[::-1]
        matches=[(index,angle) for index,angle in anchors if abs((angle-order[index]['angle']+180)%360-180)<16]
        spread=max([index for index,_ in matches],default=0)-min([index for index,_ in matches],default=0)
        scores.append((len({i for i,_ in matches}),spread,clockwise))
    scores.sort(reverse=True)
    confirmed=scores[0][0]>=2 and scores[0][1]>=1 and scores[0][0]>scores[1][0]
    direction=scores[0][2] if confirmed else declared if declared is not None else True
    conflict=confirmed and declared is not None and direction!=declared
    return direction, {'confirmed':confirmed or declared is not None,'source':'numeric OCR scale anchors' if confirmed else 'saved per-instrument calibration' if declared is not None else 'clockwise family assumption; operator must verify',
                       'anchor_count':len(anchors),'conflict':conflict}


def read_auto_analog(data, ocr_output=None, *, clockwise=None):
    failure = {'value': None, 'uncertainty': None, 'method': VERSION, 'overlay': {}, 'reason': '', 'preprocessing': {'applied': False}}
    query = _decode(data)
    dial = _dial_ellipse(query)
    if dial is None:
        return {**failure, 'reason': 'Batas dial belum dapat dipisahkan; pilih crop seluruh gauge.'}
    transform, centre, radius, ratio = dial
    h, w = query.shape[:2]
    image = cv2.warpPerspective(query, transform, (w, h), borderValue=(235, 235, 235))
    _, normalized, mask = _illumination(image)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    excluded = ((hsv[:, :, 0] >= 32) & (hsv[:, :, 0] <= 95) & (hsv[:, :, 1] > 65)) | ((hsv[:, :, 1] > 110) & (hsv[:, :, 2] > 100))
    relaxed = ((normalized < 190) & ~excluded).astype(np.uint8) * 255
    pivot, pivot_info = _pivot(mask, centre, radius)
    if pivot_info['support']<60:
        alternate, alternate_info=_pivot(relaxed,centre,radius)
        if alternate_info['support']>pivot_info['support']:
            pivot,pivot_info=alternate,alternate_info
    major, scale_info = detect_scale(mask,relaxed,pivot,radius)
    preprocessing = {'applied': True, 'steps': ['ellipse dial-plane rectification', 'local illumination normalization', 'colour exclusion'], 'ellipse_axis_ratio': round(ratio, 3)}
    failure.update(preprocessing=preprocessing, scale_detection=scale_info, pivot_detection=pivot_info)
    if major is None:
        return {**failure, 'reason': scale_info['reason']}
    direction,direction_info=_scale_direction(ocr_output,major,pivot,radius,transform,w,h,clockwise)
    failure['scale_direction']=direction_info
    scale_contaminated=any(t['long_trace']>.58 for t in major)
    failure['scale_detection']['needle_contamination']=scale_contaminated
    if direction_info['conflict']:
        return {**failure,'reason':'Urutan angka skala bertentangan dengan arah kalibrasi alat; periksa foto/identitas.'}
    if not direction: major=major[::-1]
    # Known family supplied by operator: clockwise six marks 0,.2,.4,.6,.8,1.
    # Inferred calibration is evidence, never a human training annotation.
    scale = {'pivot': {'x': float(pivot[0]), 'y': float(pivot[1])}, 'clockwise': direction,
             'scale_points': [{'x': float(pivot[0] + radius * .83 * math.cos(math.radians(t['angle']))), 'y': float(pivot[1] + radius * .83 * math.sin(math.radians(t['angle']))), 'value': i / 5} for i, t in enumerate(major)]}
    inverse = np.linalg.inv(transform)
    def mapped(p):
        point = cv2.perspectiveTransform(np.asarray([[p]], np.float32), inverse)[0, 0]
        return {'x': float(point[0] / w), 'y': float(point[1] / h)}
    overlay = {'pivot': mapped(pivot), 'scale_points': [{**mapped([p['x'], p['y']]), 'value': p['value']} for p in scale['scale_points']]}
    failure['overlay'] = overlay
    # Two contrast masks must yield compatible directions when both succeed.
    # This recovers a grey needle without changing the scale/stroke mask.
    variants = []
    ambiguous=False
    for threshold in (168, 190):
        variant = ((normalized < threshold) & ~excluded).astype(np.uint8) * 255
        value, needle_info = _needle(variant, pivot, radius, scale)
        if value is not None:
            variants.append((value, needle_info))
        elif 'ambigu' in needle_info['reason']:
            ambiguous=True
    if len(variants) == 2 and abs(variants[0][0]['value'] - variants[1][0]['value']) > .012:
        return {**failure, 'reason': 'Mask kontras memberi arah berbeda; periksa jarum/pantulan.'}
    value, needle_info = max(variants, key=lambda p: p[1]['radial_support']) if variants else (None, needle_info)
    if value is None:
        return {**failure, 'needle_detection': needle_info, 'reason': needle_info['reason']}
    overlay['tip'] = mapped(pivot + radius * .72 * np.array([math.cos(math.radians(value['angle'])), math.sin(math.radians(value['angle']))]))
    return {**failure, **value, 'requires_manual':ambiguous or scale_contaminated,'needle_detection': {**needle_info, 'contrast_variants_agree': len(variants) == 2}, 'overlay': overlay,
            'calibration_source': 'per-photo major strokes; profile 0-1 MPa',
            'reason': 'Skala dan jarum dihitung dari foto ini setelah koreksi cahaya/bidang dial. Periksa overlay dan konfirmasi.'}
