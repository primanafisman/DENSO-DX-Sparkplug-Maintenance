"""Contour geometry only: no reference readings, registry or learned weights."""
import math

import cv2
import numpy as np


def outer_arc(contour):
    """Fit an annular C-shaped contour using its outside, not both ring edges."""
    if len(contour) < 90:
        return None
    centre, axes, angle = cv2.fitEllipse(contour)
    a, b = np.asarray(axes) / 2
    if min(a, b) < 8 or max(a, b) / min(a, b) > 1.8:
        return None
    theta = math.radians(angle)
    rotation = np.array([[math.cos(theta), -math.sin(theta)], [math.sin(theta), math.cos(theta)]])
    points = contour[:, 0].astype(float)
    local = (points - centre) @ rotation / [a, b]
    radii = np.linalg.norm(local, axis=1)
    bins = ((np.arctan2(local[:, 1], local[:, 0]) + math.pi) * 90 / (2 * math.pi)).astype(int)
    if len(np.unique(bins)) < 45:
        return None
    outside = np.array([points[np.flatnonzero(bins == v)[np.argmax(radii[bins == v])]]
                        for v in np.unique(bins)], np.float32).reshape(-1, 1, 2)
    centre, axes, angle = cv2.fitEllipse(outside)
    a, b = np.asarray(axes) / 2
    if min(a, b) < 8 or max(a, b) / min(a, b) > 1.65:
        return None
    theta = math.radians(angle)
    rotation = np.array([[math.cos(theta), -math.sin(theta)], [math.sin(theta), math.cos(theta)]])
    local = (outside[:, 0] - centre) @ rotation / [a, b]
    if np.median(np.abs(np.linalg.norm(local, axis=1) - 1)) > .04:
        return None
    return outside


def red_bezel_arcs(image):
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    red = (((hsv[:, :, 0] < 20) | (hsv[:, :, 0] > 150)) &
           (hsv[:, :, 1] > 35) & (hsv[:, :, 2] > 60)).astype(np.uint8) * 255
    red = cv2.morphologyEx(red, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    contours, _ = cv2.findContours(red, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    return [arc for c in contours if (arc := outer_arc(c)) is not None]


def neutral_dial_ellipses(image):
    """Bounded crop proposals for small non-red dial faces in a machine scene.

    A neutral bright interior and independently supported circumference locate
    a possible face. They do not establish a scale, needle or valid reading.
    Returned OpenCV ellipses use the input image's pixel coordinates.
    """
    ratio = min(1., 1400 / max(image.shape[:2]))
    sample = cv2.resize(image, None, fx=ratio, fy=ratio) if ratio < 1 else image
    h, w = sample.shape[:2]
    gray = cv2.cvtColor(sample, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(sample, cv2.COLOR_BGR2HSV)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 30, 90)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    ey, ex = np.where(edges > 0)
    edge_points = np.column_stack([ex, ey])
    candidates = []
    for contour in contours:
        if len(contour) < 80:
            continue
        centre, axes, angle = cv2.fitEllipse(contour)
        a, b = np.asarray(axes) / 2
        if min(a, b) < 25 or max(a, b) > .42 * min(h, w) or max(a, b) / min(a, b) > 1.9:
            continue
        theta = math.radians(angle)
        rotation = np.array([[math.cos(theta), -math.sin(theta)], [math.sin(theta), math.cos(theta)]])
        local = (contour[:, 0] - centre) @ rotation / [a, b]
        residual = float(np.median(np.abs(np.linalg.norm(local, axis=1) - 1)))
        bins = np.unique(((np.arctan2(local[:, 1], local[:, 0]) + math.pi) * 36 / (2 * math.pi)).astype(int))
        if residual > .022 or len(bins) < 20:
            continue
        nearby = (edge_points - centre) @ rotation / [a, b]
        ring = nearby[np.abs(np.linalg.norm(nearby, axis=1) - 1) < .025]
        coverage = len(np.unique(((np.arctan2(ring[:, 1], ring[:, 0]) + math.pi) * 36 / (2 * math.pi)).astype(int)))
        if coverage < 25:
            continue
        x, y = centre
        radius = max(a, b)
        yy, xx = np.mgrid[max(0, int(y-radius)):min(h, int(y+radius+1)),
                          max(0, int(x-radius)):min(w, int(x+radius+1))]
        radii = np.linalg.norm((np.stack([xx-x, yy-y], axis=-1) @ rotation) / [a, b], axis=2)
        middle = (radii > .3) & (radii < .77)
        if not np.any(middle):
            continue
        neutral = (gray[yy, xx] > 130) & (hsv[yy, xx, 1] < 130)
        fraction = float(neutral[middle].mean())
        if fraction < .40:
            continue
        hub = radii < .18
        dark = float((gray[yy, xx][hub] < 100).mean()) if np.any(hub) else 0.
        score = coverage / 36 - residual + fraction + .25 * dark
        candidates.append((score, centre, axes, angle))
    accepted = []
    for _, centre, axes, angle in sorted(candidates, key=lambda row: row[0], reverse=True):
        if any(np.linalg.norm(np.asarray(centre)-other[0]) < min(axes)*.1
               and abs(max(axes)/max(other[1])-1) < .25 for other in accepted):
            continue
        accepted.append((np.asarray(centre), np.asarray(axes), angle))
        if len(accepted) == 12:
            break
    return [(tuple(centre/ratio), tuple(axes/ratio), angle) for centre, axes, angle in accepted]
