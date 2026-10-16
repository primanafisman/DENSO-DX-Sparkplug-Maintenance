"""Local photo discovery. Geometry proposes crops; registry supplies profiles."""
import re

import cv2
import numpy as np

from .preprocessing import propose_rois
from .text_ocr import join_lines

NUMERIC_LOCATION = 'numeric text location; value and decimal must be read again'
CONTROL_LEGEND = r'(?:ORIGIN|ON OFF|ZERO ABS|PRESET|HOLD DATA|OUT ?[12])'


def control_legend(text):
    """Only a complete sequence of known button legends is non-identity text."""
    normalized = re.sub(r'[\W_]+', ' ', text.upper()).strip()
    return re.fullmatch(rf'{CONTROL_LEGEND}(?: {CONTROL_LEGEND})*', normalized) is not None


def bounds(roi):
    return roi['x'], roi['y'], roi['x']+roi['width'], roi['y']+roi['height']


def rectangle(left, top, right, bottom):
    left, top, right, bottom = map(float, (left, top, right, bottom))
    left, top, right, bottom = max(0., left), max(0., top), min(1., right), min(1., bottom)
    return {'x': left, 'y': top, 'width': right-left, 'height': bottom-top}


def contains(roi, span):
    left, top, right, bottom = bounds(roi)
    s = span['roi']
    return left <= s['x']+s['width']/2 <= right and top <= s['y']+s['height']/2 <= bottom

def observed_display_unit(roi,spans):
    units=set()
    names={'mpa':'MPa','mm':'mm','kn':'kN','n':'N','bar':'bar'}
    for span in spans:
        if span.get('ocr_score',0)<.85 or not contains(roi,span):continue
        for token in re.findall(r'(?<![A-Za-z])(MPa|mm|kN|bar|N)(?![A-Za-z])',span.get('text',''),re.IGNORECASE):
            units.add(names[token.lower()])
    return next(iter(units)) if len(units)==1 else None


def number_span(span):
    return bool(re.fullmatch(r'[+−-]?\d+(?:[.,]\d+)?', span['text'].strip()))


def overlap(a, b):
    ax, ay, ar, ab = bounds(a)
    bx, by, br, bb = bounds(b)
    intersection = max(0., min(ar, br)-max(ax, bx))*max(0., min(ab, bb)-max(ay, by))
    return intersection / max(min(a['width']*a['height'], b['width']*b['height']), 1e-9)


def minimum_crop(roi, width, height, pixels=48):
    rw, rh = min(1., max(roi['width'], pixels/width)), min(1., max(roi['height'], pixels/height))
    left = max(0., min(1.-rw, roi['x']+roi['width']/2-rw/2))
    top = max(0., min(1.-rh, roi['y']+roi['height']/2-rh/2))
    return rectangle(left, top, left+rw, top+rh)


def dial_evidence(roi, gray, numbers):
    """A circular housing alone may be a button. Require scale text or a needle."""
    h, w = gray.shape
    ticks = [s for s in numbers if contains(roi, s)
             and s['roi']['height'] < roi['height']*.18
             and s['roi']['width'] < roi['width']*.3]
    if len(ticks) >= 2:
        return True
    left, top, right, bottom = bounds(roi)
    crop = gray[int(top*h):int(bottom*h), int(left*w):int(right*w)]
    ch, cw = crop.shape
    if min(ch, cw) < 32:
        return False
    yy, xx = np.ogrid[:ch, :cw]
    inner = ((xx-cw/2)/(cw/2))**2+((yy-ch/2)/(ch/2))**2 < .68**2
    dark = ((crop < 65) & inner).astype(np.uint8)*255
    fraction = np.count_nonzero(dark)/max(np.count_nonzero(inner), 1)
    if not .002 < fraction < .2:
        return False
    radius = min(ch, cw)/2
    lines = cv2.HoughLinesP(dark, 1, np.pi/180, 18,
                            minLineLength=max(15, int(radius*.3)), maxLineGap=5)
    if lines is not None:
        center = np.array([cw/2, ch/2])
        for x1, y1, x2, y2 in lines[:, 0]:
            a, b = np.array([x1, y1]), np.array([x2, y2])
            length = np.linalg.norm(a-b)
            if .3*radius < length < .95*radius and min(np.linalg.norm(a-center), np.linalg.norm(b-center)) < .28*radius:
                return True
    return False


def gauge_rois(prepared, spans):
    source = cv2.imdecode(np.frombuffer(prepared.jpeg, np.uint8), cv2.IMREAD_COLOR)
    ratio = min(1., 900/max(source.shape[:2]))
    source = cv2.resize(source, None, fx=ratio, fy=ratio)
    h, w = source.shape[:2]
    gray = cv2.cvtColor(source, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 40, 120)
    numbers = [s for s in spans if number_span(s)]
    proposals = propose_rois(prepared)
    analog = [p for p in proposals if p['kind_hint'] == 'analog' and dial_evidence(p['roi'], gray, numbers)]
    circles = cv2.HoughCircles(cv2.GaussianBlur(gray, (7, 7), 1.5), cv2.HOUGH_GRADIENT,
                              1.4, min(h, w)*.17, param1=100, param2=48,
                              minRadius=max(25, int(min(h, w)*.08)),
                              maxRadius=int(min(h, w)*.48))
    angles = np.linspace(0, 2*np.pi, 120, endpoint=False)
    if circles is not None:
        for x, y, radius in circles[0]:
            if x-radius < 0 or y-radius < 0 or x+radius >= w or y+radius >= h:
                continue
            samples = [edges[np.clip((y+(radius+d)*np.sin(angles)).astype(int), 0, h-1),
                             np.clip((x+(radius+d)*np.cos(angles)).astype(int), 0, w-1)] for d in range(-4, 5)]
            coverage = float(np.any(np.asarray(samples)>0, axis=0).mean())
            roi = rectangle((x-radius*1.06)/w, (y-radius*1.06)/h,
                            (x+radius*1.06)/w, (y+radius*1.06)/h)
            if coverage < .62 or not dial_evidence(roi, gray, numbers):
                continue
            analog.append({'roi': roi, 'kind_hint': 'analog', 'confidence': 'medium',
                           'method': 'circle edges and visible scale; inspect complete dial'})
    analog.sort(key=lambda p: p['roi']['width']*p['roi']['height'], reverse=True)
    accepted = []
    for proposal in analog:
        if not any(overlap(proposal['roi'], p['roi']) > .7 for p in accepted):
            accepted.append(proposal)
    for proposal in proposals:
        if proposal['kind_hint'] != 'digital':
            continue
        text_inside = [s for s in spans if contains(proposal['roi'], s)]
        if text_inside and not any(number_span(s) for s in text_inside):
            continue  # a rectangle containing only words is probably a label
        if not any(overlap(proposal['roi'], p['roi']) > .7 for p in accepted):
            accepted.append(proposal)
    for span in numbers:
        r = span['roi']
        digits = sum(c.isdigit() for c in span['text'])
        if (digits < 3 and not any(c in span['text'] for c in '.,')) or r['height'] < .03:
            continue
        if any(contains(p['roi'], span) for p in accepted):
            continue  # scale ticks are not separate digital instruments
        # Include signs/decimal around OCR's text box. Recognition happens on this crop again.
        left, top, right, bottom = bounds(r)
        roi = rectangle(left-r['width']*.22, top-r['height']*.4,
                        right+r['width']*.18, bottom+r['height']*.4)
        if not any(overlap(roi, p['roi']) > .65 for p in accepted):
            accepted.append({'roi': roi, 'kind_hint': 'digital', 'confidence': 'medium',
                             'method': NUMERIC_LOCATION})
    if not spans:
        for p in proposals:
            if p['kind_hint'] == 'analog' and not dial_evidence(p['roi'], gray, numbers):
                continue
            if not any(overlap(p['roi'], a['roi']) > .7 for a in accepted):
                accepted.append(p)
    for p in accepted:
        p['roi'] = minimum_crop(p['roi'], prepared.source_width or prepared.width,
                               prepared.source_height or prepared.height, pixels=64)
    return sorted(accepted, key=lambda p: (p['roi']['y'], p['roi']['x']))[:12]


def label_rows(spans, registry, area, assets=None):
    rows = []
    excluded = {'MPA', 'BAR', 'MM', 'PSI', 'KPA', 'MITUTOYO', 'ABSOLUTE', 'SMC PRESSURE'}
    for span in spans:
        text = span['text'].strip()
        roi = span['roi']
        if (control_legend(text) or
                re.fullmatch(r'[^\r\n/\\]+\.(?:jpe?g|png|webp|bmp|gif|tiff?|heic|heif)', text, re.IGNORECASE)):
            # Viewer filenames and button legends do not establish identity.
            # An exact registered code/name/alias can legitimately use either.
            match = registry.match_label(text, area=area, assets=assets)
            if not any(c['match_score'] >= .98 for c in match['candidates']):
                continue
        if number_span(span):
            match = registry.match_label(text, area=area, assets=assets)
            if any(c['evidence'] == 'code' and c['match_score'] == 1. for c in match['candidates']):
                rows.append([span])
            continue
        if text.upper() in excluded or len(text) < 3:
            continue
        if not any(c.isalpha() for c in text) or roi['width'] < roi['height']:
            continue
        center = roi['y']+roi['height']/2
        row = next((r for r in rows if abs(center-r[0]['roi']['y']-r[0]['roi']['height']/2)
                    < .4*min(roi['height'], r[0]['roi']['height'])
                    and abs(roi['x']-r[-1]['roi']['x']-r[-1]['roi']['width']) < .12), None)
        if row is None:
            rows.append([span])
        else:
            row.append(span)
    result = []
    for row in rows:
        text = join_lines(row)
        boxes = [bounds(s['roi']) for s in row]
        left, top = min(b[0] for b in boxes), min(b[1] for b in boxes)
        right, bottom = max(b[2] for b in boxes), max(b[3] for b in boxes)
        pad = (bottom-top)*.25
        match = registry.match_label(text, area=area, assets=assets)
        reliable = all(s.get('ocr_score', 0) >= .85 for s in row)
        numeric = all(number_span(s) for s in row)
        if numeric:
            match.update(level='medium' if match['candidates'] else 'low',
                         suggested_id=None, requires_operator_selection=True,
                         reason='Kode angka juga dapat merupakan nilai display. Pilih identitas dan periksa ROI secara manual.')
        if not reliable and match['level'] == 'high':
            match.update(level='medium', suggested_id=None, requires_operator_selection=True,
                         reason='Teks OCR belum cukup jelas; pilih alat secara manual.')
        result.append({'roi': rectangle(left-pad, top-pad, right+pad, bottom+pad),
                       'label': match, 'reliable': reliable,
                       'numeric_code': numeric})
    return result


def label_distance(gauge, label):
    g, l = gauge['roi'], label['roi']
    dx = abs(g['x']+g['width']/2-l['x']-l['width']/2)
    top, bottom = g['y'], g['y']+g['height']
    lt, lb = l['y'], l['y']+l['height']
    gap = max(0., top-lb, lt-bottom)
    inside = max(0., min(bottom, lb)-max(top, lt)) > l['height']*.5
    return dx*2 + gap + (1. if inside else 0.)


def discover_image(prepared, registry, text_ocr, area='',*,gauge_detector=None):
    assets=registry.all()
    ocr = text_ocr.read(prepared.jpeg)
    spans = ocr.get('spans', [])
    gauges = (gauge_detector or gauge_rois)(prepared, spans)
    labels = label_rows(spans, registry, area, assets)
    physical = [g for g in gauges if g.get('method') != NUMERIC_LOCATION]
    # A code on the display/scale remains a measurement, never equipment identity.
    labels = [l for l in labels if not l['numeric_code'] or
              not any(contains(g['roi'], l) for g in physical)]
    # Keep numeric OCR display proposals even when they equal registered codes:
    # position alone cannot distinguish a label from a separate real display.
    for label in labels:
        label['roi'] = minimum_crop(label['roi'], prepared.source_width or prepared.width,
                                    prepared.source_height or prepared.height)
    pairs = []
    for li, label in enumerate(labels):
        scores = sorted((label_distance(g, label), gi) for gi, g in enumerate(gauges))
        if not scores or scores[0][0] > .8:
            continue
        if len(scores) > 1 and scores[1][0]-scores[0][0] < .12:
            continue  # a label between two gauges cannot prove either identity
        score, gi = scores[0]
        priority = 0 if label['label']['candidates'] else 1
        pairs.append((priority, score, gi, li))
    assignment = {}
    for _, score, gi, li in sorted(pairs):
        if gi not in assignment:
            assignment[gi] = labels[li]
    for gi, selected in assignment.items():
        competing = [labels[li] for _, _, g, li in pairs if g == gi and labels[li]['label'].get('suggested_id')]
        identities = {item['label']['suggested_id'] for item in competing}
        if len(identities) > 1:
            candidates = {c['instrument_id']: c for item in competing for c in item['label']['candidates']}
            selected['label'] = {**selected['label'], 'suggested_id': None, 'level': 'low',
                                 'requires_operator_selection': True,
                                 'raw_text': '\n'.join(item['label']['raw_text'] for item in competing),
                                 'candidates': list(candidates.values()),
                                 'reason': 'Beberapa label berbeda dekat gauge yang sama. Pilih identitas secara manual.'}
    instruments = []
    for gi, gauge in enumerate(gauges):
        selected = assignment.get(gi)
        label = selected['label'] if selected else registry.match_label('', area=area, assets=assets)
        instrument = next((a for a in assets if a['id']==label.get('suggested_id')),None)
        instruments.append({**gauge, 'client_id': f'roi-{gi+1}',
                            'observed_unit': observed_display_unit(gauge['roi'],spans),
                            'label_roi': selected['roi'] if selected else None,
                            'label': label, 'instrument': instrument,
                            'automatic_read': instrument is not None,
                            'requires_confirmation': True})
    warnings = list(ocr.get('warnings', []))
    if not gauges:
        warnings.append('Gauge/display belum ditemukan; pilih ROI dan profil alat secara manual.')
    if any(i['instrument'] is None for i in instruments):
        warnings.append('Alat belum cocok jelas dengan Pengaturan. Pilih alat/profil sebelum membaca nilainya.')
    return {'instruments': instruments, 'warnings': warnings,
            'method': 'local geometry + OCR label + equipment registry; no AI requests',
            'confidence_calibrated': False}
