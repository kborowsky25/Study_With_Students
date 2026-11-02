"""Upload checks: extension allow-list, size cap and the file's real type.

The filename and Content-Type of an upload are whatever the client says, so the bytes are
checked against the extension instead, and files are always served with a type derived
from that (validated) extension — never the one the client sent.
"""
import io
import zipfile

OLE = b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'  # legacy Office (.doc, .ppt)
JPEG = b'\xff\xd8\xff'

SIGNATURES = {
    'pdf':  b'%PDF-',
    'png':  b'\x89PNG\r\n\x1a\n',
    'jpg':  JPEG,
    'jpeg': JPEG,
    'doc':  OLE,
    'ppt':  OLE,
}
# Office Open XML files are zip archives that must contain their main part.
OOXML_PARTS = {'docx': 'word/document.xml', 'pptx': 'ppt/presentation.xml'}
TEXT_TYPES  = {'txt', 'md'}


class UploadError(ValueError):
    """A rejected upload; the message is safe to show to the user."""


def read_upload(file, allowed, max_bytes):
    """Return (bytes, extension) for an acceptable upload, else raise UploadError."""
    filename = file.filename or ''
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext not in allowed:
        names = ', '.join(sorted(e.upper() for e in allowed))
        raise UploadError(f'Only these file types are accepted: {names}')

    data = file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise UploadError(f'Files are limited to {max_bytes // (1024 * 1024)} MB')
    if not data:
        raise UploadError('The file is empty')
    if not _content_matches(ext, data):
        raise UploadError(f"That file isn't a valid .{ext} file")
    return data, ext


def display_name(filename, limit=200):
    """The original filename, safe to store and offer as a download name."""
    name = (filename or '').replace('\\', '/').rsplit('/', 1)[-1]
    name = ''.join(ch for ch in name if ch.isprintable())
    return name[-limit:] or 'file'


def _content_matches(ext, data):
    if ext in SIGNATURES:
        return data.startswith(SIGNATURES[ext])
    if ext in OOXML_PARTS:
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                return OOXML_PARTS[ext] in archive.namelist()
        except zipfile.BadZipFile:
            return False
    if ext in TEXT_TYPES:
        try:
            return b'\x00' not in data and bool(data.decode('utf-8'))
        except UnicodeDecodeError:
            return False
    return False
