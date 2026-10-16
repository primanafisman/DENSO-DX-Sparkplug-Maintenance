import hashlib
import io
import math
import warnings
from dataclasses import dataclass,field

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from .models import ROI

MAX_UPLOAD = 15 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000


@dataclass(frozen=True)
class PreparedImage:
    jpeg: bytes
    width: int
    height: int
    source_hash: str
    original: bytes = b''
    source_width: int = 0
    source_height: int = 0
    _decoded: object = field(default=None,repr=False,compare=False)

    @property
    def memory_bytes(self):
        return len(self.jpeg) + len(self.original)


def encode_jpeg(image: Image.Image) -> bytes:
    stream = io.BytesIO()
    image.save(stream, 'JPEG', quality=94)
    return stream.getvalue()


def prepare_image(data: bytes) -> PreparedImage:
    if not data or len(data) > MAX_UPLOAD:
        raise ValueError('Unggah JPEG/PNG/WebP maksimal 15 MB.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as source:
                if source.format not in ('JPEG', 'MPO', 'PNG', 'WEBP'):
                    raise ValueError('Gunakan JPEG, PNG atau WebP; konversi HEIC terlebih dahulu.')
                # Canon camera JPGs may contain a smaller secondary MPO frame.
                # Frame zero is the primary exposure; keep its EXIF orientation.
                source.seek(0)
                image = ImageOps.exif_transpose(source).convert('RGB')
                source_width, source_height = image.size
                image.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
                if min(image.size) < 32:
                    raise ValueError('Resolusi gambar terlalu kecil.')
                return PreparedImage(encode_jpeg(image), *image.size, hashlib.sha256(data).hexdigest(), data, source_width, source_height)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ValueError('Gambar rusak atau resolusinya melebihi 20 megapiksel. Perkecil sebelum unggah.') from exc


def crop_image(prepared: PreparedImage, roi: ROI) -> bytes:
    width, height = prepared.source_width or prepared.width, prepared.source_height or prepared.height
    bounds = (math.floor(roi.x * width), math.floor(roi.y * height), min(width, math.ceil((roi.x + roi.width) * width)), min(height, math.ceil((roi.y + roi.height) * height)))
    if min(bounds[2] - bounds[0], bounds[3] - bounds[1]) < 32:
        raise ValueError('ROI terlalu kecil; pilih area minimal 32 × 32 piksel.')
    if prepared._decoded is not None:
        return encode_jpeg(prepared._decoded.crop(bounds))
    with Image.open(io.BytesIO(prepared.original or prepared.jpeg)) as source:
        image = ImageOps.exif_transpose(source).convert('RGB')
        return encode_jpeg(image.crop(bounds))


def gray_image(data: bytes):
    return cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)




def assess_quality(data: bytes) -> dict:
    gray = gray_image(data)
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    contrast = float(gray.std())
    brightness = float(gray.mean())
    # Bright isolated flat patches are only a conservative glare suspicion.
    # Boundary-connected white backgrounds and coloured LED segments are excluded.
    colour = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    hsv = cv2.cvtColor(colour, cv2.COLOR_BGR2HSV)
    white = ((hsv[:, :, 2] > 247) & (hsv[:, :, 1] < 25)).astype(np.uint8)
    count, labels, stats, centroids = cv2.connectedComponentsWithStats(white)
    height, width = gray.shape
    regions = []
    critical_overlap = False
    for x, y, w, h, area in stats[1:]:
        fraction = float(area) / gray.size
        if .03 < fraction < .3 and x > 0 and y > 0 and x + w < width and y + h < height:
            overlap = x < width * .7 and x + w > width * .3 and y < height * .7 and y + h > height * .3
            critical_overlap |= overlap
            regions.append({'x': round(float(x/width), 4), 'y': round(float(y/height), 4), 'width': round(float(w/width), 4), 'height': round(float(h/height), 4), 'area_fraction': round(fraction, 4)})
    warnings_list = []
    if min(gray.shape) < 160:
        warnings_list.append('ROI beresolusi rendah; dekatkan kamera atau gunakan foto lebih besar.')
    if sharpness < 50:
        warnings_list.append('Foto mungkin buram; tahan kamera stabil dan fokus pada indikator.')
    if contrast < 15:
        warnings_list.append('Kontras rendah atau area kosong; periksa ROI dan pencahayaan.')
    if brightness < 35 or (brightness > 235 and contrast < 25):
        warnings_list.append('Pencahayaan terlalu gelap/terang; periksa pantulan kaca dan silau.')
    if critical_overlap:
        warnings_list.append('Ada bidang putih terang di pusat ROI; periksa silau pada digit/jarum dan ambil ulang bila tertutup.')
    return {'usable': sharpness >= 15 and contrast >= 8, 'sharpness': round(sharpness, 2), 'contrast': round(contrast, 2), 'brightness': round(brightness, 2), 'width': width, 'height': height, 'warnings': warnings_list, 'glare': {'suspected': bool(regions), 'critical_overlap': bool(critical_overlap), 'regions': regions, 'method': 'bright isolated low-saturation patches; suspicion, not proof of missing information'}, 'probability_correct': None, 'method': 'OpenCV heuristics; blur, silau dan perspektif harus diperiksa pada crop'}
