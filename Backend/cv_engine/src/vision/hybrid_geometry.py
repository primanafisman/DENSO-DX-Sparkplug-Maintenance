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
