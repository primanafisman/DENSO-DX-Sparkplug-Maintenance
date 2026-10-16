"""Conservative CPU numeric OCR fallback for an explicitly digital display ROI."""
import re
from decimal import Decimal

import cv2
import numpy as np

from .models import Candidate

VERSION='local-text-digital-v1'
TOKEN=re.compile(r'[+-]?\d+(?:\.\d+)?')


def _number(output,profile):
    if not output.get('available'): return None
    numbers=[]
    for span in output.get('spans',[]):
        text=span['text'].strip().replace('−','-').replace(',','.')
        if text and all(c in '+-.' for c in text):
            return None  # Do not silently drop a separately detected sign/decimal.
        if TOKEN.fullmatch(text): numbers.append((text,span))
    if len(numbers)!=1: return None
    text,span=numbers[0]
    if span['ocr_score']<.97 or span['roi']['height']<.30 or span['roi']['width']<.15: return None
    if len(text.partition('.')[2])!=profile.decimals: return None
    value=Decimal(text)
    if not Decimal(str(profile.minimum))<=value<=Decimal(str(profile.maximum)): return None
    visible_units={s['text'].strip().casefold() for s in output.get('spans',[]) if s['text'].strip().casefold() in {'mm','cm','bar','mpa','kpa','pa','psi'}}
    if visible_units and visible_units!={profile.unit.strip().casefold()}: return None
    return text


def read_text_digital(data,profile,ocr,*,upright=False):
    outputs=[]; variants=[]
    read=ocr.read_upright if upright and hasattr(ocr,'read_upright') else ocr.read
    if profile.kind=='digital':
        outputs.append(read(data))
        gray=cv2.imdecode(np.frombuffer(data,dtype=np.uint8),cv2.IMREAD_GRAYSCALE)
        normalized=cv2.createCLAHE(clipLimit=2.,tileGridSize=(8,8)).apply(gray)
        ok,encoded=cv2.imencode('.png',normalized)
        if ok: outputs.append(read(encoded.tobytes()))
        variants=[{'name':name,'raw_text':_number(output,profile)} for name,output in zip(('original','clahe-gray'),outputs)]
    texts=[v['raw_text'] for v in variants]
    accepted=len(texts)==2 and all(texts) and len(set(texts))==1
    text=texts[0] if accepted else ''
    candidate=Candidate(readable=accepted,kind='digital',value=float(Decimal(text)) if accepted else None,unit=profile.unit,
                        raw_text=text,reason='OCR teks lokal sepakat pada satu angka lengkap; satuan dari profil.' if accepted else
                        'OCR teks tidak sepakat/satu angka tidak lengkap; tidak menebak digit/desimal.')
    return {'accepted':accepted,'candidate':candidate.model_dump(),'variants':variants,'unit_source':'profile',
            'method':VERSION+('-upright' if upright else ''),'probability_correct':None,'label_ocr':outputs[0] if outputs else None}
