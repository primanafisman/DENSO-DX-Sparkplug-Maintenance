"""Calibrated static-template registration + black-needle geometry, no cloud.

Thresholds are conservative engineering heuristics, not measured confidence.
Registration of the dial plane cannot remove needle-to-dial parallax.
"""
import hashlib
import math

import cv2
import numpy as np

from .pressure import black_mask

VERSION='hybrid-calibrated-needle-v0.1'


def angle_of(point,pivot,aspect_ratio=1.):
    return math.degrees(math.atan2(point['y']-pivot['y'],aspect_ratio*(point['x']-pivot['x'])))%360


def interpolate_angle(angle,calibration,*,aspect_ratio=1.):
    points=calibration['scale_points']; pivot=calibration['pivot']
    sign=1 if calibration['clockwise'] else -1
    angles=[angle_of(p,pivot,aspect_ratio) for p in points]
    offsets=[0.]
    for a,b in zip(angles,angles[1:]): offsets.append(offsets[-1]+(sign*(b-a))%360)
    offset=(sign*(angle-angles[0]))%360
    # A small pixel edge allowance can only snap to a calibrated endpoint.
    if offset>359.4: offset=0.
    if offsets[-1]<offset<offsets[-1]+.6: offset=offsets[-1]
    if not 0<=offset<=offsets[-1]: return None
    for i in range(len(offsets)-1):
        if offsets[i]<=offset<=offsets[i+1]:
            fraction=(offset-offsets[i])/(offsets[i+1]-offsets[i])
            low,high=points[i]['value'],points[i+1]['value']
            return {'value':round(low+(high-low)*fraction,3),'interval':[low,high],
                    'fraction':fraction,'angle':angle,'scale_offset':offset}
    return None


def _decode(data):
    image=cv2.imdecode(np.frombuffer(data,np.uint8),cv2.IMREAD_COLOR)
    if image is None: raise ValueError('Gambar tidak dapat dibaca.')
    ratio=min(1.,960/max(image.shape[:2]))
    return cv2.resize(image,None,fx=ratio,fy=ratio,interpolation=cv2.INTER_AREA) if ratio<1 else image


def _register(query,template,calibration,same_source):
    h,w=template.shape[:2]; qh,qw=query.shape[:2]
    if same_source:
        return np.diag([w/qw,h/qh,1.]),{'method':'same calibration exposure','inliers':None,'reprojection_error_px':0.}
    pivot=np.array([calibration['pivot']['x']*w,calibration['pivot']['y']*h])
    radius=float(np.median([np.linalg.norm(np.array([p['x']*w,p['y']*h])-pivot) for p in calibration['scale_points']]))
    mask=np.zeros((h,w),np.uint8)
    cv2.circle(mask,tuple(np.rint(pivot).astype(int)),int(radius*1.22),255,-1)
    # Retain distinctive printed scale labels, not just the repeating outer ring.
    # Remove hub/tail and all long radial template strokes (moving needle).
    cv2.circle(mask,tuple(np.rint(pivot).astype(int)),int(radius*.50),0,-1)
    radial=cv2.HoughLinesP(black_mask(template),1,np.pi/720,threshold=25,
                           minLineLength=radius*.30,maxLineGap=radius*.04)
    for line in ([] if radial is None else radial[:,0]):
        a,b=np.asarray(line[:2],float),np.asarray(line[2:],float)
        delta=b-a; length=float(np.linalg.norm(delta))
        distance=abs(float(delta[0]*(pivot[1]-a[1])-delta[1]*(pivot[0]-a[0])))/length
        if distance<radius*.08:
            direction=delta/length
            cv2.line(mask,tuple(np.rint(pivot-radius*.95*direction).astype(int)),
                     tuple(np.rint(pivot+radius*.95*direction).astype(int)),0,max(5,int(radius*.12)))
    # Tick endpoints can extend far into the inner ring. Distinctive evidence
    # must be on compact ink components (printed glyphs/irregular markings),
    # not the corners of long straight radial strokes or the circular housing.
    ink=black_mask(template) & mask
    component_count,labels,stats,centroids=cv2.connectedComponentsWithStats(ink)
    glyph_mask=np.zeros((h,w),np.uint8)
    for index in range(1,component_count):
        x,y,rw,rh,area=stats[index]
        distance=float(np.linalg.norm(centroids[index]-pivot))
        if not (area>=8 and .50*radius<distance<.92*radius and max(rw,rh)<radius*.28): continue
        yy,xx=np.where(labels[y:y+rh,x:x+rw]==index)
        component=np.column_stack((xx,yy)).astype(np.float32)
        rect=cv2.minAreaRect(component); _,(a,b),_=rect
        if min(a,b)<2 or max(a,b)/min(a,b)>4: continue
        box=cv2.boxPoints(rect); edges=np.roll(box,-1,axis=0)-box
        axis=edges[np.argmax(np.linalg.norm(edges,axis=1))]; axis/=np.linalg.norm(axis)
        radial_direction=(centroids[index]-pivot)/distance
        if max(a,b)>radius*.14 and max(a,b)/min(a,b)>1.5 and abs(float(axis@radial_direction))>.9:
            continue  # thick/short radial ticks are not distinctive glyphs either
        glyph_mask[y:y+rh,x:x+rw][labels[y:y+rh,x:x+rw]==index]=255
    glyph_mask=cv2.dilate(glyph_mask,np.ones((5,5),np.uint8))
    orb=cv2.ORB_create(nfeatures=2400,fastThreshold=10,edgeThreshold=12)
    kt,dt=orb.detectAndCompute(cv2.cvtColor(template,cv2.COLOR_BGR2GRAY),mask)
    kq,dq=orb.detectAndCompute(cv2.cvtColor(query,cv2.COLOR_BGR2GRAY),None)
    if dt is None or dq is None: return None,{'reason':'Garis skala template belum dapat dicocokkan.'}
    matches=cv2.BFMatcher(cv2.NORM_HAMMING).knnMatch(dq,dt,k=2)
    good=[m for pair in matches if len(pair)==2 for m,n in [pair] if m.distance<.70*n.distance]
    reverse={m.queryIdx:m.trainIdx for m in cv2.BFMatcher(cv2.NORM_HAMMING).match(dt,dq)}
    good=[m for m in good if reverse.get(m.trainIdx)==m.queryIdx]
    if len(good)<12: return None,{'reason':'Landmark statis terlalu sedikit; atur ROI atau foto ulang.'}
    source=np.float32([kq[m.queryIdx].pt for m in good]); target=np.float32([kt[m.trainIdx].pt for m in good])
    transform,inlier=cv2.findHomography(source,target,cv2.RANSAC,3.)
    if transform is None or inlier is None: return None,{'reason':'Registrasi template gagal.'}
    keep=inlier.ravel().astype(bool); count=int(keep.sum())
    if count<12:
        return None,{'reason':'Inlier registrasi terlalu sedikit; atur crop atau foto ulang.','inliers':count}
    projected=cv2.perspectiveTransform(source[keep,None,:],transform)[:,0,:]
    error=float(np.median(np.linalg.norm(projected-target[keep],axis=1)))
    coverage=cv2.contourArea(cv2.convexHull(target[keep]))/(h*w)
    # Low residual on repetitive ticks cannot prove orientation. Require
    # distinctive inner label features in separated angular regions as well.
    inlier_points=target[keep]
    locations=np.rint(inlier_points).astype(int)
    locations[:,0]=np.clip(locations[:,0],0,w-1);locations[:,1]=np.clip(locations[:,1],0,h-1)
    glyph_inliers=glyph_mask[locations[:,1],locations[:,0]]>0
    template_positions=np.asarray([k.pt for k in kt])
    popcounts=np.array([int(i).bit_count() for i in range(256)],np.uint8)
    # A glyph-shaped corner may still repeat around the dial. It must also be
    # descriptor-distinct from template patches in other angular regions.
    for index,match in enumerate(np.asarray(good,dtype=object)[keep]):
        if not glyph_inliers[index]: continue
        far=np.linalg.norm(template_positions-template_positions[match.trainIdx],axis=1)>radius*.20
        if np.any(far):
            distances=popcounts[np.bitwise_xor(dt[far],dt[match.trainIdx])].sum(axis=1)
            if int(distances.min())<40: glyph_inliers[index]=False
    inner=inlier_points[glyph_inliers]
    orientation_span=0.
    if len(inner)>=8:
        directions=np.degrees(np.arctan2((inner-pivot)[:,1],(inner-pivot)[:,0]))
        orientation_span=float(np.max(np.abs((directions[:,None]-directions[None,:]+180)%360-180)))
    if len(inner)<8 or orientation_span<50:
        return None,{'reason':'Orientasi template ambigu: garis berulang tanpa cukup landmark label yang khas. Foto ulang dengan angka skala jelas.',
                     'inliers':count,'distinctive_inner_features':len(inner)}
    # Reject one small/symmetric label patch posing as registration of a dial.
    if count<12 or count/len(good)<.55 or coverage<.12 or error>2.:
        return None,{'reason':'Landmark skala belum tersebar/cocok dengan cukup baik.', 'inliers':count,
                     'inlier_fraction':count/len(good),'coverage':coverage,'reprojection_error_px':error}
    corners=np.float32([[[0,0],[qw-1,0],[qw-1,qh-1],[0,qh-1]]])
    quad=cv2.perspectiveTransform(corners,transform)[0]
    if not np.isfinite(quad).all() or not cv2.isContourConvex(quad) or cv2.contourArea(quad,oriented=True)<=0:
        return None,{'reason':'Perspektif terbalik/tidak stabil; foto ulang tegak lurus.'}
    sides=np.linalg.norm(np.roll(quad,-1,axis=0)-quad,axis=1)
    if max(sides)/min(sides)>1.65 or np.max(np.abs(quad))>max(h,w)*3:
        return None,{'reason':'Sudut kamera terlalu miring; koreksi bidang tidak menjamin bebas parallax.'}
    return transform,{'method':'ORB static labels + ticks + RANSAC + uniqueness gates','inliers':count,
                      'inlier_fraction':count/len(good),'reprojection_error_px':round(error,3),
                      'distinctive_inner_features':len(inner),'orientation_span':round(orientation_span,2)}


def read_calibrated_analog(data,calibration,template_data):
    failure={'value':None,'uncertainty':None,'method':VERSION,'overlay':{},'registration':{},'reason':''}
    query=_decode(data); template=_decode(template_data)
    same=(data==template_data or hashlib.sha256(data).hexdigest()==calibration.get('crop_hash'))
    transform,registration=_register(query,template,calibration,same)
    failure['registration']=registration
    if transform is None:
        return {**failure,'reason':registration['reason']}
    h,w=template.shape[:2]
    aligned=cv2.warpPerspective(query,transform,(w,h),borderValue=(255,255,255))
    pivot=np.array([calibration['pivot']['x']*w,calibration['pivot']['y']*h])
    radius=float(np.median([np.linalg.norm(np.array([p['x']*w,p['y']*h])-pivot) for p in calibration['scale_points']]))
    mask=black_mask(aligned)
    angles=np.arange(0,360,.15); radians=np.deg2rad(angles)
    radii=np.linspace(radius*.30,radius*.92,110)
    xy=pivot+np.stack((np.cos(radians),np.sin(radians)),axis=1)[:,None,:]*radii[None,:,None]
    xy=np.rint(xy).astype(int)
    if xy[:,:,0].min()<0 or xy[:,:,1].min()<0 or xy[:,:,0].max()>=w or xy[:,:,1].max()>=h:
        return {**failure,'reason':'Crop memotong jarum/skala; pilih seluruh dial.'}
    hits=mask[xy[:,:,1],xy[:,:,0]]>0
    scores=hits.mean(axis=1)
    for i in np.flatnonzero(scores>=.65):
        normal=np.array([-math.sin(radians[i]),math.cos(radians[i])])
        for distance in (.40,.60,.76):
            centre=pivot+radius*distance*np.array([math.cos(radians[i]),math.sin(radians[i])])
            offsets=np.arange(-int(radius*.15),int(radius*.15)+1)
            locations=np.rint(centre+offsets[:,None]*normal).astype(int)
            across=mask[locations[:,1],locations[:,0]]>0; mid=len(offsets)//2
            if not across[mid]: scores[i]=0; break
            left=right=mid
            while left>0 and across[left-1]: left-=1
            while right<len(offsets)-1 and across[right+1]: right+=1
            if right-left+1>radius*.10: scores[i]=0; break
    winner=int(scores.argmax()); angle=float(angles[winner])
    if scores[winner]<.65:
        return {**failure,'reason':'Jarum hitam panjang tidak terlihat utuh; jangan menebak bagian yang tertutup.'}
    distance=np.abs((angles-angle+180)%360-180)
    if np.any((distance>3)&(scores>=max(.65,scores[winner]*.85))):
        return {**failure,'reason':'Ada beberapa garis hitam menyerupai jarum; periksa atau foto ulang.'}
    near=(distance<2)&(scores>=scores[winner]*.95)
    angle=math.degrees(math.atan2(float(np.sum(np.sin(radians[near])*scores[near])),float(np.sum(np.cos(radians[near])*scores[near]))))%360
    # Independent line fit must corroborate direction; agreement is not a probability.
    inner=np.zeros((h,w),np.uint8); cv2.circle(inner,tuple(np.rint(pivot).astype(int)),int(radius*.92),255,-1)
    lines=cv2.HoughLinesP(mask & inner,1,np.pi/720,threshold=30,minLineLength=radius*.40,maxLineGap=radius*.04)
    evidence=[]
    for line in ([] if lines is None else lines[:,0]):
        a,b=np.asarray(line[:2],float),np.asarray(line[2:],float)
        delta=b-a; length=float(np.linalg.norm(delta))
        line_distance=abs(float(delta[0]*(pivot[1]-a[1])-delta[1]*(pivot[0]-a[0])))/length
        far=a if np.linalg.norm(a-pivot)>np.linalg.norm(b-pivot) else b
        candidate_angle=math.degrees(math.atan2(*(far-pivot)[::-1]))%360
        difference=abs((candidate_angle-angle+180)%360-180)
        if line_distance<radius*.035 and np.linalg.norm(far-pivot)>radius*.68 and difference<2.7:
            evidence.append((difference,candidate_angle,length))
    if not evidence:
        return {**failure,'reason':'Fit garis dan jejak radial jarum belum sepakat; periksa pivot/ROI.'}
    value=interpolate_angle(angle,calibration,aspect_ratio=w/h)
    if value is None:
        return {**failure,'reason':'Jarum berada di luar busur skala yang dikalibrasi.'}
    direction=np.array([math.cos(math.radians(angle)),math.sin(math.radians(angle))])
    tip=pivot+radius*.86*direction
    inverse=np.linalg.inv(transform); qh,qw=query.shape[:2]
    def mapped(p):
        result=cv2.perspectiveTransform(np.asarray([[p]],np.float32),inverse)[0,0]
        return {'x':float(result[0]/qw),'y':float(result[1]/qh)}
    overlay={'pivot':mapped(pivot),'tip':mapped(tip),
             'scale_points':[{**mapped([p['x']*w,p['y']*h]),'value':p['value']} for p in calibration['scale_points']]}
    return {**value,'method':VERSION,'registration':registration,'overlay':overlay,'uncertainty':None,
            'radial_support':round(float(scores[winner]),3),'line_angle':min(evidence)[1],
            'reason':'Jarum hitam dihitung di antara landmark kalibrasi; periksa overlay. Parallax mekanis belum terukur.'}
