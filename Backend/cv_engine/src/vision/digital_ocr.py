"""Conservative seven-segment recognition; disagreement is an abstention."""
import re
from decimal import Decimal

import cv2
import numpy as np

from .models import Candidate

VERSION = 'seven-segment-v1'
PATTERNS = {'1111110':'0', '0110000':'1', '1101101':'2', '1111001':'3', '0110011':'4',
            '1011011':'5', '1011111':'6', '1110000':'7', '1110010':'7', '1111111':'8', '1111011':'9'}


def _digit(mask):
    h, w = mask.shape
    if w/h < .22:
        return '1' if mask.mean() > .5 else None
    samples = [( .15,0,.85,.14),(.77,.15,1,.43),(.77,.57,1,.85),(.15,.86,.85,1),
               (0,.57,.23,.85),(0,.15,.23,.43),(.15,.43,.85,.57)]
    bits = []
    for x,y,x2,y2 in samples:
        region=mask[int(y*h):max(int(y2*h),int(y*h)+1),int(x*w):max(int(x2*w),int(x*w)+1)]
        occupancy=float(region.mean())
        if .12 < occupancy < .28:
            return None
        bits.append('1' if occupancy>=.28 else '0')
    return PATTERNS.get(''.join(bits))


def _original_damage(binary):
    """Explicit clipping/partial-row proof; not a claim to decode the number."""
    mask=cv2.morphologyEx(binary,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    _,_,stats,_=cv2.connectedComponentsWithStats(mask);height,width=mask.shape
    parts=[tuple(map(int,s)) for s in stats[1:] if s[4]>=5 and not(s[2]>width*.9 and s[3]>height*.9)]
    tall=[p for p in parts if p[3]>=20 and p[2]>=3 and p[2]/p[3]<1.1]
    if not tall:return None
    ref=max(p[3] for p in tall)
    full=[p for p in tall if p[3]>=ref*.7 and _digit(mask[p[1]:p[1]+p[3],p[0]:p[0]+p[2]].astype(np.float32)/255) is not None]
    if not full or len(full)>10:return None
    middle=float(np.median([y+h/2 for x,y,w,h,a in full]))
    if any(abs(y+h/2-middle)>ref*.2 for x,y,w,h,a in full):return None
    left=min(p[0] for p in full);right=max(p[0]+p[2] for p in full)
    if any(x==0 and x<left and h<ref*.25 and abs(y+h/2-middle)<ref*.2 for x,y,w,h,a in parts):
        return 'crop_edge_mark'
    if any(len(full)>=2 and ref*.3<h<ref*.7 and abs(y+h/2-middle)<ref*.5
           and (x<left-ref*.05 or x+w>right+ref*.05) for x,y,w,h,a in parts):
        return 'partial_outer_digit'
    return None


def _tokens(binary):
    # A small close joins adjacent strokes without bridging inter-digit gaps.
    mask=cv2.morphologyEx(binary,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    _,_,stats,_=cv2.connectedComponentsWithStats(mask)
    height,width=mask.shape
    components=[(int(x),int(y),int(w),int(h),int(a)) for x,y,w,h,a in stats[1:]
                if a>=5 and not(w>width*.9 and h>height*.9)]
    tall=[p for p in components if p[3]>=20 and p[2]>=3]
    if not tall:
        return None
    reference=max(p[3] for p in tall)
    digits=[p for p in tall if p[3]>=reference*.7]
    if not digits or len(digits)>10:
        return None
    middle=np.median([y+h/2 for _,y,_,h,_ in digits])
    if any(abs(y+h/2-middle)>reference*.2 for _,y,_,h,_ in digits):
        return None  # multiple display rows
    top=min(p[1] for p in digits)
    left=min(p[0] for p in digits)
    right=max(p[0]+p[2] for p in digits)
    if any(x==0 and x<left and h<reference*.25
           and abs(y+h/2-middle)<reference*.2 for x,y,w,h,_ in components):
        return None  # a crop-edge minus fragment must not become a positive row
    result=[]
    for x,y,w,h,_ in components:
        if h>=reference*.7:
            char=_digit(mask[y:y+h,x:x+w].astype(np.float32)/255)
            if char is None:
                return None
            result.append((x+w/2,char))
        elif h<reference*.22 and w<reference*.22 and y+h/2>top+reference*.75 and left-10<x<right+reference*.3:
            result.append((x+w/2,'.'))
        elif h<reference*.22 and w>reference*.25 and x<left and abs(y+h/2-middle)<reference*.15:
            result.append((x+w/2,'-'))
        elif h>reference*.3 and abs(y+h/2-middle)<reference*.5:
            return None  # incomplete/broken digit cannot be ignored
    result.sort()
    text=''.join(char for _,char in result)
    return text if re.fullmatch(r'-?\d+(?:\.\d+)?',text) else None


def read_digital(data,profile):
    image=cv2.imdecode(np.frombuffer(data,dtype=np.uint8),cv2.IMREAD_COLOR)
    gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
    # Avoid huge analysis allocations; native crop already preserves tiny digits.
    if max(gray.shape)>1600:
        factor=1600/max(gray.shape)
        gray=cv2.resize(gray,None,fx=factor,fy=factor,interpolation=cv2.INTER_AREA)
        image=cv2.resize(image,(gray.shape[1],gray.shape[0]),interpolation=cv2.INTER_AREA)
    hsv=cv2.cvtColor(image,cv2.COLOR_BGR2HSV)
    green_status=(hsv[:,:,0]>=30)&(hsv[:,:,0]<=95)&(hsv[:,:,1]>90)&(hsv[:,:,2]>90)
    variants=[];issues=set()
    for name,view in [('otsu',gray),('clahe-otsu',cv2.createCLAHE(clipLimit=2.,tileGridSize=(8,8)).apply(gray))]:
        _,mask=cv2.threshold(view,0,255,cv2.THRESH_BINARY+cv2.THRESH_OTSU)
        border=np.concatenate([mask[0,:],mask[-1,:],mask[:,0],mask[:,-1]])
        if border.mean()>127:
            mask=cv2.bitwise_not(mask)
            mask[green_status]=0  # coloured status marks are not dark LCD glyphs
            issue=_original_damage(mask)
            if issue:issues.add(issue)
        variants.append({'name':name,'raw_text':_tokens(mask)})
    texts=[item['raw_text'] for item in variants]
    reason='Segmen/desimal tidak lengkap, beberapa baris, atau preprocessing tidak sepakat; periksa crop atau foto ulang.'
    accepted=False
    raw=texts[0] or ''
    value=None
    if all(texts) and len(set(texts))==1:
        decimal=Decimal(raw)
        fraction=len(raw.partition('.')[2])
        if fraction==profile.decimals and Decimal(str(profile.minimum))<=decimal<=Decimal(str(profile.maximum)):
            accepted=True; value=float(decimal)
            reason='Seven segment lokal konsisten pada dua preprocessing; satuan berasal dari profil alat.'
        else:
            reason='Jumlah desimal/rentang tidak sesuai profil; titik tidak direkonstruksi dari dugaan.'
    candidate=Candidate(readable=accepted,kind='digital',value=value,unit=profile.unit,raw_text=raw,reason=reason)
    return {'accepted':accepted,'candidate':candidate.model_dump(),'variants':variants,'unit_source':'profile',
            'method':VERSION,'probability_correct':None,'original_pixels_incomplete':bool(issues),'original_pixel_issues':sorted(issues)}
