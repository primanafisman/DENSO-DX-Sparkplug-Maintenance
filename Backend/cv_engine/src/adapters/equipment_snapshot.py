import re
from difflib import SequenceMatcher
from copy import deepcopy

def normalized(value):
    return re.sub(r'[^A-Z0-9]+',' ',value.upper()).strip()

class EquipmentSnapshot:
    def __init__(self,assets):
        self.assets=deepcopy(assets)
        for asset in self.assets:
            for key,default in [('area',''),('code',''),('aliases',[])]:asset.setdefault(key,default)
    def all(self):return self.assets
    def get(self,key):return next((a for a in self.assets if a['id']==key),None)
    def match_label(self,text,selected_id=None,area='',assets=None):
        raw=text[:2000]
        lines=[normalized(line) for line in raw.splitlines() if normalized(line)]
        candidates=[]
        for asset in (self.all() if assets is None else assets):
            same_area=not area or not asset['area'] or asset['area']==area
            best=0.; evidence=''
            options=[('code',asset['code']),('name',asset['name']),*[('alias',s) for s in asset['aliases']]]
            for kind,option in options:
                reference=normalized(option)
                if not reference:
                    continue
                for line in lines:
                    # The production line is capture context, not equipment identity.
                    # Only complete named identities may cross that boundary; partial
                    # suggestions and legacy codes remain scoped to the registered line.
                    named_exact=(kind!='code' and any(c.isalpha() for c in reference)
                                 and line.replace(' ','')==reference.replace(' ',''))
                    if not same_area and not named_exact:
                        continue
                    if line==reference or named_exact:
                        score=1. if kind=='code' else .98
                    elif len(line)>=3 and (reference.startswith(line) or line.startswith(reference)):
                        # A prefix can rank a suggestion, never prove the missing characters.
                        score=.8 if len(line)>=6 else .65
                    elif min(len(line),len(reference))>=8:
                        ratio=SequenceMatcher(None,line,reference).ratio()
                        score=ratio*.85 if ratio>=.78 else 0
                    else:
                        score=0
                    if score>best:
                        best,evidence=score,kind
            if best>=.6:
                candidates.append({'instrument_id':asset['id'],'name':asset['name'],'code':asset['code'],
                                   'match_score':round(best,4),'evidence':evidence})
        candidates.sort(key=lambda c:c['match_score'],reverse=True)
        candidates=candidates[:10]
        unique=bool(candidates) and (len(candidates)==1 or candidates[0]['match_score']-candidates[1]['match_score']>=.15)
        best=candidates[0] if candidates else None
        conflict=bool(best and selected_id and best['instrument_id']!=selected_id)
        high=bool(unique and best['match_score']>=.98 and not conflict)
        return {'raw_text':raw,'selected_id':selected_id,'suggested_id':best['instrument_id'] if high else None,
                'suggested_name':best['name'] if unique else None,'candidates':candidates,'conflict':conflict,
                'level':'high' if high else ('medium' if unique and not conflict else 'low'),
                'requires_operator_selection':not high,'probability_correct':None,
                'method':'registered asset text matching; match score is not probability',
                'reason':'Label berbeda dari alat yang dipilih; pilih identitas secara manual.' if conflict else
                         ('Label cocok dengan daftar alat; periksa nama sebelum konfirmasi.' if high else
                          'Label parsial/ambigu/tidak terbaca; pilih kandidat atau input nama manual.')}
