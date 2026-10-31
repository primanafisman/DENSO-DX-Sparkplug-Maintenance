"""OpenCV display bounds. Geometry locates pixels; it never supplies a value.

LCD candidates require a lighter rectangular window in a dark bezel and a
single row of tall dark marks. LED candidates require a row of green strokes.
All coordinates are normalized to the input image, including quadrilaterals.
"""
import re
import math
import cv2
import numpy as np
from .segment_reader import decode_lcd_line
from .images import crop_image
from .models import ROI


def _ordered(points):
    points=np.asarray(points,np.float32).reshape(4,2)
    order=np.argsort(points[:,0])
    left=points[order[:2]];right=points[order[2:]]
    return np.array([left[np.argmin(left[:,1])],right[np.argmin(right[:,1])],
                     right[np.argmax(right[:,1])],left[np.argmax(left[:,1])]],np.float32)


def rectify_display(image,quad):
    """Map the observed four display corners to an upright pixel rectangle."""
    h,w=image.shape[:2]
    points=_ordered(np.asarray(quad)*[w,h])
    width=round(max(np.linalg.norm(points[1]-points[0]),np.linalg.norm(points[2]-points[3])))
    height=round(max(np.linalg.norm(points[3]-points[0]),np.linalg.norm(points[2]-points[1])))
    if width<24 or height<18:return None
    # A pixel limit protects analysis allocations without changing aspect ratio.
    scale=min(1.,1600/max(width,height));width=max(24,round(width*scale));height=max(18,round(height*scale))
    target=np.float32([[0,0],[width-1,0],[width-1,height-1],[0,height-1]])
    matrix=cv2.getPerspectiveTransform(points,target)
    return cv2.warpPerspective(image,matrix,(width,height),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE)


def _row_evidence(mask):
    h,w=mask.shape
    mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    _,_,stats,_=cv2.connectedComponentsWithStats(mask)
    marks=[s for s in stats[1:] if h*.35<s[3]<h*.98 and s[4]>max(8,h*.4)
           and .08<s[2]/s[3]<1.1 and s[2]<w*.65]
    if len(marks)<2:return False
    reference=max(s[3] for s in marks)
    marks=[s for s in marks if s[3]>reference*.68]
    if len(marks)<2:return False
    centres=[s[1]+s[3]/2 for s in marks]
    return max(centres)-min(centres)<reference*.28


def _overlap(a,b):
    ax,ay,aw,ah=a;bx,by,bw,bh=b
    area=max(0,min(ax+aw,bx+bw)-max(ax,bx))*max(0,min(ay+ah,by+bh)-max(ay,by))
    return area/max(min(aw*ah,bw*bh),1e-9)


def _green_row_evidence(mask,minimum_digits=3):
    # Disconnected LED bars are intentional; evaluate digit-width columns over
    # the full tall-stroke band instead of demanding connected characters.
    h,w=mask.shape
    _,_,stats,_=cv2.connectedComponentsWithStats(mask)
    tall=[s for s in stats[1:] if s[3]>h*.2 and s[4]>20]
    if not tall:return False
    top=min(s[1] for s in tall);bottom=max(s[1]+s[3] for s in tall);reference=bottom-top
    active=(mask[top:bottom]>0).sum(axis=0)>max(3,reference*.08)
    runs=[];start=None
    for x in range(w+1):
        if x<w and active[x] and start is None:start=x
        if (x==w or not active[x]) and start is not None:
            # Adjacent slanted digit projections can overlap at thumbnail size.
            # Keep that measured wider run; actual recognition still abstains
            # unless complete digit masks agree at the native crop resolution.
            if reference*.09<x-start<reference*1.3:runs.append((start,x))
            start=None
    return minimum_digits<=len(runs)<=10 and .04<np.mean(mask[top:bottom]>0)<.55


def _row_punctuation(mask,points):
    """Measure punctuation in the original pixels in the digit row's plane."""
    points=_ordered(points)
    cw=float(np.linalg.norm(points[1]-points[0]));ch=float(np.linalg.norm(points[3]-points[0]))
    if min(cw,ch)<12:return None
    target=np.float32([[0,0],[cw,0],[cw,ch],[0,ch]])
    matrix=cv2.getPerspectiveTransform(points,target)
    _,labels,stats,_=cv2.connectedComponentsWithStats(mask)
    parts=[]
    for index,(sx,sy,sw,sh,area) in enumerate(stats[1:],1):
        if area<max(3,ch*.04):continue
        # Project measured row endpoints rather than every foreground pixel.
        # A homography is monotonic along each row if it has no pole there;
        # these actual endpoints preserve its extrema with O(height) points.
        # Projecting boxes inflates tilted glyphs, while projecting all pixels
        # of a green background could allocate over 1 GiB on a large photo.
        component=labels[sy:sy+sh,sx:sx+sw]==index
        yy=np.flatnonzero(component.any(axis=1))
        left=component.argmax(axis=1)[yy]
        right=sw-1-component[:,::-1].argmax(axis=1)[yy]
        pixels=np.concatenate((np.column_stack((left+sx,yy+sy)),
                               np.column_stack((right+sx,yy+sy)))).astype(np.float32)
        denominator=pixels@matrix[2,:2]+matrix[2,2]
        if np.any(np.abs(denominator)<1e-8) or np.any(denominator[:len(yy)]*denominator[len(yy):]<=0):continue
        projected=cv2.perspectiveTransform(pixels[None],matrix)[0]
        x,y=projected.min(axis=0);x2,y2=projected.max(axis=0)
        x2+=1;y2+=1
        if x2<-ch*2 or x>cw+ch*.2 or y2<-ch*.3 or y>ch*1.4:continue
        parts.append({'x':float(x),'y':float(y),'right':float(x2),'bottom':float(y2),
                      'width':float(x2-x),'height':float(y2-y),'area':int(area),
                      'clipped':sx==0 or sx+sw>=mask.shape[1] or sy==0 or sy+sh>=mask.shape[0]})
    tall=[p for p in parts if ch*.2<p['height']<ch*1.4 and p['width']<ch*1.2
          and 0<=p['x']+p['width']/2<=cw and p['bottom']>0 and p['y']<ch
          and p['y']+p['height']/2<ch*.85]
    if not tall:return None
    top=min(p['y'] for p in tall);bottom=max(p['bottom'] for p in tall);reference=bottom-top
    left=min(p['x'] for p in tall);right=max(p['right'] for p in tall);middle=(top+bottom)/2
    leading=[p for p in parts if p['height']<reference*.22 and p['area']>reference*.05
             and left-reference*2<p['x'] and left-reference*1.3<p['right']<left+reference*.06
             and abs(p['y']+p['height']/2-middle)<reference*.2]
    signs=[p for p in leading if reference*.2<p['width']<reference*1.2
           and p['height']<p['width']*.6]
    dots=[p for p in parts if reference*.035<p['height']<reference*.15 and reference*.035<p['width']<reference*.15
          and p['height']>0 and .6<p['width']/p['height']<1.6
          and p['area']>reference*.25 and p['area']/(p['width']*p['height'])>.45
          and left-reference*.3<p['x']+p['width']/2<right+reference*.15
          and bottom-reference*.15<p['y'] and p['y']+p['height']/2<bottom+reference*.04]
    # Add the actually measured sign extent. Padding a digit-only rectangle is
    # insufficient for a sign before a narrow leading "1".
    measured_left=min([0.]+[p['x'] for p in signs]+[p['x'] for p in dots])
    measured_top=min([0.]+[p['y'] for p in dots])
    measured_bottom=max([ch]+[p['bottom'] for p in dots])
    extended=np.float32([[measured_left,measured_top],[cw,measured_top],
                         [cw,measured_bottom],[measured_left,measured_bottom]])
    expanded=cv2.perspectiveTransform(extended[None],np.linalg.inv(matrix))[0]
    return {'minus_signs':len(signs),'decimal_dots':len(dots),
            'decimal_positions':[float((p['x']+p['width']/2-left)/reference) for p in dots],
            # A threshold can merge the leading glyph and move the inferred
            # row's left edge. Agreement must use the fixed observed quad.
            'decimal_row_positions':[float((p['x']+p['width']/2)/ch) for p in dots],
            'clipped_leading_mark':any(p['clipped'] for p in leading+dots),'expanded_quad':expanded}


def green_punctuation(image,quad):
    """Independent sign/dot evidence from full-resolution original pixels."""
    h,w=image.shape[:2];points=np.asarray(quad,np.float32)*[w,h]
    hsv=cv2.cvtColor(image,cv2.COLOR_BGR2HSV);evidence=[]
    for saturation,brightness in ((65,110),(80,125),(80,150),(90,170)):
        mask=(((hsv[:,:,0]>=30)&(hsv[:,:,0]<=95)&(hsv[:,:,1]>saturation)&(hsv[:,:,2]>brightness)).astype(np.uint8)*255)
        measured=_row_punctuation(mask,points)
        evidence.append(None if measured is None else {**{key:value for key,value in measured.items() if key!='expanded_quad'},
                                                        'brightness_threshold':brightness})
    # A genuinely faint leading point can be below every bright digit mask.
    # Spend two lower-threshold measurements only when the original masks do
    # not already provide two point witnesses; no point is inserted here.
    if sum(item is not None and item['decimal_dots']==1 for item in evidence)<2:
        for saturation,brightness in ((45,80),(50,95)):
            mask=(((hsv[:,:,0]>=30)&(hsv[:,:,0]<=95)&(hsv[:,:,1]>saturation)&(hsv[:,:,2]>brightness)).astype(np.uint8)*255)
            measured=_row_punctuation(mask,points)
            evidence.append(None if measured is None else {**{key:value for key,value in measured.items() if key!='expanded_quad'},
                                                            'brightness_threshold':brightness})
    return evidence


def green_leading_evidence(image,quad):
    """Independently inspect dim coloured leading marks, without digit V gates.

    Remove slowly changing green glass colour before looking for thin strokes.
    A fixed brightness gate can erase a dim minus, while a fixed excess-green
    gate merges tinted glass with all digits. This only vetoes; it adds no symbol.
    """
    h,w=image.shape[:2]
    hsv=cv2.cvtColor(image,cv2.COLOR_BGR2HSV)
    excess=cv2.subtract(image[:,:,1],cv2.max(image[:,:,0],image[:,:,2]))
    points=_ordered(np.asarray(quad,np.float32)*[w,h])
    row_height=min(np.linalg.norm(points[3]-points[0]),np.linalg.norm(points[2]-points[1]))
    size=max(5,round(row_height*.35))|1
    background=cv2.morphologyEx(excess,cv2.MORPH_OPEN,np.ones((size,size),np.uint8))
    contrast=cv2.subtract(excess,background)
    mask=(((hsv[:,:,0]>=30)&(hsv[:,:,0]<=95)&(hsv[:,:,1]>50)&(contrast>10)).astype(np.uint8)*255)
    complete=_row_punctuation(mask,points)
    if complete is not None:
        return {key:complete[key] for key in ('minus_signs','clipped_leading_mark')}
    # Only the first digit and its leading margin establish sign evidence.
    # Reflected inactive strokes can connect neighbouring digits at this dim
    # threshold; those bridges must not erase the separate leading-sign check.
    across=(points[1]-points[0])/max(np.linalg.norm(points[1]-points[0]),1)
    down=(points[3]-points[0])/max(np.linalg.norm(points[3]-points[0]),1)
    row_width=np.linalg.norm(points[1]-points[0])
    region=np.array([points[0]-across*row_height*2-down*row_height*.15,
                     points[0]+across*max(row_width*.30,row_height)-down*row_height*.15,
                     points[0]+across*max(row_width*.30,row_height)+down*row_height*1.10,
                     points[0]-across*row_height*2+down*row_height*1.10])
    support=np.zeros((h,w),np.uint8)
    cv2.fillConvexPoly(support,np.rint(region).astype(np.int32),255)
    mask=cv2.bitwise_and(mask,support)
    measured=_row_punctuation(mask,points)
    return None if measured is None else {key:measured[key] for key in ('minus_signs','clipped_leading_mark')}


def numeric_line_crops(image):
    """Keep measured row alternatives under glare; callers compare readings."""
    h,w=image.shape[:2]
    small=h<120 and w<600
    if small:
        # A fixed median filter erases a 1–2 px decimal in a small phone crop.
        # Resize this working copy before filtering; source evidence is retained.
        scale=min(3,max(2,math.ceil(240/h)))
        image=cv2.resize(image,None,fx=scale,fy=scale,interpolation=cv2.INTER_CUBIC)
    choices=[]
    first=_numeric_line_crop(image)
    if first is not None:
        first['mask_variant']=('relative',.85)
        choices.append(first)
    gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY);h,w=gray.shape
    # Screen recapture can join a point to the following digit in morphology
    # masks. Recheck its actual isolated pixels at a second relative-light
    # threshold; a profile never supplies punctuation or its position.
    size=max(31,round(h*1.5))
    illumination=cv2.blur(gray,(size,size))
    relative=gray.astype(np.float32)/np.maximum(illumination,1)
    row=_numeric_line_crop(image,(relative<.82).astype(np.uint8)*255)
    if row is not None:
        row['mask_variant']=('relative',.82)
        choices.append(row)
    smooth=cv2.medianBlur(gray,3);size=max(9,round(h*.35))|1
    illumination=cv2.morphologyEx(smooth,cv2.MORPH_CLOSE,np.ones((size,size),np.uint8))
    contrast=(illumination.astype(np.float32)-smooth)/np.maximum(illumination,1)
    for level in (.16,.20,.24):
        row=_numeric_line_crop(image,(contrast>level).astype(np.uint8)*255)
        if row is not None:
            row['mask_variant']=('wide',level)
            if not any(row['roi']==c['roi'] and row['decimal_dots']==c['decimal_dots'] for c in choices):choices.append(row)
    # A wide illumination kernel merges dark glass/bezel into faint end digits.
    # This smaller measured neighbourhood keeps a phone LCD point and strokes.
    smooth=cv2.medianBlur(gray,5)
    size=max(9,round(h*.08))|1
    illumination=cv2.morphologyEx(smooth,cv2.MORPH_CLOSE,np.ones((size,size),np.uint8))
    contrast=(illumination.astype(np.float32)-smooth)/np.maximum(illumination,1)
    for level in ((.16,.20,.24,.28,.30) if small else (.16,.20,.24,.28)):
        row=_numeric_line_crop(image,(contrast>level).astype(np.uint8)*255)
        if row is not None:
            row['mask_variant']=('local',level)
            choices.append(row)
    return choices


def numeric_line_crop(image):
    choices=numeric_line_crops(image)
    return choices[0] if choices else None


def _lcd_glyph_anchors(parts,height):
    """Group overlapping upper/lower bars without joining neighbouring ink."""
    anchors=[]
    for part in sorted(parts,key=lambda s:s[0]):
        if anchors:
            previous=anchors[-1]
            overlap=min(previous[0]+previous[2],part[0]+part[2])-max(previous[0],part[0])
            gap=max(0,previous[1]-part[1]-part[3],part[1]-previous[1]-previous[3])
            if overlap>min(previous[2],part[2])*.12 and gap<height*.12:
                left=min(previous[0],part[0]);top=min(previous[1],part[1])
                right=max(previous[0]+previous[2],part[0]+part[2])
                bottom=max(previous[1]+previous[3],part[1]+part[3])
                anchors[-1]=np.array([left,top,right-left,bottom-top,previous[4]+part[4]])
                continue
        anchors.append(part)
    return anchors


def _numeric_line_crop(image,mask=None):
    """Locate a complete dark LCD row, including isolated punctuation pixels."""
    gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY);h,w=gray.shape
    # Wide local illumination removes the gradient reflected on the glass;
    # global Otsu otherwise connects dark background to entire digit groups.
    size=max(31,round(h*1.5))
    illumination=cv2.blur(gray,(size,size))
    relative=gray.astype(float)/np.maximum(illumination,1)
    if mask is None:mask=(relative<.85).astype(np.uint8)*255
    _,_,stats,_=cv2.connectedComponentsWithStats(mask)
    parts=[s for s in stats[1:] if s[4]>max(6,h*.025) and s[0]>0 and s[1]>0
           and s[0]+s[2]<w and s[1]+s[3]<h]
    tall=[s for s in parts if h*.25<s[3]<h*.86 and s[2]<w*.55]
    # Disconnected bars can overlap in x while belonging to the same glyph.
    # Only the anchor boxes are grouped; mask pixels, dots and signs stay intact.
    tall=_lcd_glyph_anchors(tall,h)
    if len(tall)<2:return None
    reference=max(s[3] for s in tall)
    full=[s for s in tall if s[3]>reference*.7]
    centre=float(np.median([s[1]+s[3]/2 for s in full]))
    row=[s for s in parts if s[3]>reference*.38 and s[2]<reference*.85
         and abs(s[1]+s[3]/2-centre)<reference*.42]
    if len(row)<2:return None
    left=min(s[0] for s in row);right=max(s[0]+s[2] for s in row)
    top=min(s[1] for s in row);bottom=max(s[1]+s[3] for s in row)
    dots=[s for s in parts if s[3]<reference*.22 and s[2]<reference*.22 and .5<s[2]/s[3]<2.
          and s[4]>reference*.2 and s[4]/(s[2]*s[3])>.45
          and left<s[0]<right and bottom-reference*.22<s[1]+s[3]/2<bottom+reference*.12]
    signs=[s for s in parts if s[3]<reference*.22 and s[2]>reference*.2
           and left-reference*.8<s[0]+s[2]<left and abs(s[1]+s[3]/2-centre)<reference*.2]
    if signs:left=min(s[0] for s in signs)
    if dots:bottom=max(bottom,max(s[1]+s[3] for s in dots))
    x=max(0,round(left-reference*.12));y=max(0,round(top-reference*.08))
    x2=min(w,round(right+reference*.12));y2=min(h,round(bottom+reference*.08))
    crop=image[y:y2,x:x2]
    normalized=np.clip(gray.astype(float)/np.maximum(illumination,1)*145,0,255).astype(np.uint8)[y:y2,x:x2]
    return {'image':crop,'normalized':normalized,'decimal_dots':len(dots),'minus_signs':len(signs),
            'dot_centers':[float(s[0]+s[2]/2) for s in dots],
            'dot_points':[(float(s[0]+s[2]/2),float(s[1]+s[3]/2)) for s in dots],
            'digit_centers':sorted(float(s[0]+s[2]/2) for s in full),
            'digit_boxes':sorted((float(s[0]),float(s[0]+s[2])) for s in full),
            'digit_extent':(float(min(s[0] for s in row)),float(max(s[0]+s[2] for s in row))),
            'roi':{'x':x/w,'y':y/h,'width':(x2-x)/w,'height':(y2-y)/h}}


def lcd_decimal_evidence(row):
    """Locate a real point between observed glyph anchors, without a profile."""
    dots=row.get('dot_centers',[]);centres=row.get('digit_centers',[])
    if len(centres)<2:return None
    gaps=np.diff(centres);pitch=float(np.median(gaps))
    if pitch<=0:return None
    # JPEG can detach a rounded foot inside the first/last glyph. A point on
    # its outside half and inside its body is not between characters.
    # Extra points elsewhere remain ambiguous and are never silently removed.
    boxes=row.get('digit_boxes',[])
    if boxes:
        dots=[d for d in dots if not boxes[0][0]+pitch*.06<d<centres[0]
              and not centres[-1]<d<boxes[-1][1]-pitch*.06]
    if len(dots)!=1:return None
    left,right=row['digit_extent']
    # A complete narrow "1" shifts its component centre: the centres need not
    # be equally spaced when every glyph covers the measured row. Count those
    # complete anchors directly. With fragmented end glyphs, require regular
    # spacing before estimating their count from the full observed extent.
    complete=bool(boxes and left>=boxes[0][0]-pitch*.15 and right<=boxes[-1][1]+pitch*.15)
    if complete:count=len(centres)
    else:
        if np.any(np.abs(gaps/pitch-1)>.25):return None
        count=round((right-left)/pitch)
    if not 2<=count<=10 or count<len(centres):return None
    dot=dots[0];index=sum(c<dot for c in centres)
    # Bracketing anchors are required; a point before/after an incomplete row
    # cannot be inserted at a position assumed from its registered precision.
    if not 0<index<len(centres) or not 0<index<count:return None
    if not centres[index-1]+pitch*.10<dot<centres[index]-pitch*.10:return None
    return {'digits':count,'index':index,'decimals':count-index}


def lcd_point_corroborated(line,rows):
    evidence=lcd_decimal_evidence(line)
    if not evidence:return False
    pitch=float(np.median(np.diff(line['digit_centers'])))
    point=next(p for p in line['dot_points'] if line['digit_centers'][evidence['index']-1]<p[0]<line['digit_centers'][evidence['index']])
    left,right=line['digit_extent']
    masks=[r for r in rows if any(np.linalg.norm(np.asarray(p)-point)<pitch*.10 for p in r['dot_points'])
        and abs(r['digit_extent'][0]-left)<pitch*.25
        and point[0]+pitch*.35<r['digit_extent'][1]<=right+pitch*.25]
    if len({r.get('mask_variant')[1] for r in masks if r.get('mask_variant')})<2:return False
    # A second measured point must not disappear merely because another mask
    # joins it to a digit. Only bracketed points in this row can contradict its
    # decimal; detached first-glyph feet and trailing unit/bezel marks cannot.
    points=[]
    for row in masks:
        centres=row['digit_centers']
        if len(centres)<2:continue
        for other in row['dot_points']:
            if not centres[0]+pitch*.10<other[0]<centres[-1]-pitch*.10:continue
            if np.linalg.norm(np.asarray(other)-point)<pitch*.10:continue
            points.append(other)
    for other in points:
        supporting=[row for row in masks if any(np.linalg.norm(np.asarray(p)-other)<pitch*.10
                                                for p in row['dot_points'])]
        if len({row.get('mask_variant')[1] for row in supporting if row.get('mask_variant')})>=2:
            return False
    return True


def lcd_decimal_observation(image):
    rows=numeric_line_crops(image)
    supported=[(lcd_decimal_evidence(row),row) for row in rows if lcd_point_corroborated(row,rows)]
    if not supported:return None
    # The widest complete row takes precedence over a cropped prefix. A format
    # is only a suggestion; numeric recognition checks every digit independently.
    count=max(e['digits'] for e,_ in supported)
    supported=[(e,row) for e,row in supported if e['digits']==count]
    if len({(e['index'],e['decimals']) for e,_ in supported})!=1:return None
    evidence,row=max(supported,key=lambda item:item[1]['roi']['width'])
    return {**evidence,'roi':row['roi']}


def distinct_display_candidates(candidates):
    """Retain complete windows and remove tiny dim patches sharing LED pixels.

    A gray caption/edge at the top of a luminous row can pass the LCD proposal
    test too. It must be under a tenth of the measured row, mostly overlap its
    pixels, and have its centre inside that row's quadrilateral. Separate
    screens and high-contrast LCD candidates retain the multiple-display veto.
    """
    unique=[]
    for candidate in sorted(candidates,key=lambda c:-c['box'][2]*c['box'][3]):
        duplicate=False
        x,y,w,h=candidate['box']
        for other in unique:
            overlap=_overlap(candidate['box'],other['box'])
            if overlap>.7:
                duplicate=True;break
            if (candidate['display_type']=='lcd' and candidate.get('low_contrast')
                    and other['display_type']=='green-led' and overlap>.65
                    and w*h<other['box'][2]*other['box'][3]*.1
                    and cv2.pointPolygonTest(np.asarray(other['quad'],np.float32),
                                              (x+w/2,y+h/2),False)>=0):
                duplicate=True;break
        if not duplicate:unique.append(candidate)
    return unique


def display_candidates(image):
    """Return measured LCD/LED windows, with review required and no readings."""
    if image is None:return []
    factor=min(1.,1200/max(image.shape[:2]))
    source=cv2.resize(image,None,fx=factor,fy=factor,interpolation=cv2.INTER_AREA)
    h,w=source.shape[:2];gray=cv2.cvtColor(source,cv2.COLOR_BGR2GRAY)
    candidates=[]
    for threshold in range(35,186,15):
        _,mask=cv2.threshold(gray,threshold,255,cv2.THRESH_BINARY)
        contours,_=cv2.findContours(mask,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours:
            area=cv2.contourArea(contour)
            if not .0008*h*w<area<.90*h*w:continue
            quad=cv2.approxPolyDP(contour,.03*cv2.arcLength(contour,True),True)
            if len(quad)!=4 or not cv2.isContourConvex(quad):continue
            points=_ordered(quad);top=np.linalg.norm(points[1]-points[0]);bottom=np.linalg.norm(points[2]-points[3])
            left=np.linalg.norm(points[3]-points[0]);right=np.linalg.norm(points[2]-points[1])
            cw=max(top,bottom);ch=max(left,right)
            if ch<18 or not 1.6<cw/ch<6.5 or min(top,bottom)<cw*.6 or min(left,right)<ch*.55:continue
            if abs(points[1][1]-points[0][1])>top*.55:continue
            quad=points/[w,h]
            patch=rectify_display(source,quad)
            if patch is None:continue
            if np.median(cv2.cvtColor(patch,cv2.COLOR_BGR2HSV)[:,:,1])>90:continue
            pg=cv2.cvtColor(patch,cv2.COLOR_BGR2GRAY)
            median=float(np.median(pg));dark=(pg<median-20).astype(np.uint8)*255
            row=_row_evidence(dark)
            normalized_rows=0;column_rows=0
            if not row and median<175:
                smooth=cv2.medianBlur(pg,3)
                size=max(9,round(pg.shape[0]*.35))|1
                illumination=cv2.morphologyEx(smooth,cv2.MORPH_CLOSE,np.ones((size,size),np.uint8))
                contrast=(illumination.astype(np.float32)-smooth)/np.maximum(illumination,1)
                for level in (.08,.12,.16,.20,.24):
                    local=(contrast>level).astype(np.uint8)*255
                    normalized_rows+=bool(_row_evidence(local))
                    column_rows+=bool(_green_row_evidence(local,minimum_digits=2))
            if not row and normalized_rows<2 and column_rows<2:continue
            if not row and ch<h*.045:continue  # small brand lettering is not a dim display window
            # The surrounding bezel must be darker than the glass. This rejects
            # labels on paper and bare rectangular machine parts.
            centre=points.mean(axis=0);outer=centre+(points-centre)*1.12
            ring=np.zeros_like(gray);cv2.fillConvexPoly(ring,np.rint(outer).astype(np.int32),255)
            cv2.fillConvexPoly(ring,np.rint(points).astype(np.int32),0)
            values=gray[ring>0]
            bezel=float(np.mean(values<median-15)) if len(values) else 0
            if not (bezel>=.55 or (normalized_rows>=2 and bezel>=.10)
                    or (column_rows>=2 and bezel>=.20)):continue
            x,y=points.min(axis=0);x2,y2=points.max(axis=0)
            candidates.append({'quad':quad.tolist(),'box':(float(x/w),float(y/h),float((x2-x)/w),float((y2-y)/h)),
                               'display_type':'lcd','evidence':'visible LCD window, bezel and illumination-normalized digit row',
                               'low_contrast':not row})
    hsv=cv2.cvtColor(source,cv2.COLOR_BGR2HSV)
    green=(((hsv[:,:,0]>=35)&(hsv[:,:,0]<=80)&(hsv[:,:,1]>65)&(hsv[:,:,2]>110)).astype(np.uint8)*255)
    # Joining is used only to find the row; the unmodified pixels are read later.
    joined=cv2.morphologyEx(green,cv2.MORPH_CLOSE,np.ones((max(3,h//180),max(11,w//40)),np.uint8))
    contours,_=cv2.findContours(joined,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    contours=list(contours)
    # A narrow final "1" can be farther from the previous digit than the row
    # joining kernel. Group comparable tall marks before adding row contours;
    # small OUT/unit text remains below the measured digit band.
    closed=cv2.morphologyEx(green,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    _,labels,stats,_=cv2.connectedComponentsWithStats(closed)
    tall=[(index,s) for index,s in enumerate(stats[1:],1)
          if s[3]>=25 and s[4]>70 and .1<s[2]/s[3]<1.1]
    if tall:
        connection=max(3,round(max(s[3] for _,s in tall)*.04))
        closed=cv2.morphologyEx(green,cv2.MORPH_CLOSE,np.ones((connection,connection),np.uint8))
        _,labels,stats,_=cv2.connectedComponentsWithStats(closed)
        tall=[(index,s) for index,s in enumerate(stats[1:],1)
              if s[3]>=25 and s[4]>70 and .1<s[2]/s[3]<1.1]
    used=set()
    for index,s in sorted(tall,key=lambda item:-item[1][3]):
        if index in used:continue
        cy=s[1]+s[3]/2
        group=[(i,t) for i,t in tall if i not in used and .30*s[3]<t[3]<s[3]*1.4
               and abs(t[1]+t[3]/2-cy)<s[3]*.55 and abs(t[0]-s[0])<s[3]*5]
        group.sort(key=lambda item:item[1][0])
        if len(group)<3:continue
        if any(b[1][0]-a[1][0]-a[1][2]>s[3]*.9 for a,b in zip(group,group[1:])):continue
        row=np.isin(labels,[i for i,_ in group]).astype(np.uint8)*255
        yy,xx=np.where(row>0)
        contours.append(np.column_stack([xx,yy]).astype(np.int32).reshape(-1,1,2))
        used.update(i for i,_ in group)
    for contour in contours:
        rect=cv2.minAreaRect(contour);points=_ordered(cv2.boxPoints(rect))
        cw=np.linalg.norm(points[1]-points[0]);ch=np.linalg.norm(points[3]-points[0])
        if cw<45 or ch<max(20,h*.04) or not 1.4<cw/ch<6.5:continue
        digit_quad=(points/[w,h]).tolist()
        punctuation=_row_punctuation(green,points)
        if punctuation is not None:points=punctuation['expanded_quad']
        # Pad the complete measured row after including signs and decimal dots.
        centre=points.mean(axis=0);points=centre+(points-centre)*[1.12,1.22]
        points[:,0]=np.clip(points[:,0],0,w-1);points[:,1]=np.clip(points[:,1],0,h-1)
        patch=rectify_display(source,points/[w,h])
        ph=cv2.cvtColor(patch,cv2.COLOR_BGR2HSV)
        pm=(((ph[:,:,0]>=35)&(ph[:,:,0]<=80)&(ph[:,:,1]>65)&(ph[:,:,2]>110)).astype(np.uint8)*255)
        if not _green_row_evidence(pm):continue
        x,y=points.min(axis=0);x2,y2=points.max(axis=0)
        candidates.append({'quad':(points/[w,h]).tolist(),'box':(float(x/w),float(y/h),float((x2-x)/w),float((y2-y)/h)),
                           'digit_quad':digit_quad,
                           'display_type':'green-led','evidence':'visible green LED digit row'})
    # Retain the complete window across threshold levels; smaller partial
    # windows can clip a faint leading sign or edge digit under a reflection.
    unique=distinct_display_candidates(candidates)
    return sorted(unique,key=lambda c:(c['box'][1],c['box'][0]))[:12]


def propose_digital_displays(prepared,spans=()):
    """Locate pixels; a visible OCR decimal count only suggests profile format.

    The actual numeric reader independently requires the original punctuation.
    No value or missing decimal is manufactured from this format hint.
    """
    image=cv2.imdecode(np.frombuffer(prepared.jpeg,np.uint8),cv2.IMREAD_COLOR)
    proposals=[]
    for candidate in display_candidates(image):
        x,y,w,h=candidate['box']
        # A little context keeps the measured boundary available on crop reread.
        left=max(0.,x-w*.04);top=max(0.,y-h*.08)
        right=min(1.,x+w*1.04);bottom=min(1.,y+h*1.08)
        observed=set()
        if candidate['display_type']=='lcd':
            patch=rectify_display(image,candidate['quad'])
            decoded=[decode_lcd_line(line['image']) for line in numeric_line_crops(patch)] if patch is not None else []
            values={r['raw_text'] for r in decoded if r is not None}
            source_width=prepared.source_width or prepared.width
            source_height=prepared.source_height or prepared.height
            if (not values and prepared.original and (right-left)*source_width>=32
                    and (bottom-top)*source_height>=32):
                # A tiny decimal can disappear in the discovery thumbnail.
                # Recheck only the measured display using original photo pixels.
                data=crop_image(prepared,ROI(x=float(left),y=float(top),width=float(right-left),height=float(bottom-top)))
                native=cv2.imdecode(np.frombuffer(data,np.uint8),cv2.IMREAD_COLOR)
                native_views=[native]
                native_views += [rectify_display(native,c['quad']) for c in display_candidates(native)[:3] if c['display_type']=='lcd']
                decoded=[decode_lcd_line(line['image']) for view in native_views if view is not None for line in numeric_line_crops(view)]
                values={r['raw_text'] for r in decoded if r is not None and '.' in r['raw_text']}
            if len(values)==1 and '.' in next(iter(values)):
                observed.add(len(next(iter(values)).partition('.')[2]))
            if not observed:
                # A photographed screen often retains a point even when the
                # digit-pattern decoder cannot join its faint seven segments.
                source_width=prepared.source_width or prepared.width
                source_height=prepared.source_height or prepared.height
                if min((right-left)*source_width,(bottom-top)*source_height)>=32:
                    native=cv2.imdecode(np.frombuffer(crop_image(prepared,ROI(x=float(left),y=float(top),
                        width=float(right-left),height=float(bottom-top))),np.uint8),cv2.IMREAD_COLOR)
                    point=lcd_decimal_observation(native)
                    if point:observed.add(point['decimals'])
        for span in spans:
            text=span.get('text','').strip().replace(',','.')
            roi=span.get('roi',{})
            if span.get('ocr_score',0)<.85 or not re.fullmatch(r'[+-]?\d+\.\d{1,4}',text):continue
            if not all(key in roi for key in ('x','y','width','height')):continue
            if left<=roi['x']+roi['width']/2<=right and top<=roi['y']+roi['height']/2<=bottom:
                observed.add(len(text.partition('.')[2]))
        proposals.append({'roi':{'x':left,'y':top,'width':right-left,'height':bottom-top},
                          'kind_hint':'digital','confidence':'low' if candidate.get('low_contrast') else 'medium','requires_review':True,
                          'display_quad':candidate['quad'],'display_type':candidate['display_type'],
                          'observed_decimals':next(iter(observed)) if len(observed)==1 else None,
                          'method':candidate['evidence']+'; digits, decimal and identity require independent review'})
    # A round digital housing is not an analog dial. General contour proposals
    # can hide its LCD; recover a local numeric span or a measured point row.
    locations=[]
    point=lcd_decimal_observation(image) if not proposals else None
    if point:
        # A numeric row is a locator, not the entire glass window. Retain half
        # a measured row width of surrounding glass for stable normalization;
        # a tight recrop can fragment otherwise complete edge-glyph anchors.
        r=point['roi']
        left=max(0.,r['x']-r['width']*.50);right=min(1.,r['x']+r['width']*1.50)
        top=max(0.,r['y']-r['height']*.75);bottom=min(1.,r['y']+r['height']*1.75)
        locations.append(({'x':left,'y':top,'width':right-left,'height':bottom-top},point['decimals']))
    for span in spans:
        text=span.get('text','').strip().replace(',','.')
        r=span.get('roi',{})
        if (span.get('ocr_score',0)<.85 or not re.fullmatch(r'-?\d+(?:\.\d+)?',text)
            or sum(c.isdigit() for c in text)<3 or not all(k in r for k in ('x','y','width','height'))
            or r['height']<.03 or r['width']<r['height']):continue
        left=max(0.,r['x']-r['width']*.20);top=max(0.,r['y']-r['height']*.30)
        right=min(1.,r['x']+r['width']*1.20);bottom=min(1.,r['y']+r['height']*1.30)
        decimals=len(text.partition('.')[2]) if '.' in text else None
        if min((right-left)*(prepared.source_width or prepared.width),(bottom-top)*(prepared.source_height or prepared.height))<32:continue
        measured=any(_overlap((left,top,right-left,bottom-top),tuple(p['roi'][k] for k in ('x','y','width','height')))>.65 for p in proposals)
        if decimals is None or not measured:
            native=cv2.imdecode(np.frombuffer(crop_image(prepared,ROI(x=float(left),y=float(top),
                width=float(right-left),height=float(bottom-top))),np.uint8),cv2.IMREAD_COLOR)
            observed=lcd_decimal_observation(native)
            if observed and decimals is None:decimals=observed['decimals']
            if not observed:
                # Electronic controls distinguish a round LCD instrument from
                # a dial without assuming its resolution or inventing a point.
                markers=[s for s in spans if s.get('ocr_score',0)>=.9 and
                    s.get('text','').strip().upper() in {'ABSOLUTE','ORIGIN','ON/OFF','ZERO/ABS','HOLD/DATA'}
                    and abs(s.get('roi',{}).get('x',-10)+s.get('roi',{}).get('width',0)/2-r['x']-r['width']/2)<r['width']
                    and abs(s.get('roi',{}).get('y',-10)+s.get('roi',{}).get('height',0)/2-r['y']-r['height']/2)<r['height']*3]
                if not markers:continue
        locations.append(({'x':left,'y':top,'width':right-left,'height':bottom-top},decimals))
    for roi,decimals in locations:
        box=tuple(roi[k] for k in ('x','y','width','height'))
        duplicate=next((p for p in proposals if _overlap(box,tuple(p['roi'][k] for k in ('x','y','width','height')))>.65),None)
        if duplicate:
            if duplicate.get('observed_decimals') is None:duplicate['observed_decimals']=decimals
            continue
        proposals.append({'roi':roi,'kind_hint':'digital','display_type':'lcd','confidence':'low',
            'requires_review':True,'observed_decimals':decimals,
            'method':'local numeric row and visible point; round housing alone does not imply analog'})
    return proposals
