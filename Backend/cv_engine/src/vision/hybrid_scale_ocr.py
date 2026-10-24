"""Recover printed scale order after a full-dial OCR detector miss.

Only the supported 0--1 MPa family's scale labels are interpreted here. The
needle value still comes from the observed strokes and shaft geometry.
"""
import re

import cv2
import numpy as np

from .hybrid_auto_analog import read_auto_analog


def recover_scale_direction(data, geometry, ocr_output, reader):
    """Try at most six bounded label crops when all needle checks agree.

    Small dial lettering is often invisible to the text detector when the whole
    gauge is resized. Independent local text crops can establish numeric order;
    they cannot rescue ambiguous needles, missing ticks, or a conflicting saved
    calibration. The existing scale-order validator makes the final decision.
    """
    direction = geometry.get('scale_direction', {})
    needle = geometry.get('needle_detection', {})
    overlay = geometry.get('overlay', {})
    points = overlay.get('scale_points', [])
    if (reader is None or geometry.get('value') is None
            or direction.get('confirmed', True) or geometry.get('requires_manual', False)
            or not needle.get('contrast_variants_agree')
            or needle.get('radial_support', 0) < .70
            or geometry.get('pivot_detection', {}).get('support', 0) < 60
            or len(points) != 6 or 'pivot' not in overlay):
        return geometry

    image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        return geometry
    height, width = image.shape[:2]
    pivot = np.array([overlay['pivot']['x'] * width, overlay['pivot']['y'] * height])
    half = max(12, round(min(width, height) * .085))
    spans = []
    compact_count = 0
    attempted = 0
    # Separated labels usually prove order in two calls. Endpoints are often
    # obscured by screws; avoid OCR on all six labels when evidence is sufficient.
    for index in (1, 4, 0, 5, 2, 3):
        point = points[index]
        tick = np.array([point['x'] * width, point['y'] * height])
        centre = pivot + .72 * (tick - pivot)
        left, top = max(0, round(centre[0]) - half), max(0, round(centre[1]) - half)
        right, bottom = min(width, round(centre[0]) + half), min(height, round(centre[1]) + half)
        if right <= left or bottom <= top:
            continue
        patch = image[top:bottom, left:right]
        scale = min(3., 800. / max(patch.shape[:2]))
        if scale > 1:
            patch = cv2.resize(patch, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        ok, encoded = cv2.imencode('.jpg', patch, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if not ok:
            continue
        attempted += 1
        local = reader.read_upright(encoded.tobytes())
        for span in local.get('spans', []):
            token = span.get('text', '').strip().replace(',', '.')
            score = span.get('ocr_score', 0)
            # A tiny decimal dot can disappear while both adjacent digits remain
            # clear. Accept only exact 02/04/06/08 pairs, at a higher threshold,
            # and only as direction anchors for this configured scale family.
            # Bare 2/8 and arbitrary numbers must never acquire a decimal.
            compact = bool(re.fullmatch(r'0[2468]', token))
            if compact:
                if score < .90:
                    continue
                token = '0.' + token[1]
            elif not re.fullmatch(r'(?:0(?:\.[02468])?|1(?:\.0)?)', token) or score < .85:
                continue
            roi = span.get('roi', {})
            if not all(k in roi for k in ('x', 'y', 'width', 'height')):
                continue
            mapped = {'x': (left + roi['x'] * (right - left)) / width,
                      'y': (top + roi['y'] * (bottom - top)) / height,
                      'width': roi['width'] * (right - left) / width,
                      'height': roi['height'] * (bottom - top) / height}
            spans.append({'text': token, 'ocr_score': score, 'roi': mapped})
            compact_count += int(compact)
        if len({s['text'] for s in spans}) >= 2:
            combined = {**(ocr_output or {}), 'spans': (ocr_output or {}).get('spans', []) + spans}
            recovered = read_auto_analog(data, combined)
            if recovered.get('scale_direction', {}).get('confirmed'):
                recovered['scale_direction']['recovery'] = {
                    'method': 'bounded local scale-label OCR; fixed 0-1 MPa family',
                    'attempted_crops': attempted, 'recognized_labels': len({s['text'] for s in spans}),
                    'compact_digit_pairs': compact_count}
                return recovered
    details = {'method': 'bounded local scale-label OCR; fixed 0-1 MPa family',
               'attempted_crops': attempted, 'recognized_labels': len({s['text'] for s in spans}),
               'compact_digit_pairs': compact_count}
    geometry['scale_direction']['recovery'] = details
    return geometry
