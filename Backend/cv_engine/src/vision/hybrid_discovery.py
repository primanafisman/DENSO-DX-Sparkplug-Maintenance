"""Additional local LED crop proposals; shared label association is unchanged."""
import io

import cv2
import numpy as np
from PIL import Image, ImageOps

from .discovery import gauge_rois,overlap,rectangle
from .hybrid_auto_analog import read_auto_analog, _dial_ellipse
from .images import crop_image
from .models import ROI
from .hybrid_geometry import red_bezel_arcs, neutral_dial_ellipses
from .hybrid_display import propose_digital_displays


def _native_discovery_thumbnail(prepared):
    """Locate edges before prepared-JPEG resizing/recompression breaks them."""
    def thumbnail(source):
        ratio=min(1.,1400/max(source.size))
        # Area averaging avoids sharpening halos and preserves continuous rim
        # edges before Canny; recognition still uses the original crop pixels.
        small=source.resize((round(source.width*ratio),round(source.height*ratio)),Image.Resampling.BOX) if ratio<1 else source
        if small.mode!='RGB':small=small.convert('RGB')
        return cv2.cvtColor(np.asarray(small),cv2.COLOR_RGB2BGR)
    if prepared._decoded is not None:
        return thumbnail(prepared._decoded)
    with Image.open(io.BytesIO(prepared.original or prepared.jpeg)) as source:
        return thumbnail(ImageOps.exif_transpose(source))


def hybrid_gauge_rois(prepared,spans):
    proposals=gauge_rois(prepared,spans)
    image=cv2.imdecode(np.frombuffer(prepared.jpeg,np.uint8),cv2.IMREAD_COLOR)
    full_image=image
    ratio=min(1.,1000/max(image.shape[:2]))
    image=cv2.resize(image,None,fx=ratio,fy=ratio)
    h,w=image.shape[:2]
    # Old absolute-black tests miss a needle faded by glass/reflection. Propose
    # circular housings, then require real scale geometry in a normalized crop.
    gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
    circles=cv2.HoughCircles(cv2.GaussianBlur(gray,(7,7),1.5),cv2.HOUGH_GRADIENT,
                            1.3,min(h,w)*.16,param1=85,param2=32,
                            minRadius=max(28,int(min(h,w)*.07)),maxRadius=int(min(h,w)*.48))
    locations=list([] if circles is None else circles[0])
    # A tilted dial is elliptical and may never produce the right Hough circle.
    # Colour is used only to propose a crop; scale geometry still verifies it.
    for arc in red_bezel_arcs(full_image):
        (x,y),axes,_=cv2.fitEllipse(arc)
        x*=ratio;y*=ratio;radius=max(axes)*ratio/2
        if min(axes)*ratio/2<min(h,w)*.07 or radius>min(h,w)*.48: continue
        locations.insert(0,(x,y,radius))
    # Neutral faces can be small, off-centre ellipses with no red annulus.
    # Keep these as proposals only: the unchanged native-pixel scale/shaft
    # checks below still decide whether an analog ROI can be offered.
    neutral_image=_native_discovery_thumbnail(prepared)
    full_h,full_w=neutral_image.shape[:2]
    candidates=[]
    for (x,y),axes,_ in neutral_dial_ellipses(neutral_image):
        radius=max(axes)/2*1.10
        candidates.append(rectangle((x-radius)/full_w,(y-radius)/full_h,
                                    (x+radius)/full_w,(y+radius)/full_h))
    candidates.extend(p['roi'] for p in proposals if p['kind_hint']=='analog')
    candidates.extend(rectangle((x-radius*1.20)/w,(y-radius*1.20)/h,
                                (x+radius*1.20)/w,(y+radius*1.20)/h)
                      for x,y,radius in locations)
    tested=[]; scored=[]
    for roi in candidates[:32]:
        if any(overlap(roi,p)>.99 and abs(roi['width']-p['width'])<.003 for p in tested):continue
        tested.append(roi)
        if min(roi['width']*(prepared.source_width or prepared.width),
               roi['height']*(prepared.source_height or prepared.height))<64:continue
        left,top=round(roi['x']*w),round(roi['y']*h)
        right,bottom=round((roi['x']+roi['width'])*w),round((roi['y']+roi['height'])*h)
        coarse=image[top:bottom,left:right]
        if min(coarse.shape[:2])<32 or _dial_ellipse(coarse) is None:continue
        # Proposal search is cheap on the thumbnail. Crop selection uses the
        # same original pixels as the reading stage, preserving fine ticks.
        geometry=read_auto_analog(crop_image(prepared,ROI.model_validate(roi)))
        if len(geometry.get('overlay',{}).get('scale_points',[]))!=6:continue
        needle=geometry.get('needle_detection',{})
        score=(int(geometry.get('value') is not None),
               int(not geometry.get('requires_manual',False)),
               int(needle.get('contrast_variants_agree',False)),
               float(needle.get('radial_support',0)))
        scored.append((score,{'roi':roi,'kind_hint':'analog','confidence':'medium','requires_review':True,
                             'method':'native dial scale and shaft evidence; reading and identity require review'}))
    verified=[]
    for _,proposal in sorted(scored,key=lambda item:item[0],reverse=True):
        if not any(overlap(proposal['roi'],p['roi'])>.7 for p in verified):verified.append(proposal)
    # A scale number/paint patch inside a verified dial is not another display.
    proposals=[p for p in proposals if not any(overlap(p['roi'],v['roi'])>.7 for v in verified)]
    proposals.extend(verified)
    displays=[p for p in propose_digital_displays(prepared,spans)
              if not any(overlap(p['roi'],v['roi'])>.65 for v in verified)]
    # Measured display windows retain a faint decimal/sign and take precedence
    # over loose OCR-word rectangles or connected coloured label patches.
    proposals=[p for p in proposals if not any(overlap(p['roi'],d['roi'])>.65 for d in displays)]
    proposals.extend(displays)
    return sorted(proposals,key=lambda p:(p['roi']['y'],p['roi']['x']))[:12]
