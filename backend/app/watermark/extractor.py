import io
import json
import re
from typing import Optional, Dict, Any, Tuple
from pypdf import PdfReader

def zero_width_to_string(zw: str) -> Optional[str]:
    """Decodes invisible zero-width Unicode characters back to a UTF-8 string."""
    if '\u200d' not in zw:
        return None
    start = zw.find('\u200d') + 1
    end = zw.rfind('\u200d')
    content = zw[start:end]
    bits = ''.join('1' if c == '\u200c' else '0' for c in content if c in ('\u200b', '\u200c'))
    if not bits or len(bits) % 8 != 0:
        return None
    bytes_arr = bytearray()
    for i in range(0, len(bits), 8):
        byte = bits[i:i+8]
        bytes_arr.append(int(byte, 2))
    try:
        return bytes_arr.decode('utf-8')
    except Exception:
        return None

def extract_watermark_from_pdf(pdf_bytes: bytes) -> Tuple[Optional[Dict[str, Any]], Optional[str], str]:
    """
    Attempts forensic extraction of the invisible watermark from a PDF across all layers.
    Returns: (payload_dict, raw_payload_json, extraction_layer_name)
    """
    raw_json: Optional[str] = None
    layer_found: str = "none"

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        
        # Layer 1: Check standard PDF metadata
        if reader.metadata:
            meta = reader.metadata
            if '/TL_WM_FORENSIC' in meta and meta['/TL_WM_FORENSIC']:
                raw_json = str(meta['/TL_WM_FORENSIC'])
                layer_found = "Layer 1: PDF Document Metadata Dictionary"
                
        # Layer 2: Check document catalog root object
        if not raw_json and hasattr(reader, 'trailer') and reader.trailer:
            try:
                root = reader.trailer.get('/Root', {})
                if '/TraceLockForensic' in root:
                    raw_json = str(root['/TraceLockForensic'])
                    layer_found = "Layer 2: PDF Document Catalog Root"
                elif '/TraceLockZW' in root:
                    decoded = zero_width_to_string(str(root['/TraceLockZW']))
                    if decoded:
                        raw_json = decoded
                        layer_found = "Layer 2: PDF Catalog Zero-Width Stream"
            except Exception:
                pass
                
        # Layer 3: Check annotations on page 1
        if not raw_json and len(reader.pages) > 0:
            try:
                page = reader.pages[0]
                if '/Annots' in page:
                    for annot_ref in page['/Annots']:
                        annot = annot_ref.get_object() if hasattr(annot_ref, 'get_object') else annot_ref
                        contents = annot.get('/Contents', '')
                        if contents:
                            decoded = zero_width_to_string(str(contents))
                            if decoded and ('wid' in decoded or 'WM-' in decoded):
                                raw_json = decoded
                                layer_found = "Layer 3: Steganographic Zero-Width Annotation Stream"
                                break
            except Exception:
                pass

    except Exception:
        pass

    # Layer 4 (Fallback): Direct raw binary scan for zero-width sequence or JSON tags
    if not raw_json:
        try:
            text = pdf_bytes.decode('utf-8', errors='ignore')
            # Look for /TL_WM_FORENSIC (JSON)
            match = re.search(r'/TL_WM_FORENSIC\s*\(([^\)]+)\)', text)
            if match:
                raw_json = match.group(1).replace(r'\(', '(').replace(r'\)', ')')
                layer_found = "Layer 4: Direct Raw Byte Pattern Scan"
            else:
                # Look for zero-width delimiters
                zw_match = re.search(r'[\u200d][\u200b\u200c]{32,}[\u200d]', text)
                if zw_match:
                    decoded = zero_width_to_string(zw_match.group(0))
                    if decoded:
                        raw_json = decoded
                        layer_found = "Layer 4: Direct Raw Zero-Width Stream Recovery"
        except Exception:
            pass

    if raw_json:
        try:
            payload_dict = json.loads(raw_json)
            return payload_dict, raw_json, layer_found
        except Exception:
            # If payload is wrapped in string quotes or escaped
            try:
                cleaned = raw_json.strip()
                if cleaned.startswith('"') and cleaned.endswith('"'):
                    cleaned = json.loads(cleaned)
                payload_dict = json.loads(cleaned)
                return payload_dict, cleaned, layer_found
            except Exception:
                pass

    return None, None, "Extraction Failed: No forensic markers found"
