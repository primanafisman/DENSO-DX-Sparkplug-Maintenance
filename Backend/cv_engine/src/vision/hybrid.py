"""Option 2: standalone local pipeline. Deliberately has no provider argument."""
import time
from datetime import datetime, timezone

from .hybrid_analog import read_calibrated_analog
from .hybrid_auto_analog import read_auto_analog
from .hybrid_digital import read_local_digital,_OfflineReader
from .images import assess_quality
from .models import Candidate

VERSION='hybrid-cv-v0.2.4'


class OfflineOCR(_OfflineReader):
    """Bounded operation-scoped OCR cache shared with display verification."""


def analyze_hybrid(crop,profile,calibration_record=None,text_ocr=None,label_crop=None,
                   registry=None,selected_id=None,area='',instrument_type='other'):
    start=time.monotonic(); quality=assess_quality(crop)
    if text_ocr is not None and not isinstance(text_ocr,OfflineOCR): text_ocr=OfflineOCR(text_ocr)
    assets=registry.all() if registry else []  # registry loaded before recognition
    ocr=text_ocr.read(label_crop or crop) if text_ocr else {'available':False,'text':'','spans':[]}
    label=registry.match_label(ocr.get('text',''),selected_id,area,assets=assets) if registry else {
        'raw_text':ocr.get('text',''),'candidates':[],'requires_operator_selection':True,'level':'low'}
    if label.get('level')=='high' and (not ocr.get('spans') or any(s.get('ocr_score',0)<.85 for s in ocr['spans'])):
        label.update(suggested_id=None,level='medium',requires_operator_selection=True)
    status='REVIEW_REQUIRED'; geometry=None; local=None
    candidate=Candidate(readable=False,kind=profile.kind if profile.kind!='auto' else 'unknown',reason='')
    reason=''; valid=False
    # Flat dark LCD glass can score below the general Laplacian blur threshold
    # while every digit/point is intact. For an explicitly digital ROI with
    # remaining contrast, let the local reader prove those pixels; blank images
    # still fail quality, and analog keeps its existing quality gate.
    inspect_digital=profile.kind=='digital' and quality['contrast']>=8
    if not quality['usable'] and not inspect_digital:
        status='RETAKE_REQUIRED'; reason='Foto buram/kontras rendah atau ada silau pusat; ambil ulang, jangan menebak jarum/digit.'
    else:
        if profile.kind!='analog': local=read_local_digital(crop,profile,text_ocr)
        if local and local['accepted'] and (quality['usable'] or local.get('lcd_point_verified',False)):
            candidate=Candidate.model_validate(local['candidate']); valid=True; reason=candidate.reason
            if not quality['usable']:
                reason+=' Skor ketajaman foto rendah, tetapi digit/titik lolos pemeriksaan lokal; periksa hasil sebelum konfirmasi.'
        elif not quality['usable']:
            status='RETAKE_REQUIRED'
            reason='Skor ketajaman foto rendah dan bukti digit/titik belum cukup; pilih crop LCD lengkap atau input manual.'
        elif profile.kind=='digital':
            reason='Digit/titik desimal belum lengkap atau OCR tidak sepakat. Pilih crop display lebih rapat.'
        elif profile.unit.strip().casefold()!='mpa' or profile.minimum!=0 or profile.maximum!=1:
            status='UNSUPPORTED'; reason='Baseline analog mendukung gauge 0-1 MPa dengan template per alat; jenis ini belum didukung.'
        else:
            if calibration_record:
                geometry=read_calibrated_analog(crop,calibration_record,calibration_record['_template'])
                standard_family=(len(calibration_record['scale_points'])==6 and all(abs(p['value']-i/5)<1e-6 for i,p in enumerate(calibration_record['scale_points'])))
                if geometry.get('value') is None and standard_family:
                    prior=geometry
                    dial_ocr=text_ocr.read(crop) if text_ocr and label_crop else ocr
                    geometry=read_auto_analog(crop,dial_ocr,clockwise=calibration_record['clockwise'])
                    geometry['template_attempt']={k:v for k,v in prior.items() if k in ('reason','registration','method')}
            else:
                dial_ocr=text_ocr.read(crop) if text_ocr and label_crop else ocr
                geometry=read_auto_analog(crop,dial_ocr)
            reason=geometry['reason']; value=geometry.get('value')
            if value is not None:
                candidate=Candidate(readable=True,kind='analog',value=value,unit=profile.unit,raw_text=f'{value:.3f}',reason=reason)
                valid=geometry.get('scale_direction',{}).get('confirmed',True) and not geometry.get('requires_manual',False)
                if not valid:
                    reason+=' Bukti arah skala/jarum belum lengkap; estimasi perlu pemeriksaan manual.'
            else: status='RETAKE_REQUIRED'
    if quality['glare']['critical_overlap']:
        reason+=' Ada dugaan silau; periksa bahwa overlay tetap mengikuti jarum/digit yang terlihat.'
    if label.get('conflict'):
        valid=False; status='EQUIPMENT_UNRESOLVED'; reason+=' Label bertentangan dengan alat terpilih; periksa identitas.'
    elif status=='REVIEW_REQUIRED' and not selected_id and not label.get('suggested_id'):
        status='EQUIPMENT_UNRESOLVED'
    candidate.reason=reason
    raw=candidate.value
    calibration={k:v for k,v in calibration_record.items() if not k.startswith('_')} if calibration_record else None
    return {'candidate':candidate.model_dump(),'profile':profile.model_dump(),'calibration':None,
            'processing_method':'HYBRID_CV','method':VERSION,'model':geometry['method'] if geometry else (local or {}).get('method','classical-cv-no-trained-model'),
            'calibration_profile':calibration,'geometry':geometry,'quality':quality,'label':label,'label_ocr':ocr,
            'local_ocr':local,'instrument_type':instrument_type,'unit_source':'registered-profile',
            'raw_prediction':raw,'validated_prediction':raw if valid else None,'uncertainty':None,
            'validation':{'status':status,'requires_review':True,'estimated_error_mpa':None,'confidence_calibrated':False},
            'confidence':{'valid':valid,'level':'medium' if valid else 'low','probability_correct':None,
                          'method':'local evidence heuristics; no calibrated accuracy probability',
                          'reasons':[reason,'Tiga desimal adalah interpolasi; bukan jaminan akurasi ±0.001 MPa.' if candidate.kind=='analog' else 'Digit dan desimal harus terlihat lengkap.']},
            'overlay':geometry.get('overlay',{}) if geometry else {},'error':None,
            'processed_at':datetime.now(timezone.utc).isoformat(),'processing_ms':round((time.monotonic()-start)*1000,1),
            'training':{'custom_keypoint_model':'not installed','ground_truth':False,'reference_measurement':None}}
