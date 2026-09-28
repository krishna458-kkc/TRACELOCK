import io
import json
from typing import Dict, Any, Union
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DictionaryObject, NameObject, TextStringObject, ArrayObject, FloatObject
from app.watermark.generator import build_forensic_payload

def string_to_zero_width(s: str) -> str:
    """Encodes a string into invisible zero-width Unicode characters."""
    bits = ''.join(format(b, '08b') for b in s.encode('utf-8'))
    zw = ''.join('\u200c' if b == '1' else '\u200b' for b in bits)
    return '\u200d' + zw + '\u200d'

def embed_watermark_in_pdf(
    pdf_bytes: bytes,
    payload_json: str,
    recipient_signature: str = ""
) -> bytes:
    """
    Invisibly embeds the forensic watermark payload into a PDF document.
    Uses multi-layer steganographic embedding:
    Layer 1: Structural metadata dictionary entries (/TL_WM_FORENSIC, /TL_WM_SIG).
    Layer 2: Custom Document Catalog property (/TraceLockForensicRecord).
    Layer 3: Zero-width invisible text annotation on Page 1 (invisible bounds [0,0,0,0]).
    """
    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    
    for page in reader.pages:
        writer.add_page(page)
        
    # Copy existing metadata if available
    metadata = {}
    if reader.metadata:
        for k, v in reader.metadata.items():
            try:
                metadata[str(k)] = str(v)
            except Exception:
                pass
                
    # Layer 1: Forensic metadata tags
    metadata['/TL_WM_FORENSIC'] = payload_json
    if recipient_signature:
        metadata['/TL_WM_SIG'] = recipient_signature
    writer.add_metadata(metadata)
    
    # Layer 2: Custom Catalog property
    zw_payload = string_to_zero_width(payload_json)
    try:
        writer._root_object.update({
            NameObject("/TraceLockForensic"): TextStringObject(payload_json),
            NameObject("/TraceLockZW"): TextStringObject(zw_payload),
        })
    except Exception:
        pass
        
    # Layer 3: Invisible annotation on the first page
    if len(writer.pages) > 0:
        first_page = writer.pages[0]
        annot = DictionaryObject({
            NameObject("/Type"): NameObject("/Annot"),
            NameObject("/Subtype"): NameObject("/FreeText"),
            NameObject("/Rect"): ArrayObject([FloatObject(0), FloatObject(0), FloatObject(0), FloatObject(0)]),
            NameObject("/Contents"): TextStringObject(zw_payload),
            NameObject("/NM"): TextStringObject(f"TL_WM_{json.loads(payload_json).get('wid', 'FORENSIC')}"),
            NameObject("/F"): FloatObject(2),  # Hidden flag
        })
        if "/Annots" in first_page:
            try:
                first_page["/Annots"].append(annot)
            except Exception:
                first_page[NameObject("/Annots")] = ArrayObject([annot])
        else:
            first_page[NameObject("/Annots")] = ArrayObject([annot])
            
    out_buffer = io.BytesIO()
    writer.write(out_buffer)
    return out_buffer.getvalue()
