"""Local numeric recognition with explicit decimal evidence; no unit inference."""
from decimal import Decimal
from copy import deepcopy
from hashlib import sha256
import math
import re

import cv2
import numpy as np

from .digital_ocr import read_digital, _digit, PATTERNS
from .hybrid_display import display_candidates,rectify_display,numeric_line_crop,numeric_line_crops,lcd_decimal_evidence,lcd_point_corroborated,lcd_decimal_observation,green_punctuation,green_leading_evidence,_green_row_evidence
from .text_digital import read_text_digital
from .segment_reader import decode_lcd_line

VISIBLE_UNIT=re.compile(r'(?<![A-Za-z])(?:mpa|kpa|psi|inch|bar|mm|cm|pa|in)(?![A-Za-z])',re.IGNORECASE)


def led_tokens(mask):
    """Group separated LED strokes by columns, retaining isolated decimal dots.

    Sampling the centre of each segment avoids counting the slanted vertical
    stroke ends as a top/bottom/middle bar. Ambiguous occupancy abstains.
    """
    _,_,stats,_=cv2.connectedComponentsWithStats(mask)
    tall=[s for s in stats[1:] if s[3]>mask.shape[0]*.2 and s[4]>20]
    if not tall: return None
    top=min(s[1] for s in tall); bottom=max(s[1]+s[3] for s in tall); reference=bottom-top
    work=mask.copy(); dots=[]; signs=[]
    for x,y,w,h,area in stats[1:]:
        if h<reference*.15 and w<reference*.15 and .6<w/h<1.6 and bottom-reference*.15<y<bottom and area>reference*.1:
            dots.append((float(x+w/2),'.')); work[y:y+h,x:x+w]=0
        elif h<reference*.15 and w>reference*.25 and x+w<min(s[0] for s in tall) and abs(y+h/2-(top+bottom)/2)<reference*.15:
            signs.append((float(x+w/2),'-')); work[y:y+h,x:x+w]=0
    # Smaller OUT/MPa text below the digit row cannot become a second number.
    work=work[:bottom+3]
    active=(work>0).sum(axis=0)>max(3,reference*.025)
    ranges=[]; begin=None
    for x in range(len(active)+1):
        if x<len(active) and active[x] and begin is None: begin=x
        if (x==len(active) or not active[x]) and begin is not None:
            if x-begin>reference*.025: ranges.append((begin,x))
            begin=None
    if not 1<=len(ranges)<=10: return None
    tokens=[]
    samples=[(.30,.015,.70,.12),(.73,.18,.99,.36),(.72,.62,.98,.80),(.27,.88,.67,.995),
             (0,.60,.28,.78),(.02,.18,.28,.36),(.32,.45,.68,.55)]
    for left,right in ranges:
        yy,_=np.where(work[:,left:right]>0)
        if not len(yy): return None
        patch=work[int(yy.min()):int(yy.max()+1),left:right].astype(np.float32)/255
        h,w=patch.shape
        if h<reference*.65: return None
        if w/h<.25: char=_digit(patch)
        else:
            scores=[float(patch[int(y*h):max(int(y2*h),int(y*h)+1),int(x*w):max(int(x2*w),int(x*w)+1)].mean()) for x,y,x2,y2 in samples]
            if any(.12<s<.35 for s in scores): return None
            char=PATTERNS.get(''.join('1' if s>=.35 else '0' for s in scores))
        if char is None: return None
        tokens.append(((left+right)/2,char))
    # A sign must lead the row and the decimal must fall within digit bounds.
    if any(x>=ranges[0][0] for x,_ in signs) or len(dots)>1 or len(signs)>1: return None
    tokens+=signs+[p for p in dots if ranges[0][0]<p[0]<ranges[-1][1]+reference*.15]
    tokens.sort()
    text=''.join(c for _,c in tokens)
    return text if re.fullmatch(r'-?\d+(?:\.\d+)?',text) else None


def _safe_result(result,profile):
    candidate=result.get('candidate',{})
    raw=candidate.get('raw_text','')
    value=candidate.get('value')
    return bool(result.get('accepted') and candidate.get('readable') and value is not None
        and isinstance(value,(float,int)) and math.isfinite(value)
        and re.fullmatch(r'-?\d+(?:\.\d+)?',raw)
        and len(raw.partition('.')[2])==profile.decimals
        and Decimal(str(value))==Decimal(raw)
        and Decimal(str(profile.minimum))<=Decimal(raw)<=Decimal(str(profile.maximum))
        and candidate.get('unit','').strip().casefold()==profile.unit.strip().casefold())


def led_grid_tokens(mask):
    """Use the observed shared row height for disconnected/faded LED bars.

    Bounding each partial digit independently stretches a missing bottom bar
    into a different digit. The neighbouring caps establish the row's band;
    no segment, decimal or sign is drawn or reconstructed here.
    """
    _,_,stats,_=cv2.connectedComponentsWithStats(mask)
    parts=stats[1:]
    tall=[s for s in parts if s[3]>mask.shape[0]*.2 and s[4]>20]
    if not tall:return None
    top=min(s[1] for s in tall);bottom=max(s[1]+s[3] for s in tall);reference=bottom-top
    caps=[s for s in parts if s[2]>reference*.15 and s[2]/s[3]>1.6 and s[3]<reference*.22
          and s[1]+s[3]>top-reference*.03 and s[1]<bottom+reference*.03]
    top=min([top]+[s[1] for s in caps]);bottom=max([bottom]+[s[1]+s[3] for s in caps]);reference=bottom-top
    work=mask.copy();dots=[];signs=[]
    leftmost=min(s[0] for s in tall)
    for x,y,w,h,area in parts:
        if h<reference*.15 and w<reference*.15 and .6<w/h<1.6 and bottom-reference*.15<y<bottom and area>reference*.1:
            dots.append((float(x+w/2),'.'));work[y:y+h,x:x+w]=0
        elif h<reference*.15 and w>reference*.25 and x+w<leftmost and abs(y+h/2-(top+bottom)/2)<reference*.15:
            signs.append((float(x+w/2),'-'));work[y:y+h,x:x+w]=0
    work=work[top:bottom+1]
    active=(work>0).sum(axis=0)>max(3,reference*.025)
    ranges=[];start=None
    for x in range(len(active)+1):
        if x<len(active) and active[x] and start is None:start=x
        if (x==len(active) or not active[x]) and start is not None:
            if x-start>reference*.025:ranges.append((start,x))
            start=None
    if not 1<=len(ranges)<=10 or len(dots)>1 or len(signs)>1:return None
    samples=[(.30,.015,.70,.12),(.73,.18,.99,.36),(.72,.62,.98,.80),(.27,.88,.67,.995),
             (0,.60,.28,.78),(.02,.18,.28,.36),(.32,.45,.68,.55)]
    result=[]
    for left,right in ranges:
        patch=work[:,left:right].astype(np.float32)/255;h,w=patch.shape
        if w/h<.25:char=_digit(patch)
        else:
            scores=[float(patch[int(y*h):max(int(y2*h),int(y*h)+1),int(x*w):max(int(x2*w),int(x*w)+1)].mean()) for x,y,x2,y2 in samples]
            if any(.12<s<.35 for s in scores):return None
            char=PATTERNS.get(''.join('1' if s>=.35 else '0' for s in scores))
        if char is None:return None
        result.append(((left+right)/2,char))
    if any(x>=ranges[0][0] for x,_ in signs):return None
    result+=signs+[p for p in dots if ranges[0][0]<p[0]<ranges[-1][1]+reference*.15]
    result.sort();raw=''.join(char for _,char in result)
    return raw if re.fullmatch(r'-?\d+(?:\.\d+)?',raw) else None


class _OfflineReader:
    def __init__(self,reader):
        self.reader=reader
        self.outputs={}
    def read(self,data):
        key=sha256(data).digest()
        if key not in self.outputs:
            output=self.reader.read_offline(data) if hasattr(self.reader,'read_offline') else self.reader.read(data)
            if len(self.outputs)<16:self.outputs[key]=deepcopy(output)
            else:return output
        return deepcopy(self.outputs[key])

    def read_upright(self,data):
        # Separate cache namespace: normal label OCR must retain its classifier.
        key=('upright',sha256(data).digest())
        if key not in self.outputs:
            output=self.reader.read_upright(data) if hasattr(self.reader,'read_upright') else self.read(data)
            if len(self.outputs)<16:self.outputs[key]=deepcopy(output)
            else:return output
        return deepcopy(self.outputs[key])

    def read_line(self,image):
        # LocalTextOCR owns the lock and initialized, already-installed weights.
        # Recognition-only bypasses a detector that misses disconnected LCD bars.
        reader=self.reader;seen=set()
        while hasattr(reader,'reader') and id(reader) not in seen:
            seen.add(id(reader));reader=reader.reader
        if not hasattr(reader,'read_offline') or getattr(reader,'engine',None) is None or not hasattr(reader,'lock'):
            return None
        with reader.lock:
            engine=reader.engine;flags=(engine.use_det,engine.use_cls,engine.use_rec)
            try:
                output=engine(image,use_det=False,use_cls=False,use_rec=True)
                if output.txts is None or output.scores is None or len(output.txts)!=1:return None
                return {'raw_text':output.txts[0].strip().replace('−','-'),'ocr_score':float(output.scores[0])}
            except Exception:
                return None
            finally:
                engine.update_params(use_det=flags[0],use_cls=flags[1],use_rec=flags[2])


def _lcd_point_matches(raw,rows):
    """Validate OCR digit count and decimal position against the whole LCD row."""
    supported=[(lcd_decimal_evidence(row),row) for row in rows if lcd_point_corroborated(row,rows)]
    if not supported:return False
    count=max(e['digits'] for e,_ in supported)
    supported=[(e,row) for e,row in supported if e['digits']==count]
    if len({e['index'] for e,_ in supported})!=1:return False
    digits=raw.lstrip('-').replace('.','')
    return bool('.' in raw and len(digits)==count
        and len(raw.partition('.')[0].lstrip('-'))==supported[0][0]['index']
        and any(row['minus_signs']==int(raw.startswith('-')) for _,row in supported))


def _read_lcd_line(image,profile,ocr):
    readings=[];rows=numeric_line_crops(image)
    for line in rows:
        outputs=[ocr.read_line(line[key]) for key in ('image','normalized')]
        if not all(outputs):continue
        texts=[output['raw_text'] for output in outputs]
        if len(set(texts))!=1 or min(output['ocr_score'] for output in outputs)<.97:continue
        raw=texts[0]
        if not re.fullmatch(r'-?\d+(?:\.\d+)?',raw):continue
        if line['minus_signs']!=int(raw.startswith('-')):continue
        evidence=lcd_decimal_evidence(line)
        if '.' not in raw and evidence and len(raw.lstrip('-'))==evidence['digits']:
            digits=raw.lstrip('-');index=evidence['index']
            raw=('-' if raw.startswith('-') else '')+digits[:index]+'.'+digits[index:]
        if '.' in raw:
            if not _lcd_point_matches(raw,rows):continue
            readings.append((raw,line,outputs))
        elif profile.decimals==0 and line['decimal_dots']==0 and not any(lcd_decimal_evidence(r) for r in rows):
            readings.append((raw,line,outputs))
    if not readings or len({r[0] for r in readings})!=1:return None
    raw,line,outputs=readings[0]
    result={'accepted':True,'method':'local-lcd-line-v1','probability_correct':None,'unit_source':'profile',
            'variants':[{'name':name,**output} for name,output in zip(('visible-lcd-row','illumination-normalized'),outputs)],
            'candidate':{'readable':True,'kind':'digital','value':float(Decimal(raw)),'unit':profile.unit,
                         'raw_text':raw,'reason':'Digit OCR lokal sepakat pada dua preprocessing; posisi titik diukur di antara digit pada piksel, satuan dari profil.'},
            'numeric_row':line['roi'],'lcd_point_verified':'.' in raw}
    return result if _safe_result(result,profile) else None


def _read_view(data,profile,text_ocr=None,*,lcd_line=False,glass_margin=False,upright_ocr=False):
    result=read_digital(data,profile)
    if glass_margin and result.get('original_pixel_issues')==['crop_edge_mark']:
        # The source crop extends beyond a fully measured LCD window. Its far
        # left crop edge is housing/annotation, not an edge of the digit glass.
        result['original_pixels_incomplete']=False
    image=cv2.imdecode(np.frombuffer(data,np.uint8),cv2.IMREAD_COLOR)
    hsv=cv2.cvtColor(image,cv2.COLOR_BGR2HSV)
    green_mask=(((hsv[:,:,0]>=30)&(hsv[:,:,0]<=95)&(hsv[:,:,1]>50)&(hsv[:,:,2]>65)).astype(np.uint8)*255)
    legacy_valid=_safe_result(result,profile) and not result.get('original_pixels_incomplete')
    # A global threshold can erase a faded complete edge digit. Before accepting
    # even a safe-looking raw row, compare measured local-lighting alternatives.
    lcd_possible=lcd_line or (profile.kind=='digital' and not _green_row_evidence(green_mask,minimum_digits=2))
    if lcd_possible or (legacy_valid and not _green_row_evidence(green_mask,minimum_digits=2)):
        lines=[(line,decode_lcd_line(line['image'])) for line in numeric_line_crops(image)]
        usable=[(line,r) for line,r in lines if r is not None]
        segmented=None
        raws={r['raw_text'] for _,r in usable}
        if len(raws)>1 or (legacy_valid and raws and raws!={result['candidate']['raw_text']}):
            result['local_pixels_disagree']=True
            return _reject(result,'Preprocessing cahaya menemukan digit berbeda; periksa seluruh display, jangan hanya bagian angka yang paling gelap.')
        if usable:
            line,segmented=usable[0]
        if segmented:
            raw=segmented['raw_text']
            pixel_result={'accepted':True,'method':segmented['method'],'probability_correct':None,
                'variants':segmented['variants'],'unit_source':'profile','numeric_row':line['roi'],
                'candidate':{'readable':True,'kind':'digital','value':float(Decimal(raw)),
                    'unit':profile.unit,'raw_text':raw,
                    'reason':'Pola seven-segment LCD dibaca dari piksel setelah koreksi cahaya/slant; dua threshold sepakat termasuk titik dan tanda.'}}
            if _safe_result(pixel_result,profile) and not result.get('original_pixels_incomplete'):return pixel_result
    if legacy_valid:return result
    result.update(accepted=False)
    result['candidate'].update(readable=False,value=None)
    # Two green LED masks must agree. Neither inserts a missing decimal point.
    variants=[]
    for saturation,brightness in ((80,150),(90,170)):
        mask=(((hsv[:,:,0]>=30)&(hsv[:,:,0]<=95)&(hsv[:,:,1]>saturation)&(hsv[:,:,2]>brightness)).astype(np.uint8)*255)
        variants.append(led_tokens(mask))
    if all(variants) and len(set(variants))==1:
        raw=variants[0]
        if (re.fullmatch(r'-?\d+(?:\.\d+)?',raw) and len(raw.partition('.')[2])==profile.decimals
                and Decimal(str(profile.minimum))<=Decimal(raw)<=Decimal(str(profile.maximum))):
            return {'accepted':True,'method':'hybrid-green-seven-segment-v0.1','probability_correct':None,
                    'variants':[{'name':'green-mask','raw_text':text} for text in variants],
                    'candidate':{'readable':True,'kind':'digital','value':float(Decimal(raw)),'unit':profile.unit,
                                 'raw_text':raw,'reason':'Segmen hijau dan titik desimal sepakat pada dua mask lokal.'}}
    # A second decoder uses common row geometry and visible lower-luminance
    # bars. Both chroma masks must agree; partial patterns still abstain.
    grid=[]
    for saturation in (65,90):
        mask=(((hsv[:,:,0]>=30)&(hsv[:,:,0]<=95)&(hsv[:,:,1]>saturation)&(hsv[:,:,2]>125)).astype(np.uint8)*255)
        grid.append(led_grid_tokens(mask))
    if all(grid) and len(set(grid))==1:
        raw=grid[0]
        result_grid={'accepted':True,'method':'hybrid-green-row-grid-v1','probability_correct':None,
            'variants':[{'name':'shared-row-green-mask','raw_text':text} for text in grid],
            'candidate':{'readable':True,'kind':'digital','value':float(Decimal(raw)),'unit':profile.unit,'raw_text':raw,
                         'reason':'Tinggi baris segmen diukur bersama; dua mask warna sepakat, titik/tanda tetap diperiksa pada piksel asli.'}}
        if _safe_result(result_grid,profile):return result_grid
    if result.get('original_pixels_incomplete'):
        return _reject(result,'Digit/tanda pada tepi atau bagian baris tidak lengkap; sertakan seluruh display sebelum membaca.')
    if text_ocr:
        if lcd_possible and hasattr(text_ocr,'read_line'):
            # Initialize installed offline weights and cache the original unit
            # evidence before attempting recognition-only on the numeric row.
            text_ocr.read(data)
            line=_read_lcd_line(image,profile,text_ocr)
            if line:return line
        text=read_text_digital(data,profile.model_copy(update={'kind':'digital'}),text_ocr,upright=upright_ocr)
        if _safe_result(text,profile):
            raw=text['candidate']['raw_text']
            if lcd_possible:
                rows=numeric_line_crops(image)
                needs_point='.' in raw or profile.decimals>0
                if (needs_point and not _lcd_point_matches(raw,rows)) or (not needs_point and any(lcd_decimal_evidence(r) for r in rows)):
                    return _reject(result,'Posisi titik/jumlah digit pada piksel LCD tidak cocok dengan OCR; periksa crop lengkap atau input manual.')
                text['lcd_point_verified']=bool(needs_point)
            return text
        result['text_fallback']=text
    return result


def _reject(result,reason):
    result.update(accepted=False)
    result['candidate'].update(readable=False,value=None,raw_text='',reason=reason)
    return result


def _exclude_display_captions(candidates, output):
    """Remove measured proposals for OCR-confirmed unit/output captions only.

    Numeric rows stay separate even when small. A caption must occupy most of
    its own candidate, so an MPa word below a larger number cannot erase it.
    """
    labels=[]
    for span in output.get('spans',[]):
        text=span.get('text','').strip()
        if span.get('ocr_score',0)<.9:continue
        if not (VISIBLE_UNIT.fullmatch(text) or re.fullmatch(r'OUT[ ._-]*[12]',text,re.IGNORECASE)):continue
        roi=span.get('roi',{})
        if not all(key in roi for key in ('x','y','width','height')):continue
        labels.append((text,roi))
    kept=[];ignored=[]
    for candidate in candidates:
        x,y,w,h=candidate['box'];area=w*h
        caption=None
        for text,roi in labels:
            sx,sy,sw,sh=(roi[k] for k in ('x','y','width','height'))
            intersection=max(0,min(x+w,sx+sw)-max(x,sx))*max(0,min(y+h,sy+sh)-max(y,sy))
            if area>0 and intersection/area>.55 and .5<sw*sh/area<2.:
                caption=text;break
        if caption:ignored.append({'text':caption,'box':candidate['box']})
        else:kept.append(candidate)
    return kept,ignored


def read_local_digital(data,profile,text_ocr=None):
    """Read one local display, retaining all measured punctuation and unit checks."""
    image=cv2.imdecode(np.frombuffer(data,np.uint8),cv2.IMREAD_COLOR)
    candidates=display_candidates(image)
    ocr=(text_ocr if isinstance(text_ocr,_OfflineReader) else _OfflineReader(text_ocr)) if text_ocr else None
    ignored=[]
    if len(candidates)>1 and ocr:
        candidates,ignored=_exclude_display_captions(candidates,ocr.read(data))
    if len(candidates)>1:
        result={'accepted':False,'candidate':{'readable':False,'kind':'digital','value':None,
            'unit':profile.unit,'raw_text':'','reason':'Beberapa display terlihat; pilih crop satu display secara manual.'},
            'method':'hybrid-display-cv-v1','probability_correct':None,'variants':[],'unit_source':'profile',
            'display_count':len(candidates),'display_bounds':candidates,'ignored_display_labels':ignored}
        return result
    # Green-tinted reflective LCD glass is not a luminous green LED row. When
    # no housing was located, require independent dark-digit/point geometry
    # before allowing the LCD fallback. Explicit LED detections keep LED rules.
    lcd_hint=bool(candidates and candidates[0]['display_type']=='lcd')
    if not candidates:
        hsv=cv2.cvtColor(image,cv2.COLOR_BGR2HSV)
        green_mask=(((hsv[:,:,0]>=30)&(hsv[:,:,0]<=95)&(hsv[:,:,1]>50)&(hsv[:,:,2]>65)).astype(np.uint8)*255)
        # Ordinary LCDs already enter the line reader. Spend the extra geometry
        # work only when tint would otherwise misclassify this crop as LED.
        if _green_row_evidence(green_mask,minimum_digits=2):
            lcd_hint=lcd_decimal_observation(image) is not None
    views=[('original',data)]
    if candidates:
        quad=np.asarray(candidates[0]['quad'])
        if candidates[0]['display_type']=='lcd':
            tight=rectify_display(image,quad)
            if tight is not None:
                ok,measured=cv2.imencode('.png',tight)
                if ok:views.append(('measured-glass',measured.tobytes()))
                ph,pw=tight.shape[:2];pad=max(1,round(min(ph,pw)*.02))
                ok,encoded=cv2.imencode('.png',tight[pad:ph-pad,pad:pw-pad])
                if ok:views.append(('rectified-glass',encoded.tobytes()))
            # Keep a measured margin beyond the glass contour: a reflection can
            # move a threshold boundary through a faint dot or bottom stroke.
            centre=quad.mean(axis=0);quad=centre+(quad-centre)*1.18
        patch=rectify_display(image,quad)
        if patch is not None:
            ok,encoded=cv2.imencode('.png',patch)
            if ok:views.append(('rectified-display',encoded.tobytes()))
    attempts=[]
    glass_margin=bool(candidates and candidates[0]['display_type']=='lcd'
        and min(p[0] for p in candidates[0]['quad'])>1/image.shape[1])
    for name,view in views:
        result=_read_view(view,profile,None,lcd_line=lcd_hint,glass_margin=glass_margin and name=='original')
        attempts.append((name,result))
    valid=[(name,result) for name,result in attempts if _safe_result(result,profile)]
    # Segment readers run first across measured views. General text recognition
    # is needed only when the pixel decoders abstain, reducing repeated OCR.
    if not valid and ocr:
        attempts=[]
        for name,view in views:
            result=_read_view(view,profile,ocr,lcd_line=lcd_hint,glass_margin=glass_margin and name=='original',
                              upright_ocr=bool(name=='rectified-display' and candidates and candidates[0]['display_type']=='green-led'))
            attempts.append((name,result))
        valid=[(name,result) for name,result in attempts if _safe_result(result,profile)]
    result=valid[0][1] if valid else attempts[-1][1]
    result.update(display_count=len(candidates),display_bounds=candidates,ignored_display_labels=ignored,
                  display_attempts=[{'view':name,'accepted':_safe_result(item,profile),
                                     'raw_text':item.get('candidate',{}).get('raw_text',''),
                                     'method':item.get('method')} for name,item in attempts])
    if len({item['candidate']['raw_text'] for _,item in valid})>1:
        return _reject(result,'Crop asli dan display terkoreksi memberikan angka berbeda; periksa digit/desimal secara manual.')
    if valid:
        quad=candidates[0].get('digit_quad',candidates[0]['quad']) if candidates else [[0,0],[1,0],[1,1],[0,1]]
        evidence=green_punctuation(image,quad)
        hsv=cv2.cvtColor(image,cv2.COLOR_BGR2HSV)
        green_mask=(((hsv[:,:,0]>=30)&(hsv[:,:,0]<=95)&(hsv[:,:,1]>50)&(hsv[:,:,2]>65)).astype(np.uint8)*255)
        is_green=(bool(candidates and candidates[0]['display_type']=='green-led')
                  or result.get('method','').startswith('hybrid-green-')
                  or (not lcd_hint
                      and _green_row_evidence(green_mask,minimum_digits=2)))
    if valid and is_green:
        result['green_punctuation']=evidence
        raw=result['candidate']['raw_text'];sign=int(raw.startswith('-'));dot=int('.' in raw)
        leading=green_leading_evidence(image,quad)
        result['green_leading_evidence']=leading
        # A rectified-only success cannot discard a sign present in the original
        # pixels, even when the signed value lies outside the profile's range.
        # Glow can merge a real dot into its neighbour at a low threshold;
        # faint dots can vanish at a high threshold. Two distinct masks must
        # explicitly see the same dot count. Extra dots, a conflicting sign or
        # clipping remain a veto on every usable mask, including dim fallback.
        matching_dots=sum(item is not None and item['decimal_dots']==dot for item in evidence)
        # Unavailable independent leading evidence is not evidence of no minus.
        # Tinted glass can merge a dim sign into the background mask.
        if (leading is None or leading['minus_signs']!=sign or leading['clipped_leading_mark']
                or any(item is not None and (item['minus_signs']!=sign or item['clipped_leading_mark'] or item['decimal_dots']>dot) for item in evidence)
                or matching_dots<2):
            return _reject(result,'Tanda minus/titik pada piksel asli tidak lengkap atau berbeda dari crop terkoreksi; pilih crop lengkap atau foto ulang.')
    if valid and not is_green and any(name=='original' and item.get('original_pixels_incomplete') for name,item in attempts):
        return _reject(result,'Digit/tanda pada foto asli tidak lengkap; crop terkoreksi/OCR tidak boleh membuangnya.')
    if valid and not is_green and any(item.get('local_pixels_disagree') for _,item in attempts):
        return _reject(result,'Preprocessing/crop memberikan digit berbeda; periksa angka lengkap secara manual atau foto ulang.')
    if valid and ocr:
        # Visible units contradicting the registered profile block every reader,
        # including a successful seven-segment result.
        for _,view in views:
            output=ocr.read(view)
            units={match.group().casefold() for span in output.get('spans',[])
                   for match in VISIBLE_UNIT.finditer(span.get('text',''))}
            if units and units!={profile.unit.strip().casefold()}:
                return _reject(result,'Satuan yang terlihat bertentangan dengan profil alat terdaftar; pilih profil yang benar.')
    if valid:result['rectification_used']=any(name.startswith(('rectified-','measured-')) for name,_ in valid)
    return result
