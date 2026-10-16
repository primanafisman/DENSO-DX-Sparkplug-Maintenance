"""CPU seven-segment LCD decoding; no OCR weights, API, or reference values.

The measured display is illumination-normalized, then italic strokes are
aligned. A number requires complete segment patterns and observed punctuation
at two contrast thresholds. Geometry searches never add a missing segment.
"""
import re
import cv2
import numpy as np
from .digital_ocr import PATTERNS


def _row(mask):
    h,w=mask.shape
    _,_,stats,_=cv2.connectedComponentsWithStats(mask)
    parts=[s for s in stats[1:] if s[4]>3 and s[0]>0 and s[1]>0
           and s[0]+s[2]<w and s[1]+s[3]<h]
    tall=[s for s in parts if h*.25<s[3]<h*.95 and s[2]<w*.5]
    if len(tall)<2:return None
    ref=max(s[3] for s in tall);digits=[s for s in tall if s[3]>ref*.7]
    if len(digits)<2:return None
    top=min(s[1] for s in digits);bottom=max(s[1]+s[3] for s in digits);ref=bottom-top
    left=min(s[0] for s in digits);right=max(s[0]+s[2] for s in digits)
    if max(s[1]+s[3]/2 for s in digits)-min(s[1]+s[3]/2 for s in digits)>ref*.25:return None
    dots=[s for s in parts if ref*.035<s[3]<ref*.18 and ref*.035<s[2]<ref*.18
          and .6<s[2]/s[3]<1.6 and top+ref*.8<s[1]<bottom+ref*.10
          and left<s[0]<right+ref*.12 and s[4]>ref*.5]
    signs=[s for s in parts if s[3]<ref*.20 and ref*.20<s[2]<ref*1.2
           and left-ref*1.4<s[0]+s[2]<left and abs(s[1]+s[3]/2-(top+bottom)/2)<ref*.2]
    # A clipped leading mark cannot be silently discarded as bezel/noise.
    if any(s[0]==0 and s[3]<ref*.25 and abs(s[1]+s[3]/2-(top+bottom)/2)<ref*.2 for s in stats[1:]):return None
    if len(dots)>1 or len(signs)>1:return None
    work=mask.copy()
    for x,y,bw,bh,_ in dots+signs:work[y:y+bh,x:x+bw]=0
    active=(work[top:bottom]>0).sum(axis=0)>ref*.09
    groups=[];begin=None
    for x in range(w+1):
        if x<w and active[x] and begin is None:begin=x
        if (x==w or not active[x]) and begin is not None:
            if x-begin>ref*.04:groups.append((begin,x))
            begin=None
    output=[];scores_all=[]
    samples=[(.28,.025,.72,.13),(.76,.20,.98,.37),(.72,.64,.98,.81),(.27,.87,.70,.99),
             (.02,.63,.26,.80),(.02,.20,.26,.37),(.28,.45,.72,.56)]
    for a,b in groups:
        if a<left-ref*.1 or b>right+ref*.1:
            if np.any((work[top:bottom,a:b]>0).sum(axis=0)>ref*.25):return None
            continue
        patch=work[top:bottom,a:b]/255.;ph,pw=patch.shape
        if pw/ph<.24:
            char='1' if patch.mean()>.45 else None
        else:
            scores=[]
            for j,(x,y,x2,y2) in enumerate(samples):
                region=patch[round(y*ph):max(round(y2*ph),round(y*ph)+1),round(x*pw):max(round(x2*pw),round(x*pw)+1)]
                scores.append(float(region.mean(axis=1 if j in (0,3,6) else 0).max()))
            char=PATTERNS.get(''.join('1' if s>.35 else '0' for s in scores))
            if any(.12<s<.35 for s in scores):char=None
            scores_all.append(scores)
        if char is None:return None
        output.append(((a+b)/2,char))
    if not 2<=len(output)<=10:return None
    count=len(output)
    output += [(s[0]+s[2]/2,'.') for s in dots]+[(s[0]+s[2]/2,'-') for s in signs]
    output.sort();raw=''.join(c for _,c in output)
    if not re.fullmatch(r'-?\d+(?:\.\d+)?',raw):return None
    return {'raw_text':raw,'digits':count,'decimal_dots':len(dots),'minus_signs':len(signs)}


def decode_lcd_line(image):
    """Input must already be the measured numeric row, including sign/dot."""
    if image is None or min(image.shape[:2])<18:return None
    h,w=image.shape[:2];scale=min(1.,900/w)
    if scale<1:image=cv2.resize(image,None,fx=scale,fy=scale,interpolation=cv2.INTER_AREA)
    h,w=image.shape[:2];gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
    gray=cv2.medianBlur(gray,5)
    size=max(9,round(h*.20))|1
    background=cv2.morphologyEx(gray,cv2.MORPH_CLOSE,np.ones((size,size),np.uint8))
    contrast=(background.astype(np.float32)-gray)/np.maximum(background,1)
    found=[]
    for threshold in (.12,.16,.20,.24,.28):
        mask=(contrast>threshold).astype(np.uint8)*255
        # Preserve the original crop-edge veto before padding/shearing moves it.
        _,_,edge_stats,_=cv2.connectedComponentsWithStats(mask)
        for x,y,bw,bh,area in edge_stats[1:]:
            if not (x==0 or x+bw>=w) or not h*.25<y+bh/2<h*.75:continue
            clipped_sign=h*.035<bh<h*.22 and bw<h*.7 and area>2
            clipped_digit=h*.25<bh<h*.95 and bw<h*.7
            if clipped_sign or clipped_digit:return None
        for shear in (0.,.05,.10,.15,.20,.25,.30):
            matrix=np.float32([[1,shear,10],[0,1,10]])
            aligned=cv2.warpAffine(mask,matrix,(w+round(shear*h)+20,h+20))
            value=_row(aligned)
            if value:found.append({**value,'threshold':threshold,'shear':shear})
    if not found:return None
    # Partial rows at high contrast cannot outvote a complete measured row.
    count=max(v['digits'] for v in found);full=[v for v in found if v['digits']==count]
    by_text={v['raw_text'] for v in full if len({f['threshold'] for f in full if f['raw_text']==v['raw_text']})>=2}
    if len(by_text)!=1:return None
    raw=next(iter(by_text))
    # A second complete, signed/decimal interpretation is a conflict even if
    # it has only one threshold's support; formatting is never chosen by range.
    if any(v['raw_text']!=raw and ('.' in v['raw_text'] or '-' in v['raw_text']) for v in full):return None
    return {'raw_text':raw,'decimal_dots':int('.' in raw),'minus_signs':int(raw.startswith('-')),
            'variants':[v for v in full if v['raw_text']==raw],'method':'local-lcd-segment-geometry-v1'}
