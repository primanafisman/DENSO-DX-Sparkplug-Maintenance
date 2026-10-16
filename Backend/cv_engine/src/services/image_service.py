import threading,time,uuid
import io
from dataclasses import replace
from PIL import Image,ImageOps
from fastapi import HTTPException
from ..vision.images import prepare_image,crop_image

class ImageService:
    def __init__(self,settings):self.settings=settings;self.images={};self.lock=threading.RLock()
    def expire(self):
        now=time.time()
        for key,(_,expiry) in list(self.images.items()):
            if expiry<now:self.images.pop(key,None)
    def put(self,data):
        prepared=prepare_image(data)
        with self.lock:
            self.expire()
            if sum(p.memory_bytes for p,_ in self.images.values())+prepared.memory_bytes>self.settings.max_image_bytes:raise HTTPException(429,'Temporary image capacity reached.')
            key=str(uuid.uuid4());expiry=time.time()+self.settings.ttl_seconds;self.images[key]=(prepared,expiry)
        return {'image_id':key,'source_hash':prepared.source_hash,'source_width':prepared.source_width,'source_height':prepared.source_height,'preview_width':prepared.width,'preview_height':prepared.height,'expires_at':expiry}
    def get(self,key):
        with self.lock:
            self.expire();found=self.images.get(key)
            if found is None:raise HTTPException(410,'Photo expired or worker restarted; upload again.')
            return found[0]
    def crop(self,key,roi):return crop_image(self.get(key),roi)
    def close(self):
        with self.lock:self.images.clear()

class DecodedSource:
    """One operation owns one oriented source decode; sessions retain compressed bytes."""
    def __init__(self,prepared):self.source=prepared;self.image=None;self.prepared=None
    def __enter__(self):
        with Image.open(io.BytesIO(self.source.original or self.source.jpeg)) as source:self.image=ImageOps.exif_transpose(source).convert('RGB')
        self.prepared=replace(self.source,_decoded=self.image)
        return self
    def crop(self,roi):return crop_image(self.prepared,roi)
    def __exit__(self,*args):
        if self.image:self.image.close()
        self.image=None;self.prepared=None
